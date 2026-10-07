import { randomUUID, randomBytes, scryptSync } from 'crypto';
import { EntityManager } from 'typeorm';
import { ecuadorCities } from './ecuador-data';
export const hashPassword = (password: string, salt = randomBytes(16).toString('hex')) => salt + ':' + scryptSync(password, salt, 64).toString('hex');
export async function seed(em: EntityManager) {
  const now = new Date().toISOString();
  if (!await em.count('categorias_gasto')) await em.insert('categorias_gasto', ['Mantenimiento','Limpieza','Servicios básicos','Marketing','Personal','Suministros','Otros'].map(nombre=>({nombre})));
  if (!await em.count('cities')) {
    for (const [i, name] of ['Quito', 'Cuenca', 'Baños', 'Manta', 'Galápagos', 'Guayaquil'].entries()) await em.save<any, any>('cities', { id: i + 1, name, country: 'ec' });
    for (const [i, name] of ['WiFi', 'Piscina', 'Desayuno', 'Estacionamiento', 'Spa', 'Pet friendly'].entries()) await em.save<any, any>('facilities', { id: i + 1, name });
    await em.save<any, any>('chains', { name: 'Estancias independientes' });
  }
  const baseCodes=['1701','0101','1802','1308','2003','0901'];
  for (let i=0;i<baseCodes.length;i++) {
    const city=await em.findOneBy<any>('cities',{id:i+1});
    const metadata=ecuadorCities.find(c=>c.code===baseCodes[i]);
    if(city&&!city.codigo&&metadata) { await em.save('cities',{...city,name:metadata.name,codigo:metadata.code,provincia:metadata.province,region:metadata.region,latitud:metadata.latitude,longitud:metadata.longitude}); await em.update('accommodations',{cityId:city.id},{destino:metadata.name}); }
  }
  if(em.connection.options.type==='postgres') await em.query("SELECT setval(pg_get_serial_sequence('ciudades','id'), GREATEST((SELECT MAX(id) FROM ciudades),1), true)");
  if (process.env.SEED_DEMO !== 'false' && !await em.count('accommodations')) {
    const data = [
      ['Casa Andina Boutique', 1, 89, 'photo-1566073771259-6a8506099945', 'Un refugio con encanto en el corazón del centro histórico. Patio colonial, cocina local y una vista inolvidable.'],
      ['Río & Piedra Lodge', 2, 72, 'photo-1445019980597-93fa8acb246c', 'Despierta junto al río, entre jardines y arquitectura cuencana. Un espacio para bajar el ritmo y disfrutar.'],
      ['Bosque de Niebla', 3, 110, 'photo-1449158743715-0a90ebb6d2d8', 'Naturaleza, descanso y aventura a los pies del Tungurahua. Terraza privada y senderos a pocos pasos.'],
      ['Brisa del Pacífico', 4, 125, 'photo-1571896349842-33c89424de2d', 'Una escapada frente al mar con piscina, habitaciones luminosas y los sabores de la costa.'],
      ['Isla Serena', 5, 168, 'photo-1582719478250-c89cae4dc85b', 'Un pequeño hotel para explorar las islas con calma. Habitaciones frescas y atención cercana.'],
      ['Puerto Verde Suites', 6, 65, 'photo-1566665797739-1674de7a421a', 'Suites prácticas y acogedoras para visitar la ciudad, trabajar y descansar junto al Malecón.'],
    ];
    const cities = await em.find<any>('cities');
    for (const [nombre, cityId, price, photo, descripcion] of data) {
      const city = cities.find(c => c.id === cityId);
      const hotel = await em.save<any, any>('accommodations', { nombre, cityId, destino: city.name, descripcion, direccion: 'Zona turística, ' + city.name, tipo: 'Hotel boutique', image: 'https://images.unsplash.com/' + photo + '?auto=format&fit=crop&w=1100&q=80', published: true, createdAt: now, updatedAt: now });
      const room = await em.save<any, any>('room_types', { accommodationId: hotel.id, nombre: 'Habitación estándar', capacidadAdultos: 4, capacidadNinos: 2, habitaciones: 5 });
      await em.save<any, any>('rate_plans', { roomTypeId: room.id, precioPorNoche: price, currency: 'USD', cancellation: 'Cancelación gratuita antes del check-in' });
      await em.save<any, any>('photos', { accommodationId: hotel.id, url: hotel.image, caption: nombre });
      for (const facilityId of [1, 2, 3]) await em.save<any, any>('accommodation_facilities', { accommodationId: hotel.id, facilityId });
      await em.save<any, any>('reviews', { accommodationId: hotel.id, author: 'Huésped de ejemplo', score: 9, comment: 'Reseña de demostración: excelente ubicación y una estancia muy agradable.', createdAt: now });
    }
  }
  const email = (process.env.ADMIN_EMAIL || 'admin@booking.local').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || (!process.env.VERCEL && !process.env.DATABASE_URL ? 'AdminDemo2026!' : null);
  if (password && password.length < 10) throw new Error('ADMIN_PASSWORD debe tener al menos 10 caracteres');
  if (password && !await em.findOneBy<any>('users', { email })) await em.save<any, any>('users', { id: randomUUID(), email, name: 'Administrador', role: 'admin', passwordHash: hashPassword(password), createdAt: now });
}
