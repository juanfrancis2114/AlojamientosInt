export const money = (value) =>
  new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
export function nextDay(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Date(date.getTime() + 86400000).toISOString().slice(0, 10);
}
export function initialDates(today = new Date()) {
  const date = new Date(today);
  date.setUTCDate(date.getUTCDate() + 7);
  const checkin = date.toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() + 2);
  return { checkin, checkout: date.toISOString().slice(0, 10) };
}
export function hotelPayload(form) {
  const data = new FormData(form);
  const payload = Object.fromEntries(data);
  for (const key of [
    'cityId',
    'precioPorNoche',
    'habitaciones',
    'capacidadAdultos',
    'capacidadNinos',
  ])
    payload[key] = Number(payload[key]);
  payload.published = data.has('published');
  payload.tienePiscina = data.has('tienePiscina');
  return payload;
}
export const guests = (search) => ({
  number_of_adults: Number(search.adults),
  number_of_rooms: Number(search.rooms),
  children: [],
});
export const searchInput = (search) => ({
  booker: { country: 'ec', platform: 'desktop' },
  checkin: search.checkin,
  checkout: search.checkout,
  guests: guests(search),
  currency: 'USD',
  ...(search.city ? { city: Number(search.city) } : {}),
});
