import { EntityManager } from 'typeorm';
import { randomUUID } from 'crypto';
export const calendarDay = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const cents = (value: number) => Math.round(value * 100) / 100;
export function stayPrices(
  base: number,
  rooms: number,
  checkin: string,
  checkout: string,
  calendar: any[] = [],
) {
  const result = [];
  for (let time = Date.parse(checkin); time < Date.parse(checkout); time += 86400000) {
    const fecha = new Date(time).toISOString().slice(0, 10);
    const row = calendar.find((c) => c.fecha === fecha);
    const precio = Number(row?.precio ?? base);
    result.push({
      fecha,
      cantidad: rooms,
      precio_unitario: precio,
      subtotal: cents(precio * rooms),
    });
  }
  return { lineas: result, total: cents(result.reduce((sum, row) => sum + row.subtotal, 0)) };
}
export async function saveInvoice(em: EntityManager, order: any, hotel: any, lines: any[]) {
  const old = await em.findOneBy<any>('facturas', { reserva_id: order.id });
  const profile = await em.findOneBy<any>('perfiles_usuario', { usuario_id: order.ownerId });
  const total = cents(lines.reduce((sum, row) => sum + row.subtotal, 0));
  if (total !== Number(order.total))
    throw new Error('Los detalles no coinciden con el total de la reserva');
  const invoice = {
    id: old?.id || randomUUID(),
    reserva_id: order.id,
    usuario_id: order.ownerId,
    numero: old?.numero || 'KAW-DEMO-' + order.locator,
    emisor: { nombre: 'Kawsay Estancias', tipo: 'DEMOSTRACIÓN ACADÉMICA' },
    cliente: {
      ...order.customer,
      telefono: profile?.telefono || '',
      documento: profile?.documento || '',
      direccion: profile?.direccion || '',
    },
    fecha_emision: old?.fecha_emision || new Date().toISOString(),
    subtotal: order.total,
    impuestos: 0,
    total: order.total,
    moneda: 'USD',
    estado: 'EMITIDA',
    version: (old?.version || 0) + 1,
  };
  await em.save('facturas', invoice);
  if (old) await em.delete('detalles_factura', { factura_id: old.id });
  await em.insert(
    'detalles_factura',
    lines.map((row) => ({
      factura_id: invoice.id,
      descripcion: hotel.nombre + ' · ' + row.fecha,
      cantidad: row.cantidad,
      precio_unitario: row.precio_unitario,
      subtotal: row.subtotal,
    })),
  );
  return invoice;
}
