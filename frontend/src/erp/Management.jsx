import { useState } from 'react';
import { api } from '../api';
import { useBooking } from '../context';
import { useResource } from '../useResource';
import { money } from '../utils';
import { ActionButton, Modal } from '../components';
import { OrderActions } from '../Orders';
import RecordForm from './RecordForm';
import { DataTable, ResourceState, Status, dateLabel, labels } from './Shared';
const titles = {
  properties: 'Alojamientos',
  bookings: 'Reservas',
  gastos: 'Gastos',
  usuarios: 'Usuarios',
  ciudades: 'Destinos',
  categorias: 'Categorías de gasto',
  audit: 'Actividad',
};
export default function Management({ tab }) {
  const { open, refresh, user } = useBooking();
  const [edit, setEdit] = useState(null);
  const [remove, setRemove] = useState(null);
  const endpoint =
    tab === 'properties'
      ? 'admin/accommodations'
      : tab === 'bookings'
        ? 'admin/orders'
        : tab === 'audit'
          ? 'admin/audit'
          : 'admin/erp/' + tab;
  const resource = useResource(endpoint);
  const rows = Array.isArray(resource.data) ? resource.data : resource.data?.data || [];
  const columns =
    tab === 'properties'
      ? [
          {
            key: 'nombre',
            label: 'Alojamiento',
            render: (h) => (
              <>
                <img className="thumb" src={h.image} alt="" loading="lazy" />
                {h.nombre}
              </>
            ),
          },
          { key: 'destino', label: 'Destino' },
          {
            key: 'precioPorNoche',
            label: 'Tarifa / noche',
            render: (h) => money(h.precioPorNoche),
          },
          { key: 'habitaciones', label: 'Habitaciones' },
          {
            key: 'published',
            label: 'Estado',
            render: (h) => <Status value={h.published ? 'Publicado' : 'Borrador'} />,
          },
        ]
      : tab === 'bookings'
        ? [
            { key: 'locator', label: 'Localizador' },
            { key: 'cliente', label: 'Cliente', render: (o) => o.customer_details.email },
            {
              key: 'fechas',
              label: 'Estancia',
              render: (o) => dateLabel(o.checkin) + ' → ' + dateLabel(o.checkout),
            },
            { key: 'total_price', label: 'Total', render: (o) => money(o.total_price) },
            { key: 'status', label: 'Estado', render: (o) => <Status value={o.status} /> },
          ]
        : tab === 'usuarios'
          ? [
              { key: 'nombre', label: 'Nombre' },
              { key: 'correo', label: 'Correo' },
              { key: 'rol', label: 'Rol', render: (u) => labels[u.rol] },
              {
                key: 'activo',
                label: 'Estado',
                render: (u) => <Status value={u.activo ? 'Activo' : 'Inactivo'} />,
              },
              { key: 'reservas', label: 'Reservas' },
              { key: 'sesiones_activas', label: 'Sesiones activas' },
            ]
          : tab === 'gastos'
            ? [
                { key: 'concepto', label: 'Concepto' },
                { key: 'proveedor', label: 'Proveedor' },
                { key: 'categoria', label: 'Categoría' },
                { key: 'alojamiento', label: 'Alojamiento' },
                { key: 'importe', label: 'Importe', render: (g) => money(g.importe) },
                { key: 'fecha', label: 'Fecha', render: (g) => dateLabel(g.fecha) },
                { key: 'estado', label: 'Estado', render: (g) => <Status value={g.estado} /> },
              ]
            : tab === 'ciudades'
              ? [
                  { key: 'codigo', label: 'Código INEC' },
                  { key: 'name', label: 'Cantón' },
                  { key: 'provincia', label: 'Provincia' },
                  { key: 'region', label: 'Región' },
                  { key: 'latitud', label: 'Latitud' },
                  { key: 'longitud', label: 'Longitud' },
                ]
              : tab === 'categorias'
                ? [{ key: 'nombre', label: 'Categoría' }]
                : [
                    {
                      key: 'action',
                      label: 'Acción',
                      render: (a) => labels[a.action] || 'Actividad registrada',
                    },
                    { key: 'resourceId', label: 'Referencia' },
                    { key: 'timestamp', label: 'Fecha', render: (a) => dateLabel(a.timestamp) },
                  ];
  const actions =
    tab === 'audit'
      ? undefined
      : tab === 'bookings'
        ? (o) => <OrderActions order={o} />
        : tab === 'properties'
          ? (h) => (
              <>
                <button data-edit={h.id} onClick={() => open({ kind: 'hotel-form', hotel: h })}>
                  Editar
                </button>
                <ActionButton
                  className=""
                  onClick={async () => {
                    await api('admin/accommodations/' + h.id, { published: !h.published }, 'PATCH');
                    refresh();
                  }}
                >
                  {h.published ? 'Despublicar' : 'Publicar'}
                </ActionButton>
                <button data-delete={h.id} onClick={() => open({ kind: 'delete', hotel: h })}>
                  Eliminar
                </button>
              </>
            )
          : (r) => (
              <>
                <button onClick={() => setEdit(r)}>Editar</button>
                {tab === 'usuarios' ? (
                  <ActionButton
                    className=""
                    disabled={r.id === user.id}
                    onClick={async () => {
                      await api(endpoint + '/' + r.id, { activo: !r.activo }, 'PATCH');
                      refresh();
                    }}
                  >
                    {r.activo ? 'Desactivar' : 'Activar'}
                  </ActionButton>
                ) : (
                  <button onClick={() => setRemove(r)}>Eliminar</button>
                )}
              </>
            );
  return (
    <>
      <div className="erp-section-heading">
        <div>
          <h2>{titles[tab]}</h2>
          <p className="muted">
            {tab === 'usuarios'
              ? 'Administra accesos, roles y sesiones conservando el historial.'
              : tab === 'gastos'
                ? 'Registra pagos y compromisos; el dashboard actualiza los totales.'
                : tab === 'ciudades'
                  ? 'Destinos cantonales y coordenadas de referencia.'
                  : tab === 'bookings'
                    ? 'Gestiona las estancias de los viajeros.'
                    : tab === 'audit'
                      ? 'Trazabilidad de operaciones administrativas.'
                      : 'Consulta, busca y administra tus registros.'}
          </p>
        </div>
        {!['bookings', 'audit'].includes(tab) && (
          <button
            id={tab === 'properties' ? 'new-hotel' : undefined}
            className="button primary"
            onClick={() => (tab === 'properties' ? open({ kind: 'hotel-form' }) : setEdit({}))}
          >
            +{' '}
            {tab === 'properties'
              ? 'Publicar alojamiento'
              : tab === 'usuarios'
                ? 'Crear usuario'
                : tab === 'gastos'
                  ? 'Registrar gasto'
                  : tab === 'ciudades'
                    ? 'Crear destino'
                    : 'Crear categoría'}
          </button>
        )}
      </div>
      <ResourceState resource={resource}>
        <DataTable
          rows={tab === 'audit' ? [...rows].reverse() : rows}
          columns={columns}
          renderActions={actions}
          searchPlaceholder={'Buscar en ' + titles[tab].toLowerCase()}
        />
      </ResourceState>
      {edit && <RecordForm resource={tab} record={edit} onClose={() => setEdit(null)} />}{' '}
      {remove && (
        <Modal onClose={() => setRemove(null)}>
          <h2 className="modal-title">Eliminar registro</h2>
          <p>
            ¿Eliminar {remove.concepto || remove.nombre || remove.name}? Los destinos y categorías
            con registros asociados no se pueden eliminar.
          </p>
          <ActionButton
            className="button danger"
            onClick={async () => {
              await api(endpoint + '/' + remove.id, undefined, 'DELETE');
              setRemove(null);
              refresh();
            }}
          >
            Confirmar eliminación
          </ActionButton>
        </Modal>
      )}
    </>
  );
}
