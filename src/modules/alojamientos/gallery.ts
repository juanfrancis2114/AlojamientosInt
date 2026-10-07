import { EntityManager } from 'typeorm';
import { randomUUID } from 'crypto';
import { galleryPhotos } from './gallery-photos';
import { catalogPhotos } from './catalog-photos';
const descriptions: any = {
  habitacion: 'Habitación de referencia',
  area: 'Espacios comunes de referencia',
  hotel: 'Arquitectura de referencia',
  cabana: 'Cabaña de referencia',
  lodge: 'Lodge de referencia',
  apartamento: 'Interior de referencia',
};
export function demoGallery(hotel: any, used = new Set<string>(), pool: any[] = galleryPhotos) {
  const cover =
    catalogPhotos.find((p) => p.url === hotel.image) || pool.find((p) => p.url === hotel.image);
  const selected = [
    cover || {
      url: hotel.image,
      source: hotel.image,
      author: '',
      license: 'Crédito no registrado',
      licenseUrl: hotel.image,
      kind: 'hotel',
    },
  ];
  const wanted = [
    'habitacion',
    'area',
    hotel.tipo === 'Cabaña' ? 'cabana' : hotel.tipo === 'Lodge' ? 'lodge' : 'hotel',
  ];
  for (const kind of wanted) {
    const available = pool.filter((p) => !selected.some((s) => s.url === p.url));
    const next =
      available.find((p) => p.kind === kind && !used.has(p.url)) ||
      available.find((p) => !used.has(p.url)) ||
      available.find((p) => p.kind === kind) ||
      available[0];
    if (!next) throw new Error('Faltan imágenes distintas para la galería');
    selected.push(next);
    used.add(next.url);
  }
  used.add(hotel.image);
  return selected.map((photo, index) => ({
    id: randomUUID(),
    alojamiento_id: hotel.id,
    orden: index + 1,
    url: photo.url,
    descripcion:
      index === 0 ? 'Portada ilustrativa' : descriptions[photo.kind] || 'Vista de referencia',
    autor: photo.author || '',
    licencia: photo.license,
    fuente: photo.source,
    licencia_url: (/^https?:\/\//.test(photo.licenseUrl || '')
      ? photo.licenseUrl
      : photo.source
    ).replace(/^http:/, 'https:'),
    fecha_creacion: new Date().toISOString(),
  }));
}
export async function syncGallery(em: EntityManager, hotel: any) {
  let rows = await em.find<any>('imagenes_alojamiento', {
    where: { alojamiento_id: hotel.id },
    order: { orden: 'ASC' },
  });
  if (rows.length !== 4) {
    const used = new Set(
      (await em.find<any>('imagenes_alojamiento', { select: { url: true } })).map((i) => i.url),
    );
    rows = demoGallery(hotel, used);
    await em.delete('imagenes_alojamiento', { alojamiento_id: hotel.id });
    await em.insert('imagenes_alojamiento', rows);
  } else if (rows[0].url !== hotel.image) {
    const index = rows.findIndex((i) => i.url === hotel.image);
    if (index >= 0) rows = [rows[index], ...rows.filter((_, i) => i !== index)];
    else
      rows[0] = {
        ...rows[0],
        url: hotel.image,
        descripcion: 'Portada ilustrativa',
        autor: '',
        licencia: 'Crédito no registrado',
        fuente: hotel.image,
        licencia_url: hotel.image,
      };
    rows = rows.map((r, i) => ({ ...r, orden: i + 1 }));
    await em.delete('imagenes_alojamiento', { alojamiento_id: hotel.id });
    await em.insert('imagenes_alojamiento', rows);
  }
  return rows;
}
export async function fillGalleries(em: EntityManager) {
  const hotels = await em.find<any>('accommodations', { order: { id: 'ASC' } });
  const existing = await em.find<any>('imagenes_alojamiento');
  const used = new Set([...hotels.map((h) => h.image), ...existing.map((i) => i.url)]);
  const rows = [];
  for (const hotel of hotels) {
    const current = existing.filter((i) => i.alojamiento_id === hotel.id);
    if (current.length === 4) continue;
    if (current.length) await em.delete('imagenes_alojamiento', { alojamiento_id: hotel.id });
    rows.push(...demoGallery(hotel, used));
  }
  for (let i = 0; i < rows.length; i += 150)
    await em.insert('imagenes_alojamiento', rows.slice(i, i + 150));
  return { alojamientos_completados: rows.length / 4, imagenes_insertadas: rows.length };
}
