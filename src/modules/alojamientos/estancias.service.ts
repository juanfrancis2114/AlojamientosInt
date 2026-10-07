import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from './database';
import { AlojamientosService } from './alojamientos.service';
import { calendarDay } from './stay-pricing';
export const validDay = (day: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(day) &&
  Number.isFinite(Date.parse(day)) &&
  new Date(day).toISOString().slice(0, 10) === day;
@Injectable()
export class EstanciasService {
  constructor(
    private readonly database: Database,
    private readonly booking: AlojamientosService,
  ) {}
  async profile(user: any) {
    const em = this.database.db.manager;
    const account = await em.findOneBy<any>('users', { id: user.id });
    const profile = await em.findOneBy<any>('perfiles_usuario', { usuario_id: user.id });
    return {
      id: user.id,
      nombre: account.name,
      correo: account.email,
      telefono: profile?.telefono || '',
      documento: profile?.documento || '',
      direccion: profile?.direccion || '',
    };
  }
  async updateProfile(input: any, user: any) {
    await this.database.transaction(async (em) => {
      await em.update('users', { id: user.id }, { name: input.nombre });
      await em.save('perfiles_usuario', {
        usuario_id: user.id,
        telefono: input.telefono,
        documento: input.documento,
        direccion: input.direccion,
        fecha_actualizacion: new Date().toISOString(),
      });
    });
    return this.profile(user);
  }
  async invoice(id: string, user: any) {
    const em = this.database.db.manager;
    const order = await this.booking.ownOrder(em, id, user);
    const invoice = await em.findOneBy<any>('facturas', { reserva_id: order.id });
    if (!invoice)
      throw new NotFoundException('Esta reserva anterior no tiene factura de demostración emitida');
    return {
      ...invoice,
      reserva: {
        localizador: order.locator,
        entrada: order.checkin,
        salida: order.checkout,
        estado: order.status,
      },
      detalles: await em.find<any>('detalles_factura', {
        where: { factura_id: invoice.id },
        order: { id: 'ASC' },
      }),
      aviso:
        'Factura simulada, sin autorización del SRI ni cobro real. No es un comprobante tributario.',
    };
  }
  async invoices() {
    const em = this.database.db.manager;
    const [rows, orders] = await Promise.all([
      em.find<any>('facturas', { order: { fecha_emision: 'DESC' } }),
      em.find<any>('orders'),
    ]);
    return rows.map((f) => ({
      ...f,
      localizador: orders.find((o) => o.id === f.reserva_id)?.locator,
      nombre_cliente: f.cliente.first_name + ' ' + f.cliente.last_name,
    }));
  }
  async reviews(user?: any) {
    const em = this.database.db.manager;
    const [rows, users, hotels] = await Promise.all([
      em.find<any>('resenas_estancia', {
        ...(user ? { where: { usuario_id: user.id } } : {}),
        order: { fecha_creacion: 'DESC' },
      }),
      em.find<any>('users'),
      em.find<any>('accommodations'),
    ]);
    return rows.map((r) => ({
      ...r,
      autor: users.find((u) => u.id === r.usuario_id)?.name || 'Viajero',
      alojamiento: hotels.find((h) => h.id === r.alojamiento_id)?.nombre,
    }));
  }
  async createReview(id: string, input: any, user: any) {
    if (user.role === 'admin')
      throw new ForbiddenException('Solo los viajeros pueden reseñar su estancia');
    return this.database.transaction(async (em) => {
      const order = await this.booking.ownOrder(em, id, user);
      if (order.status !== 'CONFIRMED' || order.checkout > calendarDay())
        throw new ConflictException('Solo puedes reseñar una estancia completada y no cancelada');
      if (await em.findOneBy('resenas_estancia', { reserva_id: id }))
        throw new ConflictException('Esta estancia ya tiene una reseña');
      const result = {
        id: randomUUID(),
        reserva_id: id,
        usuario_id: user.id,
        alojamiento_id: order.accommodationId,
        puntuacion: input.puntuacion,
        comentario: input.comentario,
        fecha_creacion: new Date().toISOString(),
        respuesta: '',
        respondido_por: null,
        fecha_respuesta: null,
      };
      await em.save('resenas_estancia', result);
      return result;
    });
  }
  async replyReview(id: string, input: any, user: any) {
    return this.database.transaction(async (em) => {
      const old = await em.findOneBy<any>('resenas_estancia', { id });
      if (!old) throw new NotFoundException('Reseña no encontrada');
      const result = {
        ...old,
        respuesta: input.respuesta,
        respondido_por: user.id,
        fecha_respuesta: new Date().toISOString(),
      };
      await em.save('resenas_estancia', result);
      return result;
    });
  }
  async calendar() {
    const em = this.database.db.manager;
    const [rows, hotels] = await Promise.all([
      em.find<any>('calendario_tarifas', { order: { fecha: 'ASC' } }),
      em.find<any>('accommodations'),
    ]);
    return rows.map((row) => ({
      ...row,
      alojamiento: hotels.find((h) => h.id === row.alojamiento_id)?.nombre,
    }));
  }
  async saveCalendar(input: any, user: any) {
    if (
      !validDay(input.desde) ||
      !validDay(input.hasta) ||
      input.desde > input.hasta ||
      input.desde < calendarDay() ||
      (Date.parse(input.hasta) - Date.parse(input.desde)) / 86400000 > 92
    )
      throw new BadRequestException(
        'Selecciona fechas existentes desde hoy y un rango máximo de 93 días',
      );
    return this.database.transaction(async (em) => {
      const hotel = await this.booking.hotel(em, input.alojamiento_id);
      if (input.cupo != null && input.cupo > hotel.habitaciones)
        throw new BadRequestException('El cupo no puede superar las habitaciones del alojamiento');
      const orders = await em.findBy<any>('orders', {
        accommodationId: hotel.id,
        status: 'CONFIRMED',
      });
      let count = 0;
      for (let t = Date.parse(input.desde); t <= Date.parse(input.hasta); t += 86400000) {
        const fecha = new Date(t).toISOString().slice(0, 10);
        const used = orders
          .filter((o) => o.checkin <= fecha && o.checkout > fecha)
          .reduce((sum, o) => sum + o.guests.number_of_rooms, 0);
        if (used > (input.cerrado ? 0 : (input.cupo ?? hotel.habitaciones)))
          throw new ConflictException('El cambio afectaría reservas existentes el ' + fecha);
        const old = await em.findOneBy<any>('calendario_tarifas', {
          alojamiento_id: hotel.id,
          fecha,
        });
        await em.save('calendario_tarifas', {
          ...(old ? { id: old.id } : {}),
          alojamiento_id: hotel.id,
          fecha,
          precio: input.precio ?? null,
          cupo: input.cupo ?? null,
          cerrado: input.cerrado,
          nota: input.nota,
          actor_id: user.id,
          fecha_actualizacion: new Date().toISOString(),
        });
        count++;
      }
      return { dias: count };
    });
  }
  async removeCalendar(id: number) {
    return this.database.transaction(async (em) => {
      if (!(await em.findOneBy('calendario_tarifas', { id })))
        throw new NotFoundException('Tarifa no encontrada');
      await em.delete('calendario_tarifas', { id });
    });
  }
}
