import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { trackClientEvent } from '../../services/api';

interface ProtectedRouteProps {
  isAuthenticated: boolean;
}

export function ProtectedRoute({ isAuthenticated }: ProtectedRouteProps) {
  const location = useLocation();

  if (!isAuthenticated) {
    // Only forward to login page if explicitly accessed via admin secret trigger (Ctrl + Shift + A or secret logo click)
    if (location.state?.secret) {
      return <Navigate to="/admin/login" replace state={location.state} />;
    }

    // Direct access to /admin by normal users immediately redirects to Home ('/')
    trackClientEvent('CLIENT_UNAUTHORIZED_ADMIN_REDIRECT', `Người dùng truy cập [${location.pathname}] khi chưa đăng nhập - Đã tự động chuyển hướng về Trang Chủ.`);
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

