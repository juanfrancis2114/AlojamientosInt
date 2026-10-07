import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { invoiceHtml } from '../../frontend/src/StayDialogs';
const require = createRequire(import.meta.url);
const { stayPrices } = require('../../dist/modules/alojamientos/stay-pricing');
describe('Tarifas y documentos de estancia', () => {
  it('aplica excepciones por noche y conserva centavos por habitación', () => {
    expect(
      stayPrices(25.55, 2, '2026-11-01', '2026-11-04', [
        { fecha: '2026-11-02', precio: 30.15 },
        { fecha: '2026-11-03', precio: null },
        { fecha: '2026-11-04', precio: 99 },
      ]),
    ).toEqual({
      lineas: [
        { fecha: '2026-11-01', cantidad: 2, precio_unitario: 25.55, subtotal: 51.1 },
        { fecha: '2026-11-02', cantidad: 2, precio_unitario: 30.15, subtotal: 60.3 },
        { fecha: '2026-11-03', cantidad: 2, precio_unitario: 25.55, subtotal: 51.1 },
      ],
      total: 162.5,
    });
  });
  it('escapa datos del cliente y detalles en el archivo descargable', () => {
    const html = invoiceHtml({
      numero: 'DEMO',
      estado: 'EMITIDA',
      version: 1,
      cliente: {
        first_name: '<img src=x onerror=alert(1)>',
        last_name: 'Prueba',
        email: 'uno@test.local',
        direccion: '<script>alert(1)</script>',
      },
      reserva: { localizador: 'AB', entrada: '2026-11-01', salida: '2026-11-02' },
      detalles: [{ descripcion: '<b>hotel</b>', cantidad: 1, precio_unitario: 10, subtotal: 10 }],
      subtotal: 10,
      impuestos: 0,
      total: 10,
      aviso: 'Factura simulada',
    });
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&lt;b&gt;hotel');
  });
});
