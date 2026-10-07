import { EntityManager } from 'typeorm';
import { ecuadorCities } from './ecuador-data';
import { catalogTarget } from './catalog-policy';
export async function expandCatalog(em: EntityManager) {
  const current = await em.find<any>('cities');
  const legacy = ['1701', '0101', '1802', '1308', '2003', '0901'];
  const byCode = new Map(current.map((c) => [c.codigo, c]));
  let nextCity = Math.max(0, ...current.map((c) => c.id)) + 1;
  const additions = [];
  for (const meta of ecuadorCities) {
    let city: any = byCode.get(meta.code);
    if (!city) {
      city = current.find((c) => !c.codigo && legacy[c.id - 1] === meta.code);
      const fields = {
        name: meta.name,
        country: 'ec',
        codigo: meta.code,
        provincia: meta.province,
        region: meta.region,
        latitud: meta.latitude,
        longitud: meta.longitude,
      };
      if (city) {
        await em.update('cities', { id: city.id }, fields);
        city = { ...city, ...fields };
        await em.update('accommodations', { cityId: city.id }, { destino: city.name });
      } else {
        city = { id: nextCity++, ...fields };
        additions.push(city);
      }
      byCode.set(meta.code, city);
    }
  }
  const insertBatch = async (table: string, rows: any[]) => {
    if (!rows.length) return;
    // PostgreSQL omite IDs generados en insert() salvo que se indiquen las columnas.
    // Conservar los IDs calculados es necesario para las relaciones del lote.
    await em.createQueryBuilder().insert().into(table, Object.keys(rows[0]))
      .values(rows).updateEntity(false).execute();
  };
  if (additions.length) await insertBatch('cities', additions);
  // Las relaciones se construyen a partir de las referencias persistidas.
  for (const city of await em.find<any>('cities')) byCode.set(city.codigo, city);
  const hotels = await em.find<any>('accommodations');
  let nextHotel = Math.max(0, ...hotels.map((h) => h.id)) + 1;
  const roomRows = await em.find<any>('room_types');
  let nextRoom = Math.max(0, ...roomRows.map((r) => r.id)) + 1;
  const timestamp = new Date().toISOString();
  const hotelBatch = [],
    rooms = [],
    rates = [],
    links = [],
    photos = [];
  const styles = ['Hotel boutique', 'Hostal', 'Cabaña', 'Apartamento', 'Lodge'];
  const names = [
    'Casa del Sol',
    'Jardín del Viajero',
    'Refugio Verde',
    'Mirador Andino',
    'Sendero Sereno',
  ];
  const images = [
    'photo-1566073771259-6a8506099945',
    'photo-1566665797739-1674de7a421a',
    'photo-1449158743715-0a90ebb6d2d8',
    'photo-1571896349842-33c89424de2d',
    'photo-1445019980597-93fa8acb246c',
  ];
  for (const meta of ecuadorCities) {
    const city: any = byCode.get(meta.code);
    const count = hotels.filter((h) => h.cityId === city.id).length;
    for (let slot = count; slot < catalogTarget(city.name); slot++) {
      const index = slot % 5;
      const h = {
        id: nextHotel++,
        nombre: names[index] + ' · ' + city.name,
        cityId: city.id,
        destino: city.name,
        descripcion: `Alojamiento ficticio de demostración en ${city.name}, ${city.provincia}. Un espacio acogedor para explorar la ${city.region.toLowerCase()} ecuatoriana. Las fotos son ilustrativas; no representa un establecimiento real.`,
        direccion: 'Zona central de ' + city.name + ' · Dirección de demostración',
        tipo: styles[index],
        image: 'https://images.unsplash.com/' + images[index] + '?auto=format&fit=crop&w=1100&q=80',
        published: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      hotelBatch.push(h);
      const room = {
        id: nextRoom++,
        accommodationId: h.id,
        nombre: 'Habitación estándar',
        capacidadAdultos: 2 + (index % 3),
        capacidadNinos: 2,
        habitaciones: 6 + index * 3,
      };
      rooms.push(room);
      rates.push({
        roomTypeId: room.id,
        precioPorNoche:
          30 + (Number(meta.code) % 55) + index * 18 + (city.region === 'Insular' ? 45 : 0),
        currency: 'USD',
        cancellation: 'Cancelación gratuita antes del check-in',
      });
      links.push({ accommodationId: h.id, facilityId: 1 });
      if (index % 2 === 0) links.push({ accommodationId: h.id, facilityId: 2 });
      photos.push({ accommodationId: h.id, url: h.image, caption: h.nombre });
    }
  }
  for (const [table, rows] of [
    ['accommodations', hotelBatch],
    ['room_types', rooms],
    ['rate_plans', rates],
    ['accommodation_facilities', links],
    ['photos', photos],
  ] as [string, any[]][])
    for (let i = 0; i < rows.length; i += 200) await insertBatch(table, rows.slice(i, i + 200));
  if (em.connection.options.type === 'postgres')
    for (const table of ['ciudades', 'alojamientos', 'tipos_habitacion'])
      await em.query(
        `SELECT setval(pg_get_serial_sequence('${table}','id'), GREATEST((SELECT MAX(id) FROM ${table}),1),true)`,
      );
  return {
    cantones: ecuadorCities.length,
    ciudades_nuevas: additions.length,
    alojamientos_nuevos: hotelBatch.length,
    alojamientos_total: await em.count('accommodations'),
  };
}
