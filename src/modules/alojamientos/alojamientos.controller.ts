import { Body, Controller, Get, Post, Put, Patch, Delete, Param, Query, Req, Res, Headers, HttpCode, ParseIntPipe, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiCookieAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiBadRequestResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { AlojamientosService } from './alojamientos.service';
import { validateContract } from './contract';
import { AdminAccommodationDto, PatchAccommodationDto, AccommodationFilterDto } from './dto/admin-accommodation.dto';

const wrap = (data: any) => ({ request_id: randomUUID(), data, next_page: null });
@Controller()
@ApiTags('Alojamientos')
export class AlojamientosController {
  constructor(private readonly service: AlojamientosService) {}
  @Get('health')
  async health() {
    await this.service.database.db.query('SELECT 1');
    const postgres = this.service.database.db.options.type === 'postgres';
    const guard = postgres ? await this.service.database.db.query("SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.reservas'::regclass AND tgname = 'reservas_sin_solapamiento' AND tgenabled = 'O'") : [];
    const nameGuard = postgres ? await this.service.database.db.query("SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.usuarios'::regclass AND tgname = 'usuarios_nombre_valido' AND tgenabled = 'O'") : [];
    return { status: 'ok', database: this.service.database.db.options.type, domain: 'alojamientos', reservation_guard: postgres ? guard.length > 0 : 'application', user_name_guard: postgres ? nameGuard.length > 0 : 'application' };
  }
  @Post('auth/:action')
  @ApiBody({ schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 10 }, name: { type: 'string' } } } })
  async login(@Param('action') action: string, @Body() b: any, @Req() req: any, @Res({ passthrough: true }) res: any) {
    if (action === 'logout') { await this.service.logout(req); res.clearCookie('booking_session', { path: '/' }); return { ok: true }; }
    if (!['login', 'register'].includes(action)) throw new NotFoundException();
    validateContract(action === 'register' ? 'RegisterRequest' : 'LoginRequest', {
      ...b,
      ...(typeof b?.name === 'string' ? { name: b.name.trim() } : {}),
      ...(typeof b?.email === 'string' ? { email: b.email.trim() } : {}),
    });
    const result = await this.service.login(b, action === 'register');
    res.cookie('booking_session', result.token, { httpOnly: true, secure: !!process.env.VERCEL || process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 3600000 });
    return { user: result.user, access_token: result.token, token_type: 'Bearer', expires_in: 3600 };
  }
  @Get('auth/me')
  @ApiCookieAuth()
  async me(@Req() req: any) { return this.service.auth(req); }
  @Get('catalog')
  async catalog(@Query() query: AccommodationFilterDto) { return wrap(await this.service.catalog(false, query.nombre)); }
  @Get('catalog/:id')
  @ApiOperation({ summary: 'Consultar un alojamiento publicado por identificador' })
  @ApiNotFoundResponse({ description: 'Alojamiento inexistente o despublicado' })
  async catalogHotel(@Param('id', ParseIntPipe) id: number) {
    const h = await this.service.hotel(this.service.database.db.manager, id);
    if (!h.published) throw new NotFoundException('Alojamiento no publicado');
    return wrap(h);
  }
  @Get('cities')
  async cities() { return wrap(await this.service.database.db.manager.find<any>('cities')); }
  @Get('admin/accommodations')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Listar alojamientos administrativos con filtro por nombre' })
  async adminHotels(@Req() req: any, @Query() query: AccommodationFilterDto) { await this.service.auth(req, true); return wrap(await this.service.catalog(true, query.nombre)); }
  @Get('admin/accommodations/:id')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Consultar un alojamiento administrativo por ID' })
  @ApiOkResponse({ description: 'Detalle y enlaces de acciones administrativas' })
  @ApiBadRequestResponse({ description: 'ID inválido' })
  @ApiNotFoundResponse({ description: 'Alojamiento no encontrado' })
  async adminHotel(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    await this.service.auth(req, true);
    const h = await this.service.hotel(this.service.database.db.manager, id);
    const url = '/api/v1/admin/accommodations/' + h.id;
    return { ...h, _links: { self: { href: url, method: 'GET' }, replace: { href: url, method: 'PUT' }, update: { href: url, method: 'PATCH' }, delete: { href: url, method: 'DELETE' } } };
  }
  @Post('admin/accommodations')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Crear alojamiento con validación DTO y cabecera Location' })
  @ApiCreatedResponse({ description: 'Alojamiento creado', headers: { Location: { description: 'URI del recurso creado', schema: { type: 'string' } } } })
  @ApiBadRequestResponse({ description: 'Cuerpo inválido' })
  async create(@Body() b: AdminAccommodationDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const h = await this.service.saveHotel(b, await this.service.auth(req, true));
    res.setHeader('Location', '/api/v1/admin/accommodations/' + h.id);
    return h;
  }
  @Put('admin/accommodations/:id')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Reemplazar los datos editables del alojamiento; todos los campos son obligatorios' })
  @ApiNoContentResponse({ description: 'Reemplazo completado sin cuerpo' })
  @ApiBadRequestResponse({ description: 'Faltan campos requeridos o ID inválido' })
  @ApiNotFoundResponse({ description: 'Alojamiento no encontrado; PUT no crea recursos' })
  @HttpCode(204)
  async replace(@Param('id', ParseIntPipe) id: number, @Body() b: AdminAccommodationDto, @Req() req: any) {
    await this.service.saveHotel(b, await this.service.auth(req, true), id);
  }
  @Patch('admin/accommodations/:id')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Actualizar únicamente los campos enviados, conservando el resto' })
  @ApiOkResponse({ description: 'Alojamiento actualizado' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() b: PatchAccommodationDto, @Req() req: any) { return this.service.saveHotel(b, await this.service.auth(req, true), id); }
  @Delete('admin/accommodations/:id')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Eliminar alojamiento sin historial; 409 si debe conservarse' })
  @ApiNoContentResponse({ description: 'Eliminado sin cuerpo' })
  @HttpCode(204)
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: any) { await this.service.deleteHotel(id, await this.service.auth(req, true)); }
  @Get('admin/:resource')
  async adminData(@Param('resource') resource: string, @Req() req: any) {
    await this.service.auth(req, true);
    const table = { events: 'outbox_events', audit: 'audit_logs', orders: 'orders' }[resource];
    if (!table) throw new NotFoundException();
    const data = await this.service.database.db.manager.find<any>(table);
    return wrap(resource === 'orders' ? data.map(o => this.service.orderView(o)) : data);
  }
  @Get('orders')
  async orders(@Req() req: any) { const user = await this.service.auth(req); if(user.role==='admin')throw new ForbiddenException('El administrador consulta las reservas desde el panel de gestión'); return wrap((await this.service.database.db.manager.findBy<any>('orders', { ownerId: user.id })).map(o => this.service.orderView(o))); }
  @Get('orders/:id')
  async order(@Param('id') id: string, @Req() req: any) { return this.service.orderView(await this.service.ownOrder(this.service.database.db.manager, id, await this.service.auth(req))); }
  @Post('orders/preview')
  @HttpCode(200)
  async preview(@Body() b: any, @Req() req: any) { validateContract('OrderPreviewRequest', b); return this.service.preview(b, await this.service.auth(req)); }
  @Post('orders/create')
  async createOrder(@Body() b: any, @Req() req: any, @Headers('idempotency-key') key: string) { validateContract('OrderCreateRequest', b); return this.service.mutateOrder('create', '', b, key, await this.service.auth(req)); }
  @Post('orders/:id/modify')
  @HttpCode(200)
  async changeOrder(@Param('id') id: string, @Body() b: any, @Req() req: any, @Headers('idempotency-key') key: string) {
    validateContract('OrderModifyRequest', b);
    return this.service.mutateOrder('modify', id, b || {}, key, await this.service.auth(req));
  }
  @Post('orders/:id/cancel')
  @HttpCode(200)
  async cancelOrder(@Param('id') id: string, @Body() b: any, @Req() req: any, @Headers('idempotency-key') key: string) {
    return this.service.mutateOrder('cancel', id, b || {}, key, await this.service.auth(req));
  }
  @Get('webhooks')
  async webhooks(@Req() req: any) { const u = await this.service.auth(req, true); return (await this.service.database.db.manager.findBy<any>('webhook_subscriptions', { ownerId: u.id })).map(({ secret: _secret, ...rest }) => rest); }
  @Post('webhooks')
  async subscribe(@Body() b: any, @Req() req: any) {
    validateContract('WebhookSubscription', b);
    const u = await this.service.auth(req, true);
    if (!b.url.startsWith('https://') || !b.events.length || !b.secret || b.secret.length < 16) throw new BadRequestException('HTTPS, eventos y secreto de 16 caracteres requeridos');
    return this.service.database.transaction(async em => {
      if (await em.findOneBy<any>('webhook_subscriptions', { id: b.id })) throw new BadRequestException('Suscripción existente');
      await em.save<any, any>('webhook_subscriptions', { id: b.id, ownerId: u.id, url: b.url, events: b.events, secret: b.secret });
      return { id: b.id, url: b.url, events: b.events };
    });
  }
  @Delete('webhooks/:id')
  @HttpCode(204)
  async unsubscribe(@Param('id') id: string, @Req() req: any) { const u = await this.service.auth(req, true); await this.service.database.db.manager.delete('webhook_subscriptions', { id, ownerId: u.id }); }
  @Post('reviews/scores')
  @HttpCode(200)
  async scores(@Body() b: any) { validateContract('ReviewsScoresRequest', b); const hotels = await this.service.catalog(); return wrap(hotels.filter(h => b.accommodations.includes(h.id)).map(h => ({ accommodation: h.id, score: h.score, count: h.reviews.length }))); }
  @Post('details/changes')
  @HttpCode(200)
  async changes(@Body() b: any, @Req() req: any) {
    validateContract('DetailsChangesRequest', b); await this.service.auth(req);
    const hotels = (await this.service.catalog(true)).filter(h => h.updatedAt >= b.last_change && (!b.filters?.cities || b.filters.cities.includes(h.cityId)) && (!b.filters?.countries || b.filters.countries.includes('ec')));
    return wrap({ from: b.last_change, next: new Date().toISOString(), total_changes: hotels.length, changes: { accommodations: hotels.map(h => ({ id: h.id, updated_at: h.updatedAt, published: h.published })) } });
  }
  @Post(':action')
  @HttpCode(200)
  @ApiOperation({ summary: 'Operaciones públicas definidas en el contrato API-first' })
  async publicAction(@Param('action') action: string, @Body() b: any, @Headers('x-device-fingerprint') fingerprint: string,@Req() req:any) {
    b = b || {};
    const schemas = { search: 'SearchAccommodationRequest', availability: 'AvailabilityRequest', 'bulk-availability': 'BulkAvailabilityRequest', details: 'AccommodationDetailsRequest', constants: 'ConstantsRequest', reviews: 'ReviewsRequest' };
    if (schemas[action]) validateContract(schemas[action], b);
    const em = this.service.database.db.manager;
    const user=['search','availability','bulk-availability'].includes(action)&&(req.headers.authorization||req.headers.cookie?.includes('booking_session='))?await this.service.auth(req):undefined;
    if (action === 'search') { if (!fingerprint) throw new BadRequestException('X-Device-Fingerprint es obligatorio'); return this.service.search(b,user); }
    if (action === 'availability') return this.service.database.transaction(tx => this.service.availability(b, tx,user));
    if (action === 'bulk-availability') return this.service.database.transaction(async tx => wrap(await Promise.all(b.accommodations.map(async accommodation => (await this.service.availability({ ...b, accommodation }, tx,user)).data))));
    if (action === 'details') return wrap((await this.service.catalog()).filter(h => (!b.accommodations || b.accommodations.includes(h.id)) && (!b.city || b.city === h.cityId) && (!b.country || b.country === 'ec')));
    if (action === 'chains') return wrap((await em.find<any>('chains')).map(c => ({ ...c, brands: [] })));
    if (action === 'constants') return wrap({ cities: await em.find<any>('cities'), facilities: await em.find<any>('facilities'), room_types: ['Habitación estándar'], currency: ['USD'] });
    if (action === 'reviews') return wrap((await this.service.catalog()).filter(h => b.accommodations.includes(h.id)).flatMap(h => h.reviews));
    throw new NotFoundException('Operación no encontrada');
  }
}
