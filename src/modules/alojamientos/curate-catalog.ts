import { EntityManager, In } from 'typeorm';
import { catalogPhotos } from './catalog-photos';
import { catalogTarget } from './catalog-policy';
export async function curateCatalog(em: EntityManager) {
  const [cities, hotels, orders, products, expenses, calendar, rooms, photos] = await Promise.all(
    [
      'cities',
      'accommodations',
      'orders',
      'availability_products',
      'gastos',
      'calendario_tarifas',
      'room_types',
      'photos',
    ].map((t) => em.find<any>(t)),
  );
  const managed = hotels.filter(
    (h) =>
      h.id <= 6 ||
      h.descripcion.startsWith('Alojamiento ficticio de demostración en ') ||
      h.descripcion.startsWith('Estancia ficticia de Kawsay:'),
  );
  const referenced = new Set([
    ...orders.map((o) => o.accommodationId),
    ...products.map((p) => p.accommodationId),
    ...expenses.map((g) => g.alojamiento_id),
    ...calendar.map((c) => c.alojamiento_id),
  ]);
  const updates = [],
    photoUpdates = [],
    retired = [],
    removable = [];
  let index = 0;
  const types: any = {
    habitacion: 'Hotel boutique',
    hotel: 'Hotel',
    cabana: 'Cabaña',
    lodge: 'Lodge',
    apartamento: 'Apartamento',
  };
  const names = [
    'Casa Aurora',
    'Patio de Luna',
    'Jardín del Río',
    'Mirador del Alba',
    'Refugio del Viajero',
  ];
  for (const city of cities
    .filter((c) => c.codigo)
    .sort((a, b) => a.codigo.localeCompare(b.codigo))) {
    const options = managed.filter((h) => h.cityId === city.id).sort((a, b) => a.id - b.id);
    const keep = options.slice(0, catalogTarget(city.name));
    for (let slot = 0; slot < keep.length; slot++) {
      const h = keep[slot],
        image = catalogPhotos[index++];
      if (!image) throw new Error('Faltan fotografías distintas para el catálogo');
      const nombre =
        names[(Number(city.codigo) + slot) % names.length] +
        ' · ' +
        city.name +
        ', ' +
        city.provincia +
        (slot ? ' ' + (slot + 1) : '');
      const descripcion = `Estancia ficticia de Kawsay: ${nombre}, en ${city.provincia}. ${['Ambiente tranquilo con espacios para leer y descansar', 'Diseño acogedor para una escapada en pareja', 'Espacios luminosos para viajeros que recorren la región', 'Una opción práctica para combinar trabajo y descanso', 'Un refugio para disfrutar la gastronomía y pasear'][(Number(city.codigo) * 3 + slot) % 5]}. Capacidad y precio propios; dirección de demostración. La fotografía es ilustrativa, tomada en otro lugar, y no identifica una propiedad real en Ecuador.`;
      updates.push({
        ...h,
        nombre,
        descripcion,
        tipo: types[image.kind],
        direccion: 'Sector de demostración ' + (slot + 1) + ', ' + city.name,
        image: image.url,
        published: true,
        updatedAt: new Date().toISOString(),
      });
      const old = photos.find((p) => p.accommodationId === h.id);
      photoUpdates.push({
        ...(old ? { id: old.id } : {}),
        accommodationId: h.id,
        url: image.url,
        caption: JSON.stringify({
          author: image.author,
          license: image.license,
          source: image.source,
          licenseUrl: image.licenseUrl,
        }),
      });
    }
    for (const h of options.slice(keep.length))
      (referenced.has(h.id) ? retired : removable).push(h.id);
  }
  if (updates.length) await em.save('accommodations', updates, { chunk: 100 });
  if (photoUpdates.length) await em.save('photos', photoUpdates, { chunk: 100 });
  if (retired.length) await em.update('accommodations', { id: In(retired) }, { published: false });
  if (removable.length) {
    await em.delete('imagenes_alojamiento',{alojamiento_id:In(removable)});
    const roomIds = rooms.filter((r) => removable.includes(r.accommodationId)).map((r) => r.id);
    if (roomIds.length) await em.delete('rate_plans', { roomTypeId: In(roomIds) });
    for (const table of ['room_types', 'photos', 'reviews', 'accommodation_facilities'])
      await em.delete(table, { accommodationId: In(removable) });
    await em.delete('accommodations', { id: In(removable) });
  }
  return {
    publicados: updates.length,
    eliminados_sin_historial: removable.length,
    archivados_con_historial: retired.length,
    fotos_distintas: index,
  };
}
