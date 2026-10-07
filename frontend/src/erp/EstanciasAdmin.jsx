import { useState } from 'react';
import { api } from '../api';
import { useResource } from '../useResource';
import { useBooking } from '../context';
import { AsyncForm, Modal, ActionButton } from '../components';
import { DataTable, ResourceState, Status, dateLabel } from './Shared';
import { money } from '../utils';
function CalendarForm({ record = {}, onClose }) {
  const hotels = useResource('admin/accommodations');
  const { refresh, notify } = useBooking();
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return (
    <Modal onClose={onClose}>
      <h2 className="modal-title">Tarifa y cupo por fecha</h2>
      <p className="muted">
        Aplica un precio especial, limita cupo o cierra fechas. Dejar precio o cupo vacío restaura
        el valor base. Máximo 93 días por operación.
      </p>
      <AsyncForm
        id="calendar-form"
        onSubmit={async (form) => {
          const values = Object.fromEntries(new FormData(form));
          await api('admin/erp/tarifas', {
            ...values,
            alojamiento_id: Number(values.alojamiento_id),
            precio: values.precio ? Number(values.precio) : null,
            cupo: values.cupo ? Number(values.cupo) : null,
            cerrado: new FormData(form).has('cerrado'),
          });
          onClose();
          refresh();
          notify('Calendario actualizado');
        }}
      >
        <div className="form-grid">
          <label className="wide">
            Alojamiento
            <select
              className="form-select"
              name="alojamiento_id"
              defaultValue={record.alojamiento_id}
              required
            >
              {(hotels.data?.data || []).map((h) => (
                <option key={h.id} value={h.id}>
                  {h.nombre} · {h.destino}
                </option>
              ))}
            </select>
          </label>
          <label>
            Desde
            <input
              className="form-control"
              type="date"
              name="desde"
              min={today}
              defaultValue={record.fecha || today}
              required
            />
          </label>
          <label>
            Hasta
            <input
              className="form-control"
              type="date"
              name="hasta"
              min={today}
              defaultValue={record.fecha || today}
              required
            />
          </label>
          <label>
            Precio por noche (USD)
            <input
              className="form-control"
              name="precio"
              type="number"
              min="0.01"
              max="100000"
              step="0.01"
              defaultValue={record.precio ?? ''}
            />
          </label>
          <label>
            Cupo de habitaciones
            <input
              className="form-control"
              name="cupo"
              type="number"
              min="0"
              max="100"
              defaultValue={record.cupo ?? ''}
            />
          </label>
          <label className="wide">
            Nota
            <input
              className="form-control"
              name="nota"
              maxLength="300"
              defaultValue={record.nota || ''}
            />
          </label>
          <label>
            <input
              type="checkbox"
              className="form-check-input"
              name="cerrado"
              defaultChecked={record.cerrado}
            />{' '}
            Cerrar disponibilidad
          </label>
        </div>
        <button className="button primary" disabled={hotels.loading || !!hotels.error}>
          Guardar calendario
        </button>
        {hotels.error && (
          <p className="error" role="alert">
            {hotels.error}
          </p>
        )}
      </AsyncForm>
    </Modal>
  );
}
export default function EstanciasAdmin({ tab }) {
  const resource = useResource('admin/erp/' + tab);
  const { open, refresh } = useBooking();
  const [edit, setEdit] = useState(null);
  const rows = resource.data || [];
  const title = {
    tarifas: 'Calendario y tarifas',
    facturas: 'Facturas simuladas',
    resenas: 'Reseñas de estancias',
  }[tab];
  const columns =
    tab === 'tarifas'
      ? [
          { key: 'alojamiento', label: 'Alojamiento' },
          { key: 'fecha', label: 'Fecha', render: (r) => dateLabel(r.fecha) },
          {
            key: 'precio',
            label: 'Precio / noche',
            render: (r) => (r.precio === null ? 'Tarifa base' : money(r.precio)),
          },
          { key: 'cupo', label: 'Cupo', render: (r) => r.cupo ?? 'Inventario base' },
          {
            key: 'cerrado',
            label: 'Disponibilidad',
            render: (r) => <Status value={r.cerrado ? 'Cerrado' : 'Abierto'} />,
          },
          { key: 'nota', label: 'Nota' },
        ]
      : tab === 'facturas'
        ? [
            { key: 'numero', label: 'Número' },
            { key: 'localizador', label: 'Reserva' },
            { key: 'nombre_cliente', label: 'Cliente' },
            { key: 'total', label: 'Total', render: (r) => money(r.total) },
            { key: 'version', label: 'Versión' },
            {
              key: 'estado',
              label: 'Estado',
              render: (r) => <Status value={r.estado === 'ANULADA' ? 'Anulada' : 'Emitida'} />,
            },
          ]
        : [
            { key: 'alojamiento', label: 'Alojamiento' },
            { key: 'autor', label: 'Viajero' },
            { key: 'puntuacion', label: 'Puntuación', render: (r) => r.puntuacion + ' / 10' },
            { key: 'comentario', label: 'Comentario' },
            { key: 'respuesta', label: 'Respuesta' },
            { key: 'fecha_creacion', label: 'Fecha', render: (r) => dateLabel(r.fecha_creacion) },
          ];
  return (
    <>
      <div className="erp-section-heading">
        <div>
          <h2>{title}</h2>
          <p className="muted">
            {tab === 'tarifas'
              ? 'Excepciones por día que se aplican al precio y cupo de las búsquedas.'
              : tab === 'facturas'
                ? 'Documentos académicos, sin autorización tributaria ni cobros reales.'
                : 'Opiniones de viajeros que finalizaron su estancia; una por reserva.'}
          </p>
        </div>
        {tab === 'tarifas' && (
          <button className="button primary" onClick={() => setEdit({})}>
            + Configurar período
          </button>
        )}
      </div>
      <ResourceState resource={resource}>
        <DataTable
          rows={rows}
          columns={columns}
          searchPlaceholder={'Buscar en ' + title.toLowerCase()}
          renderActions={(r) =>
            tab === 'facturas' ? (
              <button onClick={() => open({ kind: 'invoice', order: { order_id: r.reserva_id } })}>
                Ver / descargar
              </button>
            ) : tab === 'resenas' ? (
              <button onClick={() => open({ kind: 'reply', record: r })}>
                {r.respuesta ? 'Editar respuesta' : 'Responder'}
              </button>
            ) : (
              <>
                <button onClick={() => setEdit(r)}>Editar día</button>
                <ActionButton
                  className=""
                  onClick={async () => {
                    await api('admin/erp/tarifas/' + r.id, undefined, 'DELETE');
                    refresh();
                  }}
                >
                  Restaurar base
                </ActionButton>
              </>
            )
          }
        />
      </ResourceState>
      {edit && <CalendarForm record={edit} onClose={() => setEdit(null)} />}
    </>
  );
}
