// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { createRequire } from 'node:module';
import AccommodationGallery from '../../frontend/src/AccommodationGallery';
vi.mock('../../frontend/src/useResource', () => ({
  useResource: () => ({
    data: [1, 2, 3, 4].map((n) => ({
      id: String(n),
      orden: n,
      url: 'https://example.com/' + n + '.jpg',
      descripcion: 'Vista ' + n,
      autor: 'Autor',
      licencia: 'CC BY 4.0',
      fuente: 'https://example.com/fuente',
      licencia_url: 'https://creativecommons.org/licenses/by/4.0/',
    })),
    loading: false,
    error: '',
  }),
}));
const require = createRequire(import.meta.url);
const { demoGallery } = require('../../dist/modules/alojamientos/gallery');
afterEach(cleanup);
describe('Galería de alojamiento', () => {
  it('muestra cuatro vistas, cambia con miniaturas y recorre en ambos sentidos', () => {
    render(
      <AccommodationGallery
        hotel={{ id: 1, nombre: 'Casa de prueba', image: 'https://example.com/1.jpg' }}
      />,
    );
    expect(screen.getByText('1 / 4')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Ver imagen 3:/ }));
    expect(screen.getByText('3 / 4')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Imagen siguiente' }));
    expect(screen.getByText('4 / 4')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Imagen siguiente' }));
    expect(screen.getByText('1 / 4')).toBeVisible();
    fireEvent.keyDown(screen.getByRole('region'), { key: 'ArrowLeft' });
    expect(screen.getByText('4 / 4')).toBeVisible();
    expect(screen.getByRole('link', { name: /Abrir imagen completa/ })).toHaveAttribute(
      'href',
      'https://example.com/4.jpg',
    );
  });
  it('genera imágenes diferentes por estancia y conserva licencia y portada', () => {
    const pool = [0, 1, 2, 3, 4, 5, 6, 7].map((n) => ({
      url: 'https://example.com/' + n + '.jpg',
      source: 'https://example.com/fuente',
      author: 'Autor',
      license: 'CC BY 4.0',
      licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
      kind: n % 2 ? 'habitacion' : 'area',
    }));
    const gallery = demoGallery(
      { id: 9, image: pool[0].url, tipo: 'Hotel' },
      new Set([pool[0].url, pool[1].url]),
      pool,
    );
    expect(gallery).toHaveLength(4);
    expect(new Set(gallery.map((p) => p.url)).size).toBe(4);
    expect(gallery[0].url).toBe(pool[0].url);
    expect(gallery.slice(1).some((p) => p.url === pool[1].url)).toBe(false);
    expect(
      gallery.every((p) => p.licencia_url.startsWith('https://') && p.alojamiento_id === 9),
    ).toBe(true);
  });
});
