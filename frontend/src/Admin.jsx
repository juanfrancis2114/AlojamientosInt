import EstanciasAdmin from './erp/EstanciasAdmin';
import { useState } from 'react';
import Dashboard from './erp/Dashboard';
import Management from './erp/Management';
const modules = [
  ['dashboard', 'Resumen ejecutivo', '◈'],
  ['properties', 'Alojamientos', '⌂'],
  ['bookings', 'Reservas', '▣'],
  ['facturas', 'Facturas simuladas', '▤'],
  ['resenas', 'Reseñas', '☆'],
  ['usuarios', 'Usuarios', '♙'],
  ['ciudades', 'Destinos', '⌖'],
  ['audit', 'Actividad', '◷'],
  ['docs', 'Documentación API', '↗'],
];
export default function Admin() {
  const [tab, setTab] = useState('dashboard');
  return (
    <main id="admin-view" className="erp-shell">
      <aside className="erp-sidebar">
        <p className="eyebrow">KAWSAY ESTANCIAS</p>
        <h1>
          Centro de
          <br />
          operaciones
        </h1>
        <p className="erp-sidebar-note">Administración de alojamientos</p>
        <nav aria-label="Módulos de administración">
          {modules.map(([key, label, icon]) => (
            <button
              key={key}
              data-tab={key}
              aria-current={tab === key ? 'page' : undefined}
              className={tab === key ? 'active' : ''}
              onClick={() => setTab(key)}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </button>
          ))}
        </nav>
        <small>
          Reservas de demostración.
          <br />
          Gestión real de tus registros.
        </small>
      </aside>
      <section id="admin-content" className="erp-content">
        {tab === 'dashboard' ? (
          <Dashboard />
        ) : tab === 'docs' ? (
          <div className="erp-panel">
            <p className="eyebrow dark">API REST DOCUMENTADA</p>
            <h2>Documentación para desarrolladores</h2>
            <p>
              Swagger permite consultar los contratos y probar endpoints. Tu sesión administrativa
              funciona en la documentación abierta desde este mismo sitio.
            </p>
            <a
              className="button primary"
              href="/api/docs"
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir Swagger ↗
            </a>
            <a
              className="button outline ms-2"
              href="/api/docs-json"
              target="_blank"
              rel="noopener noreferrer"
            >
              Consultar OpenAPI JSON ↗
            </a>
          </div>
        ) : ['facturas', 'resenas'].includes(tab) ? (
          <EstanciasAdmin key={tab} tab={tab} />
        ) : (
          <Management key={tab} tab={tab} />
        )}
      </section>
    </main>
  );
}
