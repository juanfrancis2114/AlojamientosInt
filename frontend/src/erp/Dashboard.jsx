import { lazy, Suspense, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useResource } from '../useResource';
import { money } from '../utils';
import { ResourceState } from './Shared';
const DestinationMap = lazy(() => import('./DestinationMap'));
const colors = ['#214d42', '#7a986c', '#d5b96a', '#778faf', '#ba8571', '#9d96b6', '#b8c4ba'];
export default function Dashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const [period, setPeriod] = useState({ desde: today.slice(0, 4) + '-01-01', hasta: today });
  const resource = useResource('admin/erp/dashboard?' + new URLSearchParams(period));
  const value = resource.data;
  const stats = value?.indicadores;
  return (
    <>
      <div className="erp-section-heading">
        <div>
          <p className="eyebrow dark">UNA VISIÓN CLARA DE TU OPERACIÓN</p>
          <h2>Resumen ejecutivo</h2>
        </div>
        <form
          className="erp-period"
          onSubmit={(event) => {
            event.preventDefault();
            setPeriod(Object.fromEntries(new FormData(event.currentTarget)));
          }}
        >
          <label>
            Desde
            <input
              name="desde"
              type="date"
              defaultValue={period.desde}
              required
              className="form-control"
            />
          </label>
          <label>
            Hasta
            <input
              name="hasta"
              type="date"
              defaultValue={period.hasta}
              required
              className="form-control"
            />
          </label>
          <button className="btn btn-success">Aplicar</button>
        </form>
      </div>
      <ResourceState resource={resource}>
        {stats && (
          <>
            <div className="erp-kpis">
              {[
                [
                  money(stats.ingresos),
                  'Valor de reservas confirmadas',
                  'Importes de demostración',
                ],
                [
                  money(stats.gastos_pagados),
                  'Gastos pagados',
                  money(stats.gastos_pendientes) + ' pendientes',
                ],
                [
                  money(stats.resultado),
                  'Resultado operativo',
                  stats.margen + ' % de margen sobre reservas',
                ],
                [
                  stats.reservas_confirmadas,
                  'Reservas confirmadas',
                  stats.tasa_cancelacion + ' % de cancelaciones',
                ],
              ].map(([number, label, note]) => (
                <article className="erp-kpi" key={label}>
                  <span>{label}</span>
                  <strong>{number}</strong>
                  <small>{note}</small>
                </article>
              ))}
            </div>
            <div className="erp-mini-stats">
              <span>
                <strong>{stats.alojamientos_publicados}</strong> alojamientos publicados
              </span>
              <span>
                <strong>{stats.ciudades}</strong> destinos
              </span>
              <span>
                <strong>{stats.usuarios_activos}</strong> usuarios activos
              </span>
              <span>
                <strong>{stats.reservas_canceladas}</strong> reservas canceladas
              </span>
            </div>
            <div className="erp-grid">
              <section className="erp-panel">
                <h3>Reservas y gastos por mes</h3>
                <p className="muted">Valor de reservas vigentes frente a gastos pagados.</p>
                {value.evolucion.length ? (
                  <div className="erp-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={value.evolucion}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" />
                        <YAxis />
                        <Tooltip formatter={(amount) => money(amount)} />
                        <Legend />
                        <Area
                          isAnimationActive={false}
                          type="monotone"
                          dataKey="ingresos"
                          name="Reservas"
                          stroke="#214d42"
                          fill="#dbe9b8"
                        />
                        <Area
                          type="monotone"
                          dataKey="gastos"
                          name="Gastos"
                          stroke="#bb8166"
                          fill="#f2ded0"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="erp-empty-chart">
                    Aún no hay reservas confirmadas ni gastos pagados en este período.
                  </div>
                )}
              </section>
              <section className="erp-panel">
                <h3>Distribución de gastos</h3>
                {value.gastos_por_categoria.some((c) => c.importe > 0) ? (
                  <>
                    <div className="erp-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            isAnimationActive={false}
                            data={value.gastos_por_categoria.filter((c) => c.importe > 0)}
                            dataKey="importe"
                            nameKey="nombre"
                            innerRadius={65}
                            outerRadius={100}
                          >
                            {value.gastos_por_categoria
                              .filter((c) => c.importe > 0)
                              .map((c, index) => (
                                <Cell key={c.nombre} fill={colors[index % colors.length]} />
                              ))}
                          </Pie>
                          <Tooltip formatter={(amount) => money(amount)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="erp-category-list">
                      {value.gastos_por_categoria
                        .filter((c) => c.importe > 0)
                        .map((c) => (
                          <div key={c.nombre}>
                            <span>{c.nombre}</span>
                            <strong>{c.porcentaje} %</strong>
                            <small>{money(c.importe)}</small>
                          </div>
                        ))}
                    </div>
                  </>
                ) : (
                  <div className="erp-empty-chart">
                    Registra un gasto pagado para ver su distribución por categoría.
                  </div>
                )}
              </section>
            </div>
            <div className="erp-grid map-grid">
              <section className="erp-panel">
                <h3>Tu operación en Ecuador</h3>
                <p className="muted">
                  Puntos referenciales de los cantones. Selecciona un destino para ver alojamientos
                  y reservas.
                </p>
                <Suspense fallback={<div className="loading">Cargando mapa…</div>}>
                  <DestinationMap cities={value.ciudades} />
                </Suspense>
              </section>
              <section className="erp-panel">
                <h3>Destinos con más reservas</h3>
                <p className="muted">Participación en reservas confirmadas del período.</p>
                {value.ciudades_destacadas.length ? (
                  value.ciudades_destacadas.map((city, index) => (
                    <div className="erp-city-rank" key={city.id}>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{city.name}</strong>
                        <small>
                          {city.provincia} · {city.reservas} reservas
                        </small>
                        <progress max="100" value={city.porcentaje} />
                      </div>
                      <b>{city.porcentaje} %</b>
                    </div>
                  ))
                ) : (
                  <div className="erp-empty-chart">
                    El ranking aparecerá cuando los viajeros confirmen reservas.
                  </div>
                )}
              </section>
            </div>
            <div className="erp-note">
              Las reservas usan pagos simulados. Los gastos son registros operativos; este resumen
              no sustituye contabilidad tributaria.
            </div>
          </>
        )}
      </ResourceState>
    </>
  );
}
