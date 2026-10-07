import { api } from './api';
import { useBooking } from './context';
import { useResource } from './useResource';
import { AsyncForm } from './components';
import { money } from './utils';
export const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
export function invoiceHtml(invoice) {
  const e = escapeHtml;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(invoice.numero)}</title><style>body{font:16px system-ui;color:#214d42;max-width:850px;margin:40px auto;padding:24px}table{width:100%;border-collapse:collapse}td,th{padding:12px;text-align:left;border-bottom:1px solid #ddd}small{color:#667}h1{font-family:Georgia}strong{font-size:20px}</style></head><body><h1>Kawsay Estancias</h1><h2>Factura de demostración</h2><p>${e(invoice.numero)} · ${e(invoice.estado)} · versión ${e(invoice.version)}</p><p>${e(invoice.cliente.first_name)} ${e(invoice.cliente.last_name)}<br>${e(invoice.cliente.email)}<br>Documento: ${e(invoice.cliente.documento || 'No indicado')}<br>${e(invoice.cliente.direccion)}</p><p>Reserva ${e(invoice.reserva.localizador)} · ${e(invoice.reserva.entrada)} → ${e(invoice.reserva.salida)}</p><table><thead><tr><th>Detalle</th><th>Cantidad</th><th>Precio unitario</th><th>Importe</th></tr></thead><tbody>${invoice.detalles.map((d) => `<tr><td>${e(d.descripcion)}</td><td>${e(d.cantidad)}</td><td>${e(money(d.precio_unitario))}</td><td>${e(money(d.subtotal))}</td></tr>`).join('')}</tbody></table><p>Subtotal: ${e(money(invoice.subtotal))} · Impuestos de demostración: ${e(money(invoice.impuestos))}</p><strong>Total: ${e(money(invoice.total))}</strong><p><small>${e(invoice.aviso)}</small></p></body></html>`;
}
export function Invoice({ order }) {
  const resource = useResource('orders/' + order.order_id + '/invoice');
  const data = resource.data;
  if (resource.loading) return <p role="status">Consultando factura…</p>;
  if (resource.error)
    return (
      <p className="error" role="alert">
        {resource.error}
      </p>
    );
  return (
    <article className="invoice-sheet">
      <p className="eyebrow dark">KAWSAY ESTANCIAS</p>
      <h2 className="modal-title">Factura de demostración</h2>
      <p>
        {data.numero} · {data.estado === 'ANULADA' ? 'Anulada' : 'Emitida'} · versión {data.version}
      </p>
      <p>
        <strong>
          {data.cliente.first_name} {data.cliente.last_name}
        </strong>
        <br />
        {data.cliente.email}
        <br />
        Documento: {data.cliente.documento || 'No indicado'}
        <br />
        {data.cliente.direccion}
      </p>
      <p>
        Reserva {data.reserva.localizador} · {data.reserva.entrada} → {data.reserva.salida}
      </p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Cant.</th>
              <th>Unitario</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.detalles.map((row) => (
              <tr key={row.id}>
                <td>{row.descripcion}</td>
                <td>{row.cantidad}</td>
                <td>{money(row.precio_unitario)}</td>
                <td>{money(row.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>Total: {money(data.total)}</h3>
      <p className="muted">Impuestos: {money(data.impuestos)}</p>
      <p className="notice">{data.aviso}</p>
      <div className="form-actions invoice-actions">
        <button
          className="button primary"
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([invoiceHtml(data)], { type: 'text/html;charset=utf-8' }),
            );
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = data.numero + '.html';
            anchor.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          Descargar factura
        </button>
        <button className="button outline" onClick={() => window.print()}>
          Imprimir / guardar PDF
        </button>
      </div>
    </article>
  );
}
export function ReviewForm({ order, record }) {
  const { close, refresh, notify } = useBooking();
  return (
    <>
      <h2 className="modal-title">{record ? 'Responder reseña' : 'Cuéntanos tu experiencia'}</h2>
      <p className="muted">
        {record
          ? record.comentario
          : 'Tu nombre, puntuación y comentario se mostrarán públicamente. Solo puedes reseñar una vez una estancia completada.'}
      </p>
      <AsyncForm
        id="review-form"
        onSubmit={async (form) => {
          const values = Object.fromEntries(new FormData(form));
          if (record) await api('admin/erp/resenas/' + record.id, values, 'PATCH');
          else
            await api('orders/' + order.order_id + '/review', {
              ...values,
              puntuacion: Number(values.puntuacion),
            });
          close();
          refresh();
          notify(record ? 'Respuesta publicada' : 'Reseña publicada');
        }}
      >
        {!record && (
          <label>
            Puntuación
            <select className="form-select" name="puntuacion" defaultValue="10">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => (
                <option key={score} value={score}>
                  {score} / 10
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="mt-3">
          {record ? 'Respuesta' : 'Comentario'}
          <textarea
            className="form-control"
            name={record ? 'respuesta' : 'comentario'}
            required
            minLength={record ? 3 : 10}
            maxLength="1500"
            defaultValue={record?.respuesta || ''}
          />
        </label>
        <button className="button primary mt-3">
          {record ? 'Publicar respuesta' : 'Publicar reseña'}
        </button>
      </AsyncForm>
    </>
  );
}
