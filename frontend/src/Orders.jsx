import { useBooking } from './context';
import { useResource } from './useResource';
import { money } from './utils';
export function OrderActions({ order }) {
  const { open } = useBooking();
  return (
    <div className="form-actions">
      <button className="button outline" onClick={() => open({ kind: 'invoice', order })}>
        Factura
      </button>
      {order._links?.modify && (
        <>
          <button className="button outline" onClick={() => open({ kind: 'modify', order })}>
            Modificar
          </button>
          <button className="button danger" onClick={() => open({ kind: 'cancel', order })}>
            Cancelar
          </button>
        </>
      )}
    </div>
  );
}
export default function Orders() {
  const { data, error, loading } = useResource('orders');
  const reviews = useResource('me/reviews');
  const catalog = useResource('catalog');
  const { refresh, open } = useBooking();
  return (
    <main id="orders-view" className="section">
      <p className="eyebrow dark">TODO LISTO PARA TU VIAJE</p>
      <h1 className="page-title">Mis reservas</h1>
      <p className="muted">Gestiona tus estancias en un solo lugar.</p>
      <div id="orders-list" className="orders-list">
        {error ? (
          <div className="alert alert-danger" role="alert">
            {error}
            <button className="button outline" onClick={refresh}>
              Reintentar
            </button>
          </div>
        ) : loading ? (
          <p role="status">Consultando tus reservas…</p>
        ) : data?.data.length ? (
          [...data.data].reverse().map((order) => (
            <article className="order-card" key={order.order_id}>
              <div>
                <span className={'status ' + (order.status === 'CANCELLED' ? 'cancelled' : '')}>
                  {{
                    CONFIRMADA: 'Confirmada',
                    COMPLETADA: 'Completada',
                    EN_CURSO: 'En curso',
                    CANCELADA: 'Cancelada',
                  }[order.estancia_estado] || 'Confirmada'}
                </span>
                <h3>
                  {catalog.data?.data.find((hotel) => hotel.id === order.accommodation_details.id)
                    ?.nombre || 'Alojamiento #' + order.accommodation_details.id}
                </h3>
                <p className="muted">
                  {order.checkin} → {order.checkout} · {order.guests.number_of_adults} adulto(s) ·{' '}
                  {order.guests.number_of_rooms} habitación(es)
                  <br />
                  Código de reserva: <strong>{order.locator}</strong>
                  <br />
                  {money(order.total_price)} · Pago simulado
                </p>
              </div>
              <div>
                <OrderActions order={order} />
                {order.puede_resenar &&
                  (reviews.data?.some((r) => r.reserva_id === order.order_id) ? (
                    <p className="muted">Ya publicaste tu reseña.</p>
                  ) : (
                    <button
                      className="button primary"
                      onClick={() => open({ kind: 'review', order })}
                    >
                      Reseñar estancia
                    </button>
                  ))}
              </div>
            </article>
          ))
        ) : (
          <div className="empty">
            Todavía no tienes reservas. Explora un destino y empieza tu próxima historia.
          </div>
        )}
      </div>
    </main>
  );
}
