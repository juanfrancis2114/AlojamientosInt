import { Navigate, useLocation } from 'react-router-dom';
import { useBooking } from './context';
export default function ProtectedRoute({ children, admin = false, customerOnly = false }) {
  const { user, authLoading } = useBooking();
  const location = useLocation();
  if (authLoading)
    return (
      <div className="loading" role="status">
        Comprobando sesión…
      </div>
    );
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (customerOnly && user.role === 'admin') return <Navigate to="/admin" replace />;
  if (admin && user.role !== 'admin')
    return (
      <div className="section alert alert-warning" role="alert">
        Acceso exclusivo para administración.
      </div>
    );
  return children;
}
