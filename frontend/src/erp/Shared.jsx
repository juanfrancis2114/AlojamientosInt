import { useMemo, useState } from 'react';
import { useBooking } from '../context';
export const labels = {
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  PENDING: 'Pendiente',
  PENDIENTE: 'Pendiente',
  PAGADO: 'Pagado',
  admin: 'Administrador',
  customer: 'Viajero',
  ACCOMMODATION_CREATED: 'Alojamiento creado',
  ACCOMMODATION_UPDATED: 'Alojamiento actualizado',
  GALLERY_UPDATED:'Galería actualizada',
  ACCOMMODATION_DELETED: 'Alojamiento eliminado',
  ORDER_CONFIRMED: 'Reserva confirmada',
  ORDER_CANCELLED: 'Reserva cancelada',
  ORDER_MODIFIED: 'Reserva modificada',
  USUARIO_CREADO: 'Usuario creado',
  USUARIO_ACTUALIZADO: 'Usuario actualizado',
  GASTO_CREADO: 'Gasto registrado',
  GASTO_ACTUALIZADO: 'Gasto actualizado',
  GASTO_ELIMINADO: 'Gasto eliminado',
  CATEGORIA_GUARDADA: 'Categoría guardada',
  CATEGORIA_ELIMINADA: 'Categoría eliminada',
  DESTINO_GUARDADO: 'Destino actualizado',
  DESTINO_ELIMINADO: 'Destino eliminado',
};
export const dateLabel = (value) =>
  new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: value.length > 10 ? 'short' : undefined,
    timeZone: 'America/Guayaquil',
  }).format(new Date(value.length === 10 ? value + 'T12:00:00Z' : value));
export function Status({ value }) {
  return (
    <span
      className={
        'erp-badge ' +
        (['CONFIRMED', 'PAGADO', 'Activo'].includes(value)
          ? 'good'
          : ['CANCELLED', 'Inactivo'].includes(value)
            ? 'bad'
            : 'neutral')
      }
    >
      {labels[value] || value}
    </span>
  );
}
export function ResourceState({ resource, children }) {
  const { refresh } = useBooking();
  if (resource.error)
    return (
      <div className="alert alert-danger" role="alert">
        {resource.error}
        <button className="button outline ms-3" onClick={refresh}>
          Reintentar
        </button>
      </div>
    );
  if (resource.loading)
    return (
      <div className="loading" role="status">
        Cargando información…
      </div>
    );
  return children;
}
export function DataTable({
  rows,
  columns,
  searchPlaceholder = 'Buscar…',
  renderActions,
  extraFilter,
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        Object.values(row).some((value) =>
          String(value ?? '')
            .toLocaleLowerCase('es')
            .includes(query.toLocaleLowerCase('es')),
        ),
      ),
    [rows, query],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const current = Math.min(page, pages);
  return (
    <>
      <div className="erp-table-tools">
        <input
          className="form-control"
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
        {extraFilter}
        <span className="muted">{filtered.length} registros</span>
      </div>
      <div className="table-wrap">
        <table className="table table-hover mb-0">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
              {renderActions && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.slice((current - 1) * 20, current * 20).map((row) => (
              <tr key={row.id || row.order_id}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
                ))}
                {renderActions && <td className="erp-actions">{renderActions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <div className="empty">No hay registros que coincidan.</div>}
      </div>
      <div className="erp-pagination">
        <button
          className="btn btn-sm btn-outline-secondary"
          disabled={current <= 1}
          onClick={() => setPage(current - 1)}
        >
          Anterior
        </button>
        <span>
          Página {current} de {pages}
        </span>
        <button
          className="btn btn-sm btn-outline-secondary"
          disabled={current >= pages}
          onClick={() => setPage(current + 1)}
        >
          Siguiente
        </button>
      </div>
    </>
  );
}
