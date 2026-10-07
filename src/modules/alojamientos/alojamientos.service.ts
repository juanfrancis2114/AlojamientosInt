import { calendarDay, stayPrices, saveInvoice } from './stay-pricing';
import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager, ILike } from 'typeorm';
import { randomUUID, createHash, scryptSync, timingSafeEqual } from 'crypto';
import { Database } from './database';
import { seed, hashPassword } from './seed';
import { JwtAuth } from './jwt-auth';
import { expandCatalog } from './expand-catalog';
import { curateCatalog } from './curate-catalog';
import {fillGalleries,syncGallery} from './gallery';

const now = () => new Date().toISOString();
const expire = (minutes: number) => new Date(Date.now() + minutes * 60000).toISOString();
const wrap = (data: any) => ({ request_id: randomUUID(), data, next_page: null });
const stayReviewViews = async (em: EntityManager, accommodationId?: number) => {
  const rows = await em.find<any>(
    'resenas_estancia',
    accommodationId ? { where: { alojamiento_id: accommodationId } } : {},
  );
  if (!rows.length) return [];
  const users = await em.find<any>('users', { select: { id: true, name: true } });
  return rows.map((r) => ({
    id: r.id,
    accommodationId: r.alojamiento_id,
    author: users.find((u) => u.id === r.usuario_id)?.name || 'Viajero',
    score: r.puntuacion,
    comment: r.comentario,
    createdAt: r.fecha_creacion,
    reply: r.respuesta,
    replyAt: r.fecha_respuesta,
  }));
};
const canonical = (value: any): string =>
  JSON.stringify(value, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.keys(item)
          .sort()
          .reduce((out, key) => ({ ...out, [key]: item[key] }), {})
      : item,
  );
@Injectable()
export class AlojamientosService implements OnModuleInit {
  constructor(
    public database: Database,
    private readonly jwt: JwtAuth,
  ) {}
  async onModuleInit() {
    await this.database.ready();
    await this.database.transaction(seed);
    if (process.env.APPLY_DEMO_UPGRADE === 'true')
      await this.database.transaction(async (em) => {
        const marker = '00000000-0000-4000-8000-000000000005';
        if (!(await em.findOneBy('outbox_events', { id: marker }))) {
          await expandCatalog(em);
          const result = await curateCatalog(em);
          await em.save('outbox_events', {
            id: marker,
            eventType: 'CATALOG_CURATED',
            resourceId: 'ecuador-v3',
            timestamp: now(),
            data: result,
            status: 'PROCESSED',
          });
          console.log('Catálogo reducido:', JSON.stringify(result));
        }
      });
    await this.database.transaction(async em=>{const marker='00000000-0000-4000-8000-000000000006';if(!await em.findOneBy('outbox_events',{id:marker})){const result=await fillGalleries(em);await em.save('outbox_events',{id:marker,eventType:'GALLERIES_INITIALIZED',resourceId:'galerias-v1',timestamp:now(),data:result,status:'PROCESSED'});console.log('Galerías inicializadas:',JSON.stringify(result));}});
  }
  async assertNoOverlap(
    em: EntityManager,
    hotelId: number,
    input: any,
    exclude?: string,
  ) {
    const rows = await em.findBy<any>('orders', {
      accommodationId: hotelId,
      status: 'CONFIRMED',
    });
    if (
      rows.some((o) => o.id !== exclude && o.checkin < input.checkout && o.checkout > input.checkin)
    )
      throw new ConflictException(
        'Este alojamiento ya está reservado en esas fechas. Elige otras fechas',
      );
  }
  async auth(req: any, admin = false) {
    const token =
      req.headers.authorization?.replace(/^Bearer /, '') ||
      req.headers.cookie?.match(/(?:^|;\s*)booking_session=([^;]+)/)?.[1];
    if (!token) throw new UnauthorizedException('Inicia sesión para continuar');
    const claims = this.jwt.verify(token);
    const session = await this.database.db.manager.findOneBy<any>('sessions', {
      id: createHash('sha256').update(token).digest('hex'),
    });
    if (!session || session.expiresAt < now() || session.userId !== claims.sub)
      throw new UnauthorizedException('Sesión vencida o revocada');
    const user = await this.database.db.manager.findOneBy<any>('users', { id: session.userId });
    if (!user || !user.activo) throw new UnauthorizedException('Cuenta desactivada');
    if (admin && user.role !== 'admin')
      throw new ForbiddenException('Acceso exclusivo para administración');
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }
  async login(body: any, register = false) {
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      typeof body.email !== 'string' ||
      typeof body.password !== 'string' ||
      body.password.length < 10 ||
      body.password.length > 128
    )
      throw new BadRequestException(
        'Correo válido y contraseña de 10 a 128 caracteres requeridos',
      );
    return this.database.transaction(async (em) => {
      let user = await em.findOneBy<any>('users', { email });
      if (register) {
        if (user) throw new ConflictException('El correo ya está registrado');
        if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 100 || !/^[\p{L}\p{M}]+(?:[ '\-][\p{L}\p{M}]+)*$/u.test(body.name.trim()))
          throw new BadRequestException('Nombre de 2 a 100 caracteres: letras, espacios, apóstrofes y guiones; sin números');
        user = await em.save<any, any>('users', {
          id: randomUUID(),
          email,
          name: body.name.trim(),
          passwordHash: hashPassword(body.password),
          role: 'customer',
          createdAt: now(),
        });
      } else {
        const [salt, stored] = (user?.passwordHash || hashPassword('dummy-password')).split(':');
        const actual = scryptSync(body.password, salt, 64);
        if (!timingSafeEqual(Buffer.from(stored, 'hex'), actual) || !user)
          throw new UnauthorizedException('Credenciales incorrectas');
        if (!user.activo)
          throw new ForbiddenException('La cuenta está desactivada; contacta con administración');
      }
      const token = this.jwt.issue(user);
      await em.save<any, any>('sessions', {
        id: createHash('sha256').update(token).digest('hex'),
        userId: user.id,
        expiresAt: expire(60),
      });
      return { token, user: { id: user.id, name: user.name, email, role: user.role } };
    });
  }
  async logout(req: any) {
    const token =
      req.headers.authorization?.replace(/^Bearer /, '') ||
      req.headers.cookie?.match(/(?:^|;\s*)booking_session=([^;]+)/)?.[1];
    if (token)
      await this.database.db.manager.delete('sessions', {
        id: createHash('sha256').update(token).digest('hex'),
      });
  }
  dates(checkin: string, checkout: string) {
    const valid = (s: string) =>
      typeof s === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(s) &&
      !isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s;
    if (!valid(checkin) || !valid(checkout) || checkin < calendarDay() || checkout <= checkin)
      throw new BadRequestException('Fechas inválidas: entrada desde hoy y salida posterior');
    const nights = (Date.parse(checkout) - Date.parse(checkin)) / 86400000;
    if (nights > 90) throw new BadRequestException('Máximo 90 noches por reserva');
    return nights;
  }
  async hotel(em: EntityManager, id: number) {
    if (!Number.isSafeInteger(id) || id < 1)
      throw new BadRequestException('El ID de alojamiento debe ser un entero positivo');
    const hotel = await em.findOneBy<any>('accommodations', { id });
    if (!hotel) throw new NotFoundException('Alojamiento no encontrado');
    const room = await em.findOneBy<any>('room_types', { accommodationId: id });
    const rate = await em.findOneBy<any>('rate_plans', { roomTypeId: room.id });
    const links = await em.findBy<any>('accommodation_facilities', { accommodationId: id });
    const facilities = await em.find<any>('facilities');
    const reviews = await em.findBy<any>('reviews', { accommodationId: id });
    reviews.push(...(await stayReviewViews(em, id)));
    return {
      ...hotel,
      ...{
        precioPorNoche: Number(rate.precioPorNoche),
        capacidadAdultos: room.capacidadAdultos,
        capacidadNinos: room.capacidadNinos,
        habitaciones: room.habitaciones,
      },
      facilities: facilities
        .filter((f) => links.some((l) => l.facilityId === f.id))
        .map((f) => f.name),
      tienePiscina: links.some((l) => l.facilityId === 2),
      score: reviews.length ? reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length : null,
      reviews,
      photos: await em.findBy<any>('photos', { accommodationId: id }),
      galeria:await em.find<any>('imagenes_alojamiento',{where:{alojamiento_id:id},order:{orden:'ASC'}}),
    };
  }
  async capacity(
    em: EntityManager,
    hotel: any,
    input: any,
    exclude?: string,
    preloadedOrders?: any[],
    preloadedCalendar?: any[],
    ownerId?: string,
  ) {
    const nights = this.dates(input.checkin, input.checkout);
    const g = input.guests;
    if (
      !g ||
      !Number.isInteger(g.number_of_adults) ||
      !Number.isInteger(g.number_of_rooms) ||
      g.number_of_adults < 1 ||
      g.number_of_rooms < 1 ||
      g.number_of_adults > 100 ||
      (g.children || []).some((age: any) => !Number.isInteger(age) || age < 0 || age > 17)
    )
      throw new BadRequestException('Huéspedes inválidos');
    const orders = (
      preloadedOrders ||
      (await em.findBy<any>('orders', { accommodationId: hotel.id, status: 'CONFIRMED' }))
    ).filter(
      (o) =>
        o.accommodationId === hotel.id &&
        o.id !== exclude &&
        o.checkin < input.checkout &&
        o.checkout > input.checkin,
    );
    const calendar = (
      preloadedCalendar ||
      (await em.findBy<any>('calendario_tarifas', { alojamiento_id: hotel.id }))
    ).filter((c) => c.alojamiento_id === hotel.id);
    let rooms = hotel.habitaciones;
    for (let t = Date.parse(input.checkin); t < Date.parse(input.checkout); t += 86400000) {
      const day = new Date(t).toISOString().slice(0, 10);
      const override = calendar.find((c) => c.fecha === day);
      const occupied = orders
        .filter((o) => o.checkin <= day && o.checkout > day)
        .reduce((sum, o) => sum + o.guests.number_of_rooms, 0);
      rooms = Math.min(
        rooms,
        (override?.cerrado ? 0 : (override?.cupo ?? hotel.habitaciones)) - occupied,
      );
    }
    const prices = stayPrices(
      hotel.precioPorNoche,
      g.number_of_rooms,
      input.checkin,
      input.checkout,
      calendar,
    );
    const duplicate = !!ownerId && orders.some((o) => o.ownerId === ownerId);
    const occupied = orders.length > 0;
    if (occupied) rooms = 0;
    const available =
      !occupied &&
      hotel.published &&
      rooms >= g.number_of_rooms &&
      hotel.capacidadAdultos * g.number_of_rooms >= g.number_of_adults &&
      hotel.capacidadNinos * g.number_of_rooms >= (g.children || []).length;
    return {
      available,
      rooms: Math.max(0, rooms),
      nights,
      total: prices.total,
      lineas: prices.lineas,
      motivo: duplicate
        ? 'Ya tienes una reserva en este alojamiento que coincide con esas fechas. Modifica o cancela la existente, o cambia las fechas.'
        : occupied ? 'Este alojamiento ya está reservado en esas fechas. Elige otras fechas.' : null,
    };
  }

  async catalog(admin = false, nombre?: string) {
    const em = this.database.db.manager;
    const hotels = await em.find<any>('accommodations', {
      order: { id: 'ASC' },
      ...(nombre ? { where: { nombre: ILike('%' + nombre.trim() + '%') } } : {}),
    });
    // Carga por lotes: siete consultas, en lugar de consultar cada alojamiento por separado.
    const [rooms, rates, links, facilities, reviews, photos] = await Promise.all(
      [
        'room_types',
        'rate_plans',
        'accommodation_facilities',
        'facilities',
        'reviews',
        'photos',
      ].map((table) => em.find<any>(table)),
    );
    reviews.push(...(await stayReviewViews(em)));
    const roomMap = new Map(rooms.map((r) => [r.accommodationId, r]));
    const rateMap = new Map(rates.map((r) => [r.roomTypeId, r]));
    return hotels
      .filter((h) => admin || h.published)
      .map((h) => {
        const room: any = roomMap.get(h.id);
        const rate: any = rateMap.get(room.id);
        const hotelLinks = links.filter((l) => l.accommodationId === h.id);
        const hotelReviews = reviews.filter((r) => r.accommodationId === h.id);
        return {
          ...h,
          precioPorNoche: Number(rate.precioPorNoche),
          capacidadAdultos: room.capacidadAdultos,
          capacidadNinos: room.capacidadNinos,
          habitaciones: room.habitaciones,
          facilities: facilities
            .filter((f) => hotelLinks.some((l) => l.facilityId === f.id))
            .map((f) => f.name),
          tienePiscina: hotelLinks.some((l) => l.facilityId === 2),
          score: hotelReviews.length
            ? hotelReviews.reduce((sum, r) => sum + r.score, 0) / hotelReviews.length
            : null,
          reviews: hotelReviews,
          photos: photos.filter((p) => p.accommodationId === h.id),
        };
      });
  }
  async search(b: any, user?: any) {
    this.dates(b.checkin, b.checkout);
    if (b.currency && b.currency !== 'USD')
      throw new BadRequestException('El prototipo opera únicamente en USD');
    const hotels = (await this.catalog()).filter(
      (h) => (!b.city || h.cityId === b.city) && (!b.country || b.country === 'ec'),
    );
    const rows = b.rows || 100;
    const offset = b.page ? Number(b.page) : 0;
    if (!Number.isInteger(offset) || offset < 0) throw new BadRequestException('Página inválida');
    const found = [];
    const orders = await this.database.db.manager.findBy<any>('orders', { status: 'CONFIRMED' });
    const calendar = await this.database.db.manager.find<any>('calendario_tarifas');
    for (const h of hotels) {
      const a = await this.capacity(
        this.database.db.manager,
        h,
        b,
        undefined,
        orders,
        calendar,
        user?.role === 'customer' ? user.id : undefined,
      );
      if (a.available)
        found.push({
          ...h,
          url: '/?hotel=' + h.id,
          total_price: a.total,
          available_rooms: a.rooms,
        });
    }
    return {
      ...wrap(found.slice(offset, offset + rows)),
      next_page: offset + rows < found.length ? String(offset + rows) : null,
    };
  }
  async availability(b: any, em = this.database.db.manager, user?: any) {
    if (b.currency && b.currency !== 'USD') throw new BadRequestException('Moneda no soportada');
    const h = await this.hotel(em, b.accommodation);
    const a = await this.capacity(
      em,
      h,
      b,
      undefined,
      undefined,
      undefined,
      user?.role === 'customer' ? user.id : undefined,
    );
    let products = [];
    if (a.available) {
      const p = await em.save<any, any>('availability_products', {
        id: randomUUID(),
        accommodationId: h.id,
        checkin: b.checkin,
        checkout: b.checkout,
        guests: b.guests,
        total: a.total,
        expiresAt: expire(15),
      });
      products = [
        {
          id: p.id,
          total_price: a.total,
          price_per_night: h.precioPorNoche,
          nights: a.nights,
          rooms: b.guests.number_of_rooms,
          desglose: a.lineas,
          cancellation: 'Gratuita antes del check-in',
          expires_at: p.expiresAt,
        },
      ];
    }
    return wrap({
      id: h.id,
      available: a.available,
      available_rooms: a.rooms,
      motivo: a.motivo,
      currency: 'USD',
      products,
      url: '/?hotel=' + h.id,
    });
  }
  async preview(b: any, user: any) {
    if (user.role === 'admin')
      throw new ForbiddenException(
        'El administrador gestiona reservas; usa una cuenta de viajero para reservar',
      );
    return this.database.transaction(async (em) => {
      const p = await em.findOneBy<any>('availability_products', {
        id: b.product_id,
        accommodationId: b.accommodation_id,
      });
      if (!p || p.expiresAt < now())
        throw new ConflictException('La disponibilidad venció; vuelve a consultar');
      if (canonical(p.guests) !== canonical(b.guests))
        throw new ConflictException('Los huéspedes cambiaron; consulta disponibilidad de nuevo');
      const h = await this.hotel(em, p.accommodationId);
      await this.assertNoOverlap(em, h.id, p);
      const a = await this.capacity(em, h, p);
      if (!a.available || a.total !== p.total)
        throw new ConflictException('Disponibilidad o precio cambiaron');
      const q = await em.save<any, any>('quotes', {
        id: randomUUID(),
        productId: p.id,
        ownerId: user.id,
        total: p.total,
        expiresAt: expire(10),
      });
      return wrap({
        order_preview_id: q.id,
        total_price: q.total,
        currency: 'USD',
        expires_at: q.expiresAt,
        checkin: p.checkin,
        checkout: p.checkout,
        nights: a.nights,
      });
    });
  }
  orderView(o: any) {
    const base = '/api/v1/orders/' + o.id;
    const today = calendarDay();
    const editable = o.status === 'CONFIRMED' && o.checkin > today;
    const completed = o.status === 'CONFIRMED' && o.checkout <= today;
    return {
      order_id: o.id,
      locator: o.locator,
      status: o.status,
      accommodation_details: { id: o.accommodationId },
      checkin: o.checkin,
      checkout: o.checkout,
      guests: o.guests,
      customer_details: o.customer,
      total_price: o.total,
      currency: o.currency,
      creation_date: o.createdAt,
      estancia_estado:
        o.status === 'CANCELLED'
          ? 'CANCELADA'
          : completed
            ? 'COMPLETADA'
            : o.checkin <= today
              ? 'EN_CURSO'
              : 'CONFIRMADA',
      puede_resenar: completed,
      _links: editable
        ? { self: base, modify: base + '/modify', cancel: base + '/cancel' }
        : { self: base },
    };
  }
  async ownOrder(em: EntityManager, id: string, user: any) {
    const o = await em.findOneBy<any>('orders', { id });
    if (!o || (o.ownerId !== user.id && user.role !== 'admin'))
      throw new NotFoundException('Reserva no encontrada');
    return o;
  }
  async event(em: EntityManager, eventType: string, resourceId: string, data: any) {
    await em.save<any, any>('outbox_events', {
      id: randomUUID(),
      eventType,
      resourceId,
      timestamp: now(),
      data,
      status: 'PENDING',
    });
  }
  async mutateOrder(action: string, id: string, b: any, key: string, user: any) {
    if (action === 'create' && user.role === 'admin')
      throw new ForbiddenException('El administrador no puede crear reservas personales');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key || ''))
      throw new BadRequestException('Idempotency-Key debe ser UUID v4');
    const operation = action + ':' + (id || '');
    const fingerprint = createHash('sha256').update(canonical(b)).digest('hex');
    return this.database.transaction(async (em) => {
      const existing = await em.findOneBy<any>('idempotency_keys', { id: key });
      if (existing) {
        if (
          existing.ownerId !== user.id ||
          existing.operation !== operation ||
          existing.fingerprint !== fingerprint
        )
          throw new ConflictException('Clave idempotente reutilizada con otra operación');
        return existing.response;
      }
      let o: any;
      if (action === 'create') {
        const q = await em.findOneBy<any>('quotes', { id: b.order_preview_id, ownerId: user.id });
        if (!q || q.expiresAt < now())
          throw new ConflictException('Cotización no encontrada o vencida');
        if (await em.findOneBy<any>('orders', { quoteId: q.id }))
          throw new ConflictException('Esta cotización ya fue confirmada');
        const p = await em.findOneBy<any>('availability_products', { id: q.productId });
        const h = await this.hotel(em, p.accommodationId);
        await this.assertNoOverlap(em, h.id, p);
        const a = await this.capacity(em, h, p);
        if (!a.available || a.total !== q.total)
          throw new ConflictException('Sin disponibilidad o precio actualizado');
        if (
          !b.customer_details?.first_name ||
          !b.customer_details?.last_name ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.customer_details?.email || '')
        )
          throw new BadRequestException('Nombre, apellido y correo del titular requeridos');
        if (!String(b.payment_reference).startsWith('DEMO-'))
          throw new BadRequestException(
            'Este prototipo solo acepta referencias DEMO-. No procesa pagos reales',
          );
        o = await em.save<any, any>('orders', {
          id: randomUUID(),
          accommodationId: h.id,
          ownerId: user.id,
          quoteId: q.id,
          locator: 'BP-' + randomUUID().slice(0, 8).toUpperCase(),
          status: 'CONFIRMED',
          checkin: p.checkin,
          checkout: p.checkout,
          guests: p.guests,
          total: q.total,
          currency: 'USD',
          paymentReference: b.payment_reference,
          customer: b.customer_details,
          createdAt: now(),
        });
        await saveInvoice(em, o, h, a.lineas);
        await em.save<any, any>('order_guests', {
          orderId: o.id,
          name: b.customer_details.first_name + ' ' + b.customer_details.last_name,
          age: 18,
        });
      } else {
        o = await this.ownOrder(em, id, user);
        if (o.status !== 'CONFIRMED') throw new ConflictException('La reserva ya está cancelada');
        if (o.checkin <= calendarDay()) throw new ConflictException('La estancia ya comenzó');
        if (action === 'cancel') o.status = 'CANCELLED';
        else {
          const input = {
            checkin: b.checkin || o.checkin,
            checkout: b.checkout || o.checkout,
            guests: b.guests || o.guests,
          };
          const h = await this.hotel(em, o.accommodationId);
          await this.assertNoOverlap(em, h.id, input, o.id);
          const a = await this.capacity(em, h, input, o.id);
          if (!a.available) throw new ConflictException('Sin disponibilidad para la modificación');
          Object.assign(o, input, { total: a.total });
          await saveInvoice(em, o, h, a.lineas);
        }
        await em.save<any, any>('orders', o);
        if (action === 'cancel')
          await em.update('facturas', { reserva_id: o.id }, { estado: 'ANULADA' });
      }
      const result = this.orderView(o);
      await this.event(
        em,
        action === 'cancel'
          ? 'ORDER_CANCELLED'
          : action === 'create'
            ? 'ORDER_CONFIRMED'
            : 'ORDER_MODIFIED',
        o.id,
        result,
      );
      await em.save<any, any>('idempotency_keys', {
        id: key,
        ownerId: user.id,
        operation,
        fingerprint,
        response: result,
        createdAt: now(),
      });
      return result;
    });
  }
  async saveHotel(b: any, user: any, id?: number) {
    if (id !== undefined && (!Number.isSafeInteger(id) || id < 1))
      throw new BadRequestException('ID inválido');
    const fields = [
      'nombre',
      'destino',
      'precioPorNoche',
      'capacidadAdultos',
      'capacidadNinos',
      'habitaciones',
      'tienePiscina',
      'descripcion',
      'direccion',
      'tipo',
      'image',
      'published',
      'cityId',
    ];
    if (Object.keys(b).some((k) => !fields.includes(k)))
      throw new BadRequestException('Campo no permitido');
    return this.database.transaction(async (em) => {
      const old = id !== undefined ? await this.hotel(em, id) : {};
      const v = { ...old, ...b };
      for (const field of ['nombre', 'descripcion', 'direccion', 'tipo'])
        if (typeof v[field] !== 'string' || v[field].trim().length < 3 || v[field].length > 3000)
          throw new BadRequestException('Campo inválido: ' + field);
      if (
        typeof v.precioPorNoche !== 'number' ||
        v.precioPorNoche <= 0 ||
        v.precioPorNoche > 100000
      )
        throw new BadRequestException('Precio inválido');
      for (const f of ['capacidadAdultos', 'capacidadNinos', 'habitaciones'])
        if (!Number.isInteger(v[f]) || v[f] < (f === 'capacidadNinos' ? 0 : 1) || v[f] > 100)
          throw new BadRequestException('Capacidad inválida: ' + f);
      if (typeof v.published !== 'boolean' || typeof v.tienePiscina !== 'boolean')
        throw new BadRequestException('Estado y piscina deben ser booleanos');
      if (id) {
        const future = (
          await em.findBy<any>('orders', { accommodationId: id, status: 'CONFIRMED' })
        ).filter((o) => o.checkout > now().slice(0, 10));
        for (const o of future)
          if (
            o.guests.number_of_adults > v.capacidadAdultos * o.guests.number_of_rooms ||
            (o.guests.children || []).length > v.capacidadNinos * o.guests.number_of_rooms
          )
            throw new ConflictException('La nueva capacidad afecta una reserva confirmada');
        for (const o of future)
          if (
            future
              .filter((x) => x.checkin <= o.checkin && x.checkout > o.checkin)
              .reduce((sum, x) => sum + x.guests.number_of_rooms, 0) > v.habitaciones
          )
            throw new ConflictException(
              'No puedes reducir inventario por debajo de las reservas confirmadas',
            );
      }
      if (!/^https:\/\//.test(v.image || ''))
        throw new BadRequestException('La foto debe usar HTTPS');
      const city = await em.findOneBy<any>('cities', { id: v.cityId });
      if (!city) throw new BadRequestException('Ciudad inválida');
      const h = await em.save<any, any>('accommodations', {
        ...(id ? { id } : {}),
        nombre: v.nombre,
        cityId: city.id,
        destino: city.name,
        descripcion: v.descripcion,
        direccion: v.direccion,
        tipo: v.tipo,
        image: v.image,
        published: v.published,
        createdAt: old.createdAt || now(),
        updatedAt: now(),
      });
      const roomOld = await em.findOneBy<any>('room_types', { accommodationId: h.id });
      const room = await em.save<any, any>('room_types', {
        ...(roomOld || {}),
        accommodationId: h.id,
        nombre: 'Habitación estándar',
        capacidadAdultos: v.capacidadAdultos,
        capacidadNinos: v.capacidadNinos,
        habitaciones: v.habitaciones,
      });
      const rate = await em.findOneBy<any>('rate_plans', { roomTypeId: room.id });
      await em.save<any, any>('rate_plans', {
        ...(rate || {}),
        roomTypeId: room.id,
        precioPorNoche: v.precioPorNoche,
        currency: 'USD',
        cancellation: 'Gratuita antes del check-in',
      });
      await em.delete('accommodation_facilities', { accommodationId: h.id });
      for (const facilityId of v.tienePiscina ? [1, 2] : [1])
        await em.save<any, any>('accommodation_facilities', { accommodationId: h.id, facilityId });
      if(!id||v.image!==old.image){const gallery=await syncGallery(em,h);await em.delete('photos', { accommodationId: h.id });await em.save<any,any>('photos',{accommodationId:h.id,url:v.image,caption:JSON.stringify({author:gallery[0].autor,license:gallery[0].licencia,source:gallery[0].fuente,licenseUrl:gallery[0].licencia_url})});}
      await em.save<any, any>('audit_logs', {
        id: randomUUID(),
        actorId: user.id,
        action: id ? 'ACCOMMODATION_UPDATED' : 'ACCOMMODATION_CREATED',
        resourceId: String(h.id),
        timestamp: now(),
      });
      await this.event(em, 'ACCOMMODATION_UPDATED', String(h.id), {
        id: h.id,
        updatedAt: h.updatedAt,
      });
      return this.hotel(em, h.id);
    });
  }
  async deleteHotel(id: number, user: any) {
    return this.database.transaction(async (em) => {
      await this.hotel(em, id);
      if (
        (await em.countBy('calendario_tarifas', { alojamiento_id: id })) ||
        (await em.countBy('gastos', { alojamiento_id: id }))
      )
        throw new ConflictException(
          'El alojamiento tiene tarifas o gastos relacionados; conserva sus referencias o retira primero esos registros',
        );
      if (
        (await em.countBy('orders', { accommodationId: id })) ||
        (await em.countBy('availability_products', { accommodationId: id }))
      )
        throw new ConflictException(
          'El alojamiento tiene historial; despublícalo para conservar las referencias',
        );
      const room = await em.findOneBy<any>('room_types', { accommodationId: id });
      await em.delete('rate_plans', { roomTypeId: room.id });
      await em.delete('room_types', { accommodationId: id });
      await em.delete('imagenes_alojamiento',{alojamiento_id:id});
      for (const table of ['photos', 'reviews', 'accommodation_facilities'])
        await em.delete(table, { accommodationId: id });
      await em.delete('accommodations', { id });
      await em.save<any, any>('audit_logs', {
        id: randomUUID(),
        actorId: user.id,
        action: 'ACCOMMODATION_DELETED',
        resourceId: String(id),
        timestamp: now(),
      });
    });
  }
}
