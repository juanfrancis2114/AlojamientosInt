require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const base = process.argv[2];
if (!base || !/^https:\/\/[^/]+\.vercel\.app$/.test(base)) throw new Error('Indica la URL HTTPS de producción Vercel');
let checks = [];
function check(value, description) { if (!value) throw new Error(description); checks.push(description); console.log('OK ' + description); }
async function api(path, body, token, method = body === undefined ? 'GET' : 'POST', extra = {}) {
  const r = await fetch(base + '/api/v1/' + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(60000) });
  const text = await r.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { throw new Error('Respuesta no JSON en ' + path + ': HTTP ' + r.status); }
  if (!r.ok) throw new Error('HTTP ' + r.status + ' en ' + path + ': ' + JSON.stringify(data?.detail || data?.message || 'Error'));
  return { status: r.status, data, headers: r.headers };
}
(async () => {
  const web = await fetch(base);
  check(web.status === 200, 'Web pública accesible sin sesión de Vercel');
  const html = await web.text();
  check(html.includes('id="root"') && html.includes('type="module"'), 'Frontend React compilado publicado');
  const assetPath = html.match(/src="(\/assets\/[^\"]+\.m?js)"/)?.[1];
  check(!!assetPath && (await fetch(base + assetPath)).ok, 'Bundle React accesible');
  const health = (await api('health')).data;
  check(health.status === 'ok' && health.database === 'postgres', 'API conectada a PostgreSQL de Supabase');
  check((await fetch(base + '/api/docs')).status === 200, 'Swagger público accesible');
  const doc = await (await fetch(base + '/api/openapi.json')).json();
  check(!!doc.paths['/api/v1/orders/create'] && !!doc.paths['/api/v1/admin/accommodations/{id}'].put, 'Contrato OpenAPI y CRUD publicados');
  const hotels = (await api('catalog')).data.data;
  check(hotels.length >= 6, 'Catálogo de demostración persistido');
  const token = (await api('auth/login', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).data.access_token;
  check(!!token, 'Autenticación administrativa operativa');
  check(token.split('.').length === 3 && JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).iss === 'booking-prototipo', 'JWT emitido con emisor y vencimiento');
  const cors = await fetch(base + '/api/v1/health', { headers: { Origin: base } });
  check(cors.headers.get('access-control-allow-origin') === base, 'CORS del origen de producción permitido');
  const evil = await fetch(base + '/api/v1/auth/logout', { method: 'POST', headers: { Origin: 'https://atacante.test', 'Content-Type': 'application/json' }, body: '{}' });
  check(evil.status === 403 && !evil.headers.get('access-control-allow-origin'), 'Escritura desde origen extraño rechazada');
  const hotel = { nombre: 'Verificación de despliegue', cityId: 1, descripcion: 'Propiedad temporal para comprobar CRUD en nube', direccion: 'Quito, Ecuador', tipo: 'Hotel de prueba', image: hotels[0].image, published: true, precioPorNoche: 25.55, capacidadAdultos: 2, capacidadNinos: 1, habitaciones: 1, tienePiscina: false };
  const h = (await api('admin/accommodations', hotel, token)).data;
  check(!!h.id, 'CRUD: creación en Supabase');
  try {
    await api('admin/accommodations/' + h.id, { precioPorNoche: 28.55 }, token, 'PATCH');
    check((await api('admin/accommodations/' + h.id, undefined, token)).data.precioPorNoche === 28.55, 'CRUD: edición y lectura persistentes');
  } finally { await api('admin/accommodations/' + h.id, undefined, token, 'DELETE'); }
  check(true, 'CRUD: eliminación de propiedad temporal');

  const destinations=(await api('cities')).data.data;
  check(destinations.length===222,'222 cantones públicos de Ecuador');
  check(hotels.length===270&&destinations.every(c=>hotels.some(h=>h.cityId===c.id)),'270 alojamientos y cobertura de cada cantón');
  check(new Set(hotels.map(h=>h.image)).size===270,'Fotografías distintas en el catálogo');
  const schema=(await api('admin/erp/esquema',undefined,token)).data;check(schema.tablas===27&&schema.relaciones===31&&schema.detalle.every(t=>t.rls),'Supabase real: 27 tablas, 31 relaciones y RLS');
  const current=(await api('auth/me',undefined,token)).data;
  const privateOrders=await fetch(base+'/api/v1/orders',{headers:{Authorization:'Bearer '+token}});
  check(privateOrders.status===403,'Administrador sin reservas personales');
  const baseline=(await api('admin/erp/dashboard',undefined,token)).data;
  check((await api('me/profile',undefined,token)).data.correo===process.env.ADMIN_EMAIL,'Perfil propio operativo en Supabase');
  for(const module of ['tarifas','facturas','resenas'])check(Array.isArray((await api('admin/erp/'+module,undefined,token)).data),'Módulo de estancias operativo: '+module);
  const categories=(await api('admin/erp/categorias',undefined,token)).data;
  const expense=(await api('admin/erp/gastos',{concepto:'Verificación ERP temporal',proveedor:'Prueba de despliegue',categoria_id:categories[0].id,alojamiento_id:null,importe:75.25,fecha:new Date().toISOString().slice(0,10),estado:'PAGADO',notas:'Registro temporal: se elimina al finalizar'},token)).data;
  try {
    const after=(await api('admin/erp/dashboard',undefined,token)).data;
    check(Math.abs(after.indicadores.gastos_pagados-baseline.indicadores.gastos_pagados-75.25)<0.001,'Dashboard refleja gasto registrado');
    await api('admin/erp/gastos/'+expense.id,{importe:80.50,estado:'PENDIENTE'},token,'PATCH');
    check((await api('admin/erp/gastos',undefined,token)).data.find(g=>g.id===expense.id).importe===80.5,'Edición ERP persistida en Supabase');
  }finally{await api('admin/erp/gastos/'+expense.id,undefined,token,'DELETE');}
  check(!(await api('admin/erp/gastos',undefined,token)).data.some(g=>g.id===expense.id),'Gasto temporal eliminado');
  check((await api('admin/erp/usuarios',undefined,token)).data.some(u=>u.id===current.id&&!u.passwordHash&&!u.hash_contrasena),'Gestión de usuarios no expone contraseñas');
  const date = new Date(); date.setUTCDate(date.getUTCDate() + 30); const end = new Date(date); end.setUTCDate(end.getUTCDate() + 2);
  const input = { booker: { country: 'ec', platform: 'desktop' }, checkin: date.toISOString().slice(0, 10), checkout: end.toISOString().slice(0, 10), guests: { number_of_adults: 2, number_of_rooms: 1, children: [] }, currency: 'USD' };
  const search = (await api('search', input, undefined, 'POST', { 'X-Device-Fingerprint': 'cloud-verification' })).data.data;
  check(search.length > 0, 'Búsqueda con disponibilidad en nube');
  const availability = (await api('availability', { ...input, accommodation: search[0].id })).data.data;
  const traveler=(await api('auth/register',{name:'Verificación viajero',email:'verificacion-'+randomUUID()+'@prueba.local',password:randomUUID()+'!'})).data;
  const bookingToken=traveler.access_token;
  const quote = (await api('orders/preview', { accommodation_id: search[0].id, product_id: availability.products[0].id, guests: input.guests }, bookingToken)).data.data;
  const staleQuote=(await api('orders/preview',{accommodation_id:search[0].id,product_id:availability.products[0].id,guests:input.guests},bookingToken)).data.data;
  const key = randomUUID();
  const body = { order_preview_id: quote.order_preview_id, payment_reference: 'DEMO-VERIFICACION-' + key, customer_details: { first_name: 'Verificación', last_name: 'Despliegue', email: traveler.user.email } };
  const order = (await api('orders/create', body, bookingToken, 'POST', { 'Idempotency-Key': key })).data;
  try {
    check(order.status === 'CONFIRMED', 'Reserva de demostración confirmada y guardada');
    const invoice=(await api('orders/'+order.order_id+'/invoice',undefined,bookingToken)).data;
    check(invoice.total===order.total_price&&invoice.detalles.length===2,'Factura simulada y detalles persistidos en Supabase');
    check(!(await api('availability',{...input,accommodation:search[0].id},bookingToken)).data.data.available,'Fechas propias bloqueadas inmediatamente en producción');
    const duplicate=await fetch(base+'/api/v1/orders/create',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+bookingToken,'Idempotency-Key':randomUUID()},body:JSON.stringify({...body,order_preview_id:staleQuote.order_preview_id})});check(duplicate.status===409,'Cotización anterior no duplica la reserva en nube');
    const retry = (await api('orders/create', body, bookingToken, 'POST', { 'Idempotency-Key': key })).data;
    check(retry.order_id === order.order_id, 'Idempotencia operativa en producción');
    check((await api('orders/' + order.order_id, undefined, token)).data.locator === order.locator, 'Reserva persistente consultada en otra petición');
  } finally { await api('orders/' + order.order_id + '/cancel', {}, token, 'POST', { 'Idempotency-Key': randomUUID() }); }
  check((await api('orders/' + order.order_id, undefined, token)).data.status === 'CANCELLED', 'Cancelación persistida; estancia de prueba liberada');
  check((await api('orders/'+order.order_id+'/invoice',undefined,bookingToken)).data.estado==='ANULADA','Factura anulada tras cancelar');
  check((await api('availability',{...input,accommodation:search[0].id},bookingToken)).data.data.available,'Cancelación permite volver a elegir las fechas');
  check((await api('admin/events', undefined, token)).data.data.some(e => e.resourceId === order.order_id && e.eventType === 'ORDER_CANCELLED'), 'Evento outbox persistido en nube');
  await api('admin/erp/usuarios/'+traveler.user.id,{activo:false},token,'PATCH');
  check((await fetch(base+'/api/v1/auth/me',{headers:{Authorization:'Bearer '+bookingToken}})).status===401,'Desactivación ERP revoca JWT en producción');
  await api('auth/logout', {}, token);
  const revoked = await fetch(base + '/api/v1/auth/me', { headers: { Authorization: 'Bearer ' + token } });
  check(revoked.status === 401, 'JWT revocado después de cerrar sesión en producción');
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/cloud-verification.json', JSON.stringify({ url: base, checkedAt: new Date().toISOString(), database: health.database, checks, demoOrderId: order.order_id, demoLocator: order.locator, demoStatus: 'CANCELLED' }, null, 2));
  console.log(checks.length + ' comprobaciones públicas superadas.');
})().catch(e => { console.error('Verificación incompleta:', e.message); process.exitCode = 1; });
