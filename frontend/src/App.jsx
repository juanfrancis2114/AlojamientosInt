import { lazy, Suspense } from 'react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { useBooking } from './context';
import Marketplace from './Marketplace';
import Login from './Login';
import Dialogs from './Dialogs';
import ProtectedRoute from './ProtectedRoute';
const Profile=lazy(()=>import('./Profile'));
const Admin = lazy(() => import('./Admin'));
const Orders = lazy(() => import('./Orders'));
function Header() {
  const { user, open } = useBooking();
  const navigate = useNavigate();
  return (
    <header className="header">
      <NavLink className="brand" to={user?.role === 'admin' ? '/admin' : '/'} aria-label="Kawsay Estancias inicio">
        <span className="brand-icon">k.</span>Kawsay<span className="brand-dot">Estancias</span>
      </NavLink>
      <nav aria-label="Navegación principal">
        {user?.role !== 'admin' && <button data-view="market" className="nav-link" onClick={() => navigate('/')}>
          Explorar
        </button>}
        {user?.role !== 'admin' && <button data-view="orders" className="nav-link" onClick={() => navigate('/reservas')}>
          Mis reservas
        </button>}
        {user?.role === 'admin' && (
          <button
            data-view="admin"
            className="nav-link"
            id="admin-nav"
            onClick={() => navigate('/admin')}
          >
            Administración
          </button>
        )}
        {user&&<button className="nav-link" onClick={()=>navigate('/perfil')}>Mi perfil</button>}
      </nav>
      <button
        id="account"
        className="button outline"
        onClick={() => open({ kind: user ? 'account' : 'login' })}
      >
        {user ? user.name + ' ↗' : 'Iniciar sesión ↗'}
      </button>
    </header>
  );
}
export default function App() {
  const { user, authLoading } = useBooking();
  return (
    <>
      <Header />
      <Suspense
        fallback={
          <div className="loading" role="status">
            Cargando página…
          </div>
        }
      >
        <Routes>
          <Route path="/" element={authLoading ? <div className="loading" role="status">Comprobando sesión…</div> : user?.role === 'admin' ? <Navigate to="/admin" replace /> : <Marketplace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/perfil" element={<ProtectedRoute><Profile/></ProtectedRoute>}/>
          <Route
            path="/reservas"
            element={
              <ProtectedRoute customerOnly>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute admin>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={
              <div className="section alert alert-warning">
                Página no encontrada. <NavLink to="/">Volver al inicio</NavLink>
              </div>
            }
          />
        </Routes>
      </Suspense>
      <footer>
        <NavLink className="brand" to="/">
          Kawsay<span className="brand-dot">Estancias</span>
        </NavLink>
        <p>Descubre Ecuador. Encuentra tu próxima estancia.</p>
        <span>
          Alojamientos de demostración · Ecuador
          <br />
          Reservas de demostración, sin pagos reales.
        </span>
      </footer>
      <Dialogs />
    </>
  );
}
