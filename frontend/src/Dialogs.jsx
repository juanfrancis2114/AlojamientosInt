import { Invoice, ReviewForm } from './StayDialogs';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api';
import { useBooking } from './context';
import { ActionButton, AsyncForm, Modal } from './components';
import Login from './Login';
import { hotelPayload, money, searchInput } from './utils';
import AccommodationGallery from './AccommodationGallery';
import GalleryForm from './erp/GalleryForm';

function HotelDetails({ hotel: initialHotel }) {
  const { search, user, open } = useBooking();
  const [hotel, setHotel] = useState(initialHotel);
  const [availability, setAvailability] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api('details', { accommodations: [initialHotel.id] })
      .then((result) => {
        if (active) setHotel(result.data[0]);
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      });
    return () => {
      active = false;
    };
  }, [initialHotel.id]);
  if (!hotel)
    return (
      <p className="error" role="alert">
        Este alojamiento ya no está publicado.
      </p>
    );
  return (
    <>
      <AccommodationGallery key={hotel.id} hotel={hotel} />
      <p className="eyebrow dark mt-4">
        {hotel.destino} · {hotel.tipo}
      </p>
      <h2 className="modal-title">{hotel.nombre}</h2>
      <p className="muted">{hotel.direccion}</p>
      <p>{hotel.descripcion}</p>
      <div className="chips">
        {hotel.facilities.map((facility) => (
          <span key={facility} className="chip">
            {facility}
          </span>
        ))}
      </div>
      <div className="notice">
        Entrada: {search.checkin} · Salida: {search.checkout}
        <br />
        {search.adults} adultos · {search.rooms} habitación(es)
        <br />
        Desde {money(hotel.precioPorNoche)} / noche. El precio final se consulta antes de confirmar.
      </div>
      <ActionButton
        id="availability"
        onClick={async () => {
          const input = searchInput(search);
          delete input.city;
          setAvailability((await api('availability', { ...input, accommodation: hotel.id })).data);
        }}
      >
        Consultar disponibilidad ↗
      </ActionButton>
      <div id="availability-result">
        {availability &&
          (availability.available ? (
            <>
              <div className="notice">
                <strong>{money(availability.products[0].total_price)} total</strong> ·{' '}
                {availability.products[0].nights} noche(s)
                <br />
                {availability.products[0].cancellation} · Producto válido por 15 minutos.
              </div>
              {user?.role !== 'admin' ? (
                <ActionButton
                  id="reserve"
                  onClick={async () => {
                    if (!user)
                      return open({ kind: 'login', after: () => open({ kind: 'hotel', hotel }) });
                    const quote = (
                      await api('orders/preview', {
                        accommodation_id: hotel.id,
                        product_id: availability.products[0].id,
                        guests: searchInput(search).guests,
                      })
                    ).data;
                    open({ kind: 'checkout', hotel, quote });
                  }}
                >
                  Continuar con la reserva
                </ActionButton>
              ) : (
                <p className="notice">
                  Tu cuenta administrativa gestiona alojamientos y reservas desde el centro de
                  operaciones.
                </p>
              )}
            </>
          ) : (
            <p className="error">
              {availability.motivo ||
                'Sin disponibilidad. Cambia las fechas o el número de huéspedes.'}
            </p>
          ))}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <h3 className="mt-4">Opiniones de huéspedes</h3>
      {hotel.reviews?.length ? (
        hotel.reviews.map((review) => (
          <p className="muted" key={review.id}>
            ★ {review.score}/10 · {review.author}
            <br />
            {review.comment}
            {review.reply && (
              <span className="d-block mt-2">
                <strong>Respuesta de Kawsay:</strong> {review.reply}
              </span>
            )}
          </p>
        ))
      ) : (
        <p className="muted">Este alojamiento aún no tiene reseñas.</p>
      )}
    </>
  );
}
function Checkout({ hotel, quote }) {
  const { user, open, refresh } = useBooking();
  const key = useRef(crypto.randomUUID());
  return (
    <>
      <p className="eyebrow dark">UN PASO MÁS Y TODO LISTO</p>
      <h2 className="modal-title">Confirma tu estancia</h2>
      <h3>{hotel.nombre}</h3>
      <div className="notice">
        {quote.checkin} → {quote.checkout} · {quote.nights} noche(s)
        <br />
        <strong>Total: {money(quote.total_price)}</strong>
        <br />
        Reserva de demostración. No se cobrará dinero ni se solicitarán tarjetas.
      </div>
      <AsyncForm
        id="checkout-form"
        onSubmit={async (form) => {
          const order = await api(
            'orders/create',
            {
              order_preview_id: quote.order_preview_id,
              payment_reference: 'DEMO-' + key.current,
              customer_details: Object.fromEntries(new FormData(form)),
            },
            'POST',
            { 'Idempotency-Key': key.current },
          );
          refresh();
          open({ kind: 'confirmed', hotel, order });
        }}
      >
        <div className="form-grid">
          <label>
            Nombre
            <input
              className="form-control"
              name="first_name"
              required
              maxLength="100"
              autoComplete="given-name"
            />
          </label>
          <label>
            Apellido
            <input
              className="form-control"
              name="last_name"
              required
              maxLength="100"
              autoComplete="family-name"
            />
          </label>
          <label className="wide">
            Correo de contacto
            <input
              className="form-control"
              name="email"
              type="email"
              defaultValue={user.email}
              required
              autoComplete="email"
            />
          </label>
        </div>
        <label className="muted">
          <input className="form-check-input" type="checkbox" required /> Acepto la cancelación
          gratuita antes del check-in y entiendo que esta reserva es de demostración.
        </label>
        <div className="form-actions">
          <button className="button primary">Confirmar reserva · {money(quote.total_price)}</button>
        </div>
      </AsyncForm>
    </>
  );
}
function HotelForm({ hotel = {} }) {
  const { cities, close, notify, refresh } = useBooking();
  return (
    <>
      <h2 className="modal-title">{hotel.id ? 'Editar alojamiento' : 'Publica un nuevo lugar'}</h2>
      <AsyncForm
        id="hotel-form"
        onSubmit={async (form) => {
          await api(
            'admin/accommodations' + (hotel.id ? '/' + hotel.id : ''),
            hotelPayload(form),
            hotel.id ? 'PATCH' : 'POST',
          );
          close();
          refresh();
          notify('Alojamiento guardado');
        }}
      >
        <div className="form-grid">
          <label className="wide">
            Nombre
            <input
              className="form-control"
              name="nombre"
              required
              minLength="3"
              maxLength="255"
              defaultValue={hotel.nombre || ''}
            />
          </label>
          <label>
            Destino
            <select className="form-select" name="cityId" defaultValue={hotel.cityId || 1}>
              {cities.map((city) => (
                <option value={city.id} key={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo
            <input
              className="form-control"
              name="tipo"
              required
              minLength="3"
              maxLength="100"
              defaultValue={hotel.tipo || 'Hotel boutique'}
            />
          </label>
          <label className="wide">
            Dirección
            <input
              className="form-control"
              name="direccion"
              required
              minLength="3"
              maxLength="255"
              defaultValue={hotel.direccion || ''}
            />
          </label>
          <label className="wide">
            Descripción
            <textarea
              className="form-control"
              name="descripcion"
              required
              minLength="3"
              maxLength="3000"
              defaultValue={hotel.descripcion || ''}
            />
          </label>
          <label className="wide">
            URL de imagen HTTPS
            <input
              className="form-control"
              name="image"
              type="url"
              required
              defaultValue={
                hotel.image ||
                'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80'
              }
            />
          </label>
          {[
            [
              'precioPorNoche',
              'Tarifa por noche (USD)',
              hotel.precioPorNoche ?? 80,
              '0.01',
              '100000',
              '0.01',
            ],
            ['habitaciones', 'Habitaciones disponibles', hotel.habitaciones ?? 5, '1', '100', '1'],
            [
              'capacidadAdultos',
              'Adultos por habitación',
              hotel.capacidadAdultos ?? 2,
              '1',
              '100',
              '1',
            ],
            ['capacidadNinos', 'Niños por habitación', hotel.capacidadNinos ?? 1, '0', '100', '1'],
          ].map(([name, label, value, min, max, step]) => (
            <label key={name}>
              {label}
              <input
                className="form-control"
                name={name}
                type="number"
                min={min}
                max={max}
                step={step}
                required
                defaultValue={value}
              />
            </label>
          ))}
          <label>
            <input
              name="tienePiscina"
              className="form-check-input"
              type="checkbox"
              defaultChecked={hotel.tienePiscina}
            />{' '}
            Tiene piscina
          </label>
          <label>
            <input
              name="published"
              className="form-check-input"
              type="checkbox"
              defaultChecked={hotel.published !== false}
            />{' '}
            Publicado en marketplace
          </label>
        </div>
        <button className="button primary">Guardar alojamiento</button>
      </AsyncForm>
    </>
  );
}
function ModifyOrder({ order }) {
  const { close, refresh, notify } = useBooking();
  const key = useRef(crypto.randomUUID());
  return (
    <>
      <h2 className="modal-title">Modificar estancia</h2>
      <p className="muted">{order.locator} · La tarifa vigente se aplicará a la nueva estancia.</p>
      <AsyncForm
        id="modify-form"
        onSubmit={async (form) => {
          const values = Object.fromEntries(new FormData(form));
          const result = await api(
            'orders/' + order.order_id + '/modify',
            {
              checkin: values.checkin,
              checkout: values.checkout,
              guests: {
                ...order.guests,
                number_of_adults: Number(values.adults),
                number_of_rooms: Number(values.rooms),
              },
            },
            'POST',
            { 'Idempotency-Key': key.current },
          );
          close();
          refresh();
          notify('Reserva modificada. Nuevo total: ' + money(result.total_price));
        }}
      >
        <div className="form-grid">
          <label>
            Llegada
            <input
              className="form-control"
              name="checkin"
              type="date"
              defaultValue={order.checkin}
              required
            />
          </label>
          <label>
            Salida
            <input
              className="form-control"
              name="checkout"
              type="date"
              defaultValue={order.checkout}
              required
            />
          </label>
          <label>
            Adultos
            <input
              className="form-control"
              name="adults"
              type="number"
              min="1"
              max="100"
              defaultValue={order.guests.number_of_adults}
              required
            />
          </label>
          <label>
            Habitaciones
            <input
              className="form-control"
              name="rooms"
              type="number"
              min="1"
              max="100"
              defaultValue={order.guests.number_of_rooms}
              required
            />
          </label>
        </div>
        <button className="button primary">Guardar modificación</button>
      </AsyncForm>
    </>
  );
}
export default function Dialogs() {
  const { modal, user, close, logout, refresh, notify } = useBooking();
  const navigate = useNavigate();
  if (!modal) return null;
  let content;
  switch (modal.kind) {
    case 'invoice':
      content = <Invoice order={modal.order} />;
      break;
    case 'review':
      content = <ReviewForm order={modal.order} />;
      break;
    case 'reply':
      content = <ReviewForm record={modal.record} />;
      break;
    case 'login':
      content = <Login embedded after={modal.after} />;
      break;
    case 'hotel':
      content = <HotelDetails hotel={modal.hotel} />;
      break;
    case 'checkout':
      content = <Checkout hotel={modal.hotel} quote={modal.quote} />;
      break;
    case 'gallery-form':
      content = <GalleryForm hotel={modal.hotel} />;
      break;
    case 'hotel-form':
      content = <HotelForm hotel={modal.hotel} />;
      break;
    case 'modify':
      content = <ModifyOrder order={modal.order} />;
      break;
    case 'account':
      content = (
        <>
          <p className="eyebrow dark">TU CUENTA</p>
          <h2 className="modal-title">{user?.name}</h2>
          <p className="muted">{user?.email}</p>
          <ActionButton
            className="button outline"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
          >
            Cerrar sesión
          </ActionButton>
        </>
      );
      break;
    case 'confirmed':
      content = (
        <>
          <p className="eyebrow dark">TU PRÓXIMA HISTORIA TE ESPERA</p>
          <h2 className="modal-title">Reserva confirmada.</h2>
          <div className="notice">
            <span>Código de reserva</span>
            <strong id="reservation-code" className="d-block fs-3">{modal.order.locator}</strong>
            <br />
            {modal.hotel.nombre}
            <br />
            {modal.order.checkin} → {modal.order.checkout}
            <br />
            Total: {money(modal.order.total_price)} · Pago simulado
          </div>
          <p className="muted">
            Guarda este código para identificar tu reserva. También lo encontrarás en Mis reservas,
            donde puedes consultar, modificar o cancelar tu estancia.
          </p>
          <button
            id="see-orders"
            className="button primary"
            onClick={() => {
              close();
              navigate('/reservas');
            }}
          >
            Ver mis reservas ↗
          </button>
        </>
      );
      break;
    case 'cancel':
      content = (
        <>
          <h2 className="modal-title">Cancelar reserva</h2>
          <p>
            Vas a cancelar {modal.order.locator}. Las habitaciones quedarán disponibles para otros
            viajeros.
          </p>
          <ActionButton
            id="confirm-cancel"
            className="button danger"
            onClick={async () => {
              await api('orders/' + modal.order.order_id + '/cancel', {}, 'POST', {
                'Idempotency-Key': modal.requestKey,
              });
              close();
              refresh();
              notify('Reserva cancelada');
            }}
          >
            Confirmar cancelación
          </ActionButton>
        </>
      );
      break;
    case 'delete':
      content = (
        <>
          <h2 className="modal-title">Eliminar alojamiento</h2>
          <p>
            Se eliminará el alojamiento si no tiene historial de reservas o cotizaciones. Si tiene
            historial, puedes despublicarlo.
          </p>
          <ActionButton
            id="confirm-delete"
            className="button danger"
            onClick={async () => {
              await api('admin/accommodations/' + modal.hotel.id, undefined, 'DELETE');
              close();
              refresh();
            }}
          >
            Eliminar alojamiento
          </ActionButton>
        </>
      );
      break;
    default:
      return null;
  }
  return <Modal key={modal.requestKey}>{content}</Modal>;
}
