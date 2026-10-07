// Contrato diseñado para Kawsay Estancias; no se obtiene de controladores ni del YAML de la plantilla.
// Ejecutar solo al crear una nueva revisión del contrato y revisar el diff antes de publicarlo.
const fs = require('node:fs');
const { stringify } = require('yaml');
const ref = name => ({ $ref: '#/components/schemas/' + name });
const str = extra => ({ type: 'string', ...extra });
const integer = extra => ({ type: 'integer', ...extra });
const array = items => ({ type: 'array', items });
const object = (properties, required = [], extra = {}) => ({ type: 'object', ...(required.length ? { required } : {}), properties, ...extra });
const uuid = str({ format: 'uuid' });
const date = str({ format: 'date' });
const money = { type: 'number', minimum: 0 };
const id = integer({ minimum: 1 });
const language = array(str());
const currency = str({ enum: ['USD'], default: 'USD' });
const personName = str({ minLength: 2, maxLength: 100, pattern: "^[\\p{L}\\p{M}]+(?:[ '\\-][\\p{L}\\p{M}]+)*$", description: 'Nombre personal: letras, tildes, espacios, apóstrofes y guiones. Sin números.' });
const envelope = data => object({ request_id: uuid, data, next_page: str({ nullable: true }) }, ['request_id', 'data', 'next_page']);
const stay = { booker: ref('Booker'), checkin: date, checkout: date, guests: ref('AccommodationsGuests'), currency };
const schemas = {
  Booker: object({ country: str({ pattern: '^[a-z]{2}$' }), platform: str({ enum: ['desktop', 'mobile', 'android', 'ios', 'tablet'] }) }, ['country', 'platform']),
  AccommodationsGuests: object({ number_of_adults: integer({ minimum: 1, maximum: 100 }), number_of_rooms: integer({ minimum: 1 }), children: array(integer({ minimum: 0, maximum: 17 })) }, ['number_of_adults', 'number_of_rooms']),
  SearchAccommodationRequest: object({ ...stay, city: id, country: str({ enum: ['ec'] }), extras: array(str()), rows: integer({ minimum: 10, maximum: 100, default: 100 }), page: str() }, ['booker', 'checkin', 'checkout', 'guests']),
  AvailabilityRequest: object({ ...stay, accommodation: id, extras: array(str()) }, ['accommodation', 'booker', 'checkin', 'checkout', 'guests']),
  BulkAvailabilityRequest: object({ ...stay, accommodations: array(id), filters: object({ meal_plan: str(), cancellation_type: str() }), extras: array(str()) }, ['accommodations', 'booker', 'checkin', 'checkout', 'guests']),
  AccommodationDetailsRequest: object({ accommodations: array(id), city: id, country: str(), extras: array(str()), languages: language }),
  DetailsChangesRequest: object({ last_change: str({ format: 'date-time' }), filters: object({ countries: array(str()), cities: array(id) }) }, ['last_change']),
  ConstantsRequest: object({ languages: language, constants: array(str()) }),
  ReviewsRequest: object({ accommodations: array(id), languages: language, page: str(), rows: integer() }, ['accommodations']),
  ReviewsScoresRequest: object({ accommodations: array(id), languages: language }, ['accommodations']),
  OrderPreviewRequest: object({ accommodation_id: id, product_id: uuid, guests: ref('AccommodationsGuests') }, ['accommodation_id', 'product_id', 'guests']),
  CustomerDetails: object({ first_name: str({ minLength: 1, maxLength: 100 }), last_name: str({ minLength: 1, maxLength: 100 }), email: str({ format: 'email', maxLength: 254 }) }, ['first_name', 'last_name', 'email']),
  OrderCreateRequest: object({ order_preview_id: uuid, payment_reference: str({ pattern: '^DEMO-', description: 'Referencia de pago simulado; el prototipo no cobra dinero.' }), customer_details: ref('CustomerDetails') }, ['order_preview_id', 'payment_reference', 'customer_details']),
  OrderModifyRequest: object({ checkin: date, checkout: date, guests: ref('AccommodationsGuests') }),
  RegisterRequest: object({ name: personName, email: str({ format: 'email', maxLength: 254 }), password: str({ minLength: 10, maxLength: 128, writeOnly: true }) }, ['name', 'email', 'password']),
  LoginRequest: object({ email: str({ format: 'email', maxLength: 254 }), password: str({ minLength: 10, maxLength: 128, writeOnly: true }) }, ['email', 'password']),
  User: object({ id: uuid, name: str(), email: str({ format: 'email' }), role: str({ enum: ['admin', 'customer'] }) }, ['id', 'name', 'email', 'role']),
  AuthResponse: object({ user: ref('User'), access_token: str(), token_type: str({ enum: ['Bearer'] }), expires_in: integer({ example: 3600 }) }, ['user', 'access_token', 'token_type', 'expires_in']),
  Accommodation: object({ id, nombre: str(), cityId: id, destino: str(), descripcion: str(), direccion: str(), tipo: str(), image: str({ format: 'uri' }), published: { type: 'boolean' }, precioPorNoche: money, capacidadAdultos: integer(), capacidadNinos: integer(), habitaciones: integer(), facilities: array(str()) }, ['id', 'nombre']),
  AvailabilityProduct: object({ id: uuid, total_price: money, price_per_night: money, nights: integer(), rooms: integer(), cancellation: str(), expires_at: str({ format: 'date-time' }), desglose: array(object({})) }, ['id', 'total_price', 'nights', 'rooms', 'expires_at']),
  Availability: object({ id, available: { type: 'boolean' }, available_rooms: integer({ minimum: 0 }), motivo: str({ nullable: true }), currency, products: array(ref('AvailabilityProduct')), url: str() }, ['id', 'available', 'available_rooms', 'products']),
  Quote: object({ order_preview_id: uuid, total_price: money, currency, expires_at: str({ format: 'date-time' }), checkin: date, checkout: date, nights: integer() }, ['order_preview_id', 'total_price', 'expires_at', 'checkin', 'checkout']),
  Reservation: object({ order_id: uuid, locator: str({ pattern: '^BP-[A-F0-9]{8}$', description: 'Código de reserva visible en la confirmación y Mis reservas.', example: 'BP-41A92454' }), status: str({ enum: ['CONFIRMED', 'CANCELLED'] }), accommodation_details: object({ id }, ['id']), checkin: date, checkout: date, guests: ref('AccommodationsGuests'), customer_details: ref('CustomerDetails'), total_price: money, currency, creation_date: str({ format: 'date-time' }), estancia_estado: str({ enum: ['CONFIRMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA'] }), puede_resenar: { type: 'boolean' }, _links: object({ self: str(), modify: str(), cancel: str() }) }, ['order_id', 'locator', 'status', 'accommodation_details', 'checkin', 'checkout', 'guests', 'total_price', 'currency', 'creation_date']),
  Problem: object({ type: str(), title: str(), status: integer(), detail: { oneOf: [str(), array(str())] }, instance: str(), errors: array(object({})) }, ['type', 'title', 'status', 'detail', 'instance']),
  WebhookSubscription: object({ id: uuid, url: str({ format: 'uri', pattern: '^https://' }), events: array(str({ enum: ['ORDER_CONFIRMED', 'ORDER_CANCELLED'] })), secret: str({ minLength: 16, writeOnly: true }) }, ['id', 'url', 'events', 'secret']),
  WebhookView: object({ id: uuid, url: str({ format: 'uri' }), events: array(str()) }, ['id', 'url', 'events']),
  OutboxEvent: object({ id: uuid, eventType: str({ enum: ['ORDER_CONFIRMED', 'ORDER_CANCELLED', 'ORDER_MODIFIED'] }), resourceId: uuid, timestamp: str({ format: 'date-time' }), data: ref('Reservation'), status: str({ enum: ['PENDING', 'PROCESSED'] }) }, ['id', 'eventType', 'resourceId', 'timestamp', 'data', 'status']),
  AccommodationList: envelope(array(ref('Accommodation'))),
  AvailabilityResponse: envelope(ref('Availability')),
  QuoteResponse: envelope(ref('Quote')),
  ReservationList: envelope(array(ref('Reservation'))),
  EventList: envelope(array(ref('OutboxEvent'))),
};
const error = description => ({ description, content: { 'application/problem+json': { schema: ref('Problem') } } });
const responses = { ProblemDetails400: error('Solicitud inválida según el contrato o las reglas del dominio.'), ProblemDetails401: error('Sesión ausente o vencida.'), ProblemDetails403: error('Permisos insuficientes.'), ProblemDetails404: error('Recurso inexistente o no accesible.'), ProblemDetails409: error('Fechas ocupadas, cotización vencida o clave idempotente reutilizada con otro contenido.'), ProblemDetails429: error('Límite de intentos de autenticación alcanzado.') };
const paths = {};
const pathId = (name, schema = uuid) => ({ name, in: 'path', required: true, schema });
const idempotency = { name: 'Idempotency-Key', in: 'header', required: true, schema: uuid, description: 'UUID v4. Repetir la misma clave y cuerpo devuelve la misma reserva; cambiar el cuerpo produce 409.' };
function operation(path, method, summary, input, output, options = {}) {
  const { status = 200, public: isPublic = false, parameters = [], description = '', tag = 'Alojamientos' } = options;
  const result = { operationId: method + path.replace(/[\/{}-]/g, '_'), tags: [tag], summary, description, ...(isPublic ? { security: [] } : {}), ...(parameters.length ? { parameters } : {}), ...(input ? { requestBody: { required: true, content: { 'application/json': { schema: ref(input) } } } } : {}), responses: { [status]: { description: status === 204 ? 'Operación completada sin cuerpo.' : 'Operación completada.', ...(output ? { content: { 'application/json': { schema: typeof output === 'string' ? ref(output) : output } } } : {}) }, '400': { $ref: '#/components/responses/ProblemDetails400' }, '409': { $ref: '#/components/responses/ProblemDetails409' }, ...(!isPublic ? { '401': { $ref: '#/components/responses/ProblemDetails401' }, '403': { $ref: '#/components/responses/ProblemDetails403' } } : {}) } };
  paths[path] ||= {};
  paths[path][method] = result;
}
operation('/search', 'post', 'Buscar estancias disponibles en Ecuador', 'SearchAccommodationRequest', 'AccommodationList', { public: true, parameters: [{ name: 'X-Device-Fingerprint', in: 'header', required: true, schema: str() }], description: 'Una reserva confirmada bloquea todo el alojamiento para cualquiera durante las noches [checkin, checkout). Las reservas canceladas liberan las noches.' });
operation('/availability', 'post', 'Consultar noches libres y precio calculado por el servidor', 'AvailabilityRequest', 'AvailabilityResponse', { public: true, description: 'Si hay solapamiento, available=false, available_rooms=0 y products=[]. Los productos disponibles vencen a los 15 minutos.' });
operation('/bulk-availability', 'post', 'Consultar disponibilidad de varias estancias', 'BulkAvailabilityRequest', envelope(array(ref('Availability'))), { public: true });
operation('/details', 'post', 'Consultar información de alojamientos', 'AccommodationDetailsRequest', 'AccommodationList', { public: true });
operation('/details/changes', 'post', 'Consultar cambios de catálogo para sincronizar otro sistema', 'DetailsChangesRequest', envelope(object({ from: str({ format: 'date-time' }), next: str({ format: 'date-time' }), total_changes: integer(), changes: object({ accommodations: array(object({ id, updated_at: str({ format: 'date-time' }), published: { type: 'boolean' } })) }) })));
operation('/constants', 'post', 'Consultar catálogos y moneda admitida', 'ConstantsRequest', envelope(object({})), { public: true });
operation('/chains', 'post', 'Consultar catálogo preliminar de cadenas', null, envelope(array(object({}))), { public: true });
operation('/reviews', 'post', 'Consultar reseñas públicas', 'ReviewsRequest', envelope(array(object({}))), { public: true });
operation('/reviews/scores', 'post', 'Consultar puntuaciones de alojamientos', 'ReviewsScoresRequest', envelope(array(object({}))), { public: true });
operation('/orders/preview', 'post', 'Cotizar una reserva antes de confirmarla', 'OrderPreviewRequest', 'QuoteResponse', { tag: 'Reservas', description: 'Solo viajeros. La cotización pertenece al usuario y vence a los 10 minutos.' });
operation('/orders/create', 'post', 'Confirmar reserva y obtener su código', 'OrderCreateRequest', 'Reservation', { status: 201, tag: 'Reservas', parameters: [idempotency], description: 'Revalida las noches dentro de la transacción. Guarda reserva, factura, respuesta idempotente y evento ORDER_CONFIRMED. El campo locator es el código de reserva. El pago es simulado.' });
operation('/orders', 'get', 'Consultar Mis reservas', null, 'ReservationList', { tag: 'Reservas' });
operation('/orders/{orderId}', 'get', 'Consultar una reserva propia o con rol administrador', null, 'Reservation', { tag: 'Reservas', parameters: [pathId('orderId')] });
operation('/orders/{orderId}/modify', 'post', 'Modificar fechas sin solaparse con otra reserva', 'OrderModifyRequest', 'Reservation', { tag: 'Reservas', parameters: [pathId('orderId'), idempotency] });
operation('/orders/{orderId}/cancel', 'post', 'Cancelar y liberar las noches reservadas', null, 'Reservation', { tag: 'Reservas', parameters: [pathId('orderId'), idempotency] });
operation('/auth/register', 'post', 'Crear una cuenta de viajero', 'RegisterRequest', 'AuthResponse', { public: true, status: 201, tag: 'Identidad' });
operation('/auth/login', 'post', 'Iniciar sesión con JWT y cookie HttpOnly', 'LoginRequest', 'AuthResponse', { public: true, status: 201, tag: 'Identidad' });
operation('/auth/me', 'get', 'Consultar la identidad autenticada', null, 'User', { tag: 'Identidad' });
operation('/auth/logout', 'post', 'Cerrar sesión y revocar el token', null, object({ ok: { type: 'boolean' } }), { status: 201, tag: 'Identidad' });
operation('/catalog', 'get', 'Consultar catálogo público', null, 'AccommodationList', { public: true, parameters: [{ name: 'nombre', in: 'query', schema: str() }] });
operation('/catalog/{id}', 'get', 'Consultar un alojamiento publicado', null, envelope(ref('Accommodation')), { public: true, parameters: [pathId('id', id)] });
operation('/cities', 'get', 'Consultar destinos de Ecuador', null, envelope(array(object({ id, name: str(), country: str() }))), { public: true });
operation('/admin/events', 'get', 'Consultar eventos outbox para demostrar integración futura', null, 'EventList', { tag: 'Integración futura', description: 'Solo administrador. Consulta técnica: los eventos están persistidos. No existe todavía un worker de entrega automática. El catálogo puede generar otros tipos de eventos.' });
// Los eventos de inicialización del catálogo comparten la tabla outbox.
schemas.OutboxEvent.properties.eventType = str({ example: 'ORDER_CONFIRMED', description: 'Eventos de reservas o de inicialización del catálogo.' });
schemas.OutboxEvent.properties.resourceId = str();
schemas.OutboxEvent.properties.data = object({});
operation('/webhooks', 'get', 'Consultar suscripciones sin revelar secretos', null, array(ref('WebhookView')), { tag: 'Integración futura' });
operation('/webhooks', 'post', 'Registrar un destino para futura entrega de eventos', 'WebhookSubscription', 'WebhookView', { status: 201, tag: 'Integración futura', description: 'Solo administrador. Guarda una suscripción HTTPS y su secreto. Esta versión no envía solicitudes al destino registrado.' });
operation('/webhooks/{id}', 'delete', 'Eliminar una suscripción', null, null, { status: 204, tag: 'Integración futura', parameters: [pathId('id')] });
const contract = {
  openapi: '3.0.3',
  info: { title: 'Kawsay Estancias API — contrato propio', version: '1.2.0', description: 'Contrato propio del dominio de alojamientos de Kawsay Estancias. Es la fuente de esquemas para validación AJV y documentación del núcleo REST. Conserva nombres de operaciones compatibles con la plantilla académica, con modelos y reglas del proyecto: Ecuador, USD, reservas sin solapamientos, código de reserva, JWT revocable, idempotencia y outbox. Las extensiones administrativas se documentan adicionalmente mediante DTO de NestJS. No hay cobros reales ni entrega automática de webhooks.', 'x-origin': 'Diseñado para Kawsay Estancias; la plantilla se conserva por separado como referencia académica.' },
  servers: [{ url: '/api/v1', description: 'API del despliegue desde el que se abre el contrato' }, { url: 'https://booking-prototipo-alojamientos.vercel.app/api/v1', description: 'Producción actual de Kawsay Estancias' }],
  security: [{ bearer: [] }, { cookie: [] }],
  tags: [{ name: 'Alojamientos' }, { name: 'Reservas' }, { name: 'Identidad' }, { name: 'Integración futura' }],
  'x-business-rules': { occupancy: 'Una reserva confirmada bloquea el alojamiento completo en [checkin, checkout).', cancellation: 'Cancelar libera las noches. Se permite otra estancia desde la fecha de salida.', currency: 'USD', payment: 'Simulado; referencias DEMO-.', authentication: 'JWT HS256 de una hora con sesión revocable. OAuth2 externo es futuro.', outbox: 'Reserva y evento se guardan en la misma transacción. El worker de entrega es futuro.' },
  paths, components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, cookie: { type: 'apiKey', in: 'cookie', name: 'booking_session' } }, schemas, responses },
};
fs.writeFileSync('contracts/kawsay-estancias-openapi.yaml', '# Contrato propio de Kawsay Estancias. Revisar este contrato antes de cambiar el núcleo REST.\n' + stringify(contract, { aliasDuplicateObjects: false }));
console.log('Contrato propio escrito: ' + Object.keys(paths).length + ' rutas y ' + Object.keys(schemas).length + ' esquemas.');
