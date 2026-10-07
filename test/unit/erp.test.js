import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { erpMetrics } = require('../../dist/modules/alojamientos/erp.service');
describe('Indicadores ERP', () => {
  const cities = [
      { id: 1, name: 'Quito' },
      { id: 2, name: 'Cuenca' },
    ],
    hotels = [
      { id: 1, cityId: 1, published: true },
      { id: 2, cityId: 2, published: false },
    ],
    categories = [{ id: 1, nombre: 'Limpieza' }],
    users = [{ activo: true }, { activo: false }];
  it('filtra fechas, cancelaciones, pagos y calcula porcentajes', () => {
    const orders = [
      { accommodationId: 1, createdAt: '2026-10-02', total: 200.25, status: 'CONFIRMED' },
      { accommodationId: 2, createdAt: '2026-10-03', total: 500, status: 'CANCELLED' },
      { accommodationId: 2, createdAt: '2026-09-01', total: 1000, status: 'CONFIRMED' },
    ];
    const expenses = [
      { categoria_id: 1, fecha: '2026-10-02', importe: 50.25, estado: 'PAGADO' },
      { categoria_id: 1, fecha: '2026-10-02', importe: 20, estado: 'PENDIENTE' },
    ];
    const result = erpMetrics(
      cities,
      hotels,
      orders,
      expenses,
      categories,
      users,
      '2026-10-01',
      '2026-10-31',
    );
    expect(result.indicadores).toMatchObject({
      ingresos: 200.25,
      gastos_pagados: 50.25,
      gastos_pendientes: 20,
      resultado: 150,
      tasa_cancelacion: 50,
      usuarios_activos: 1,
      alojamientos_publicados: 1,
    });
    expect(result.ciudades_destacadas[0]).toMatchObject({
      name: 'Quito',
      reservas: 1,
      porcentaje: 100,
    });
    expect(result.gastos_por_categoria[0].porcentaje).toBe(100);
    expect(result.evolucion).toEqual([{ mes: '2026-10', ingresos: 200.25, gastos: 50.25 }]);
  });
  it('sin ventas no inventa ranking ni divide entre cero', () => {
    const result = erpMetrics(
      cities,
      hotels,
      [],
      [],
      categories,
      users,
      '2026-01-01',
      '2026-12-31',
    );
    expect(result.indicadores.margen).toBe(0);
    expect(result.indicadores.tasa_cancelacion).toBe(0);
    expect(result.ciudades_destacadas).toEqual([]);
    expect(result.evolucion).toEqual([]);
  });
});
