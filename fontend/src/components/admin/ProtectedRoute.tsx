import { Navigate, Outlet, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  isAuthenticated: boolean;
}

export function ProtectedRoute({ isAuthenticated }: ProtectedRouteProps) {
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={location.state} />;
  }
  return <Outlet />;
}
