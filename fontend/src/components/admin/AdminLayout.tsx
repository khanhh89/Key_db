import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import type { Language, SystemConfig } from '../../types';
import { ChangePasswordModal } from '../modals/ChangePasswordModal';
import '../../admin/admin.css';

interface AdminLayoutProps {
  lang: Language;
  config?: SystemConfig;
  onLogout: () => void;
  showToast?: (msg: string) => void;
}

export function AdminLayout({ lang, config, onLogout, showToast }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const avatarDropdownRef = useRef<HTMLDivElement>(null);

  // Close avatar dropdown menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (avatarDropdownRef.current && !avatarDropdownRef.current.contains(e.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto Logout on Idle (30 minutes)
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const IDLE_TIME = 30 * 60 * 1000; // 30 minutes

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (showToast) {
          showToast(lang === 'vi' ? '⚠️ Đã tự động đăng xuất do không hoạt động quá lâu!' : '⚠️ Auto-logged out due to inactivity!');
        }
        onLogout();
      }, IDLE_TIME);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(evt => window.addEventListener(evt, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(timeout);
      events.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [onLogout, showToast, lang]);

  // Dynamically update browser tab favicon icon for Admin pages
  useEffect(() => {
    if (config?.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = config.faviconUrl;
    }
  }, [config?.faviconUrl]);

  // Admin Theme state - default to 'light' (white theme) as requested
  const [adminTheme, setAdminTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('modlienquan_admin_theme') as 'light' | 'dark') || 'light';
  });

  const toggleAdminTheme = () => {
    const nextTheme = adminTheme === 'light' ? 'dark' : 'light';
    setAdminTheme(nextTheme);
    localStorage.setItem('modlienquan_admin_theme', nextTheme);
    if (showToast) {
      showToast(nextTheme === 'light' ? '☀ Đã chuyển sang Giao diện Trắng' : '☾ Đã chuyển sang Giao diện Tối');
    }
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/admin/apps':
        return lang === 'vi' ? 'Quản Lý Ứng Dụng Catalog' : 'Apps Catalog Manager';
      case '/admin/services':
        return lang === 'vi' ? 'Quản Lý Dịch Vụ & Truyền Thông' : 'Services & Media Manager';
      case '/admin/keys':
        return lang === 'vi' ? 'Quản Lý Kho Key Bản Quyền' : 'Keys Inventory Manager';
      case '/admin/orders':
        return lang === 'vi' ? 'Quản Lý Đơn Hàng & VietQR Auto Payment' : 'Orders & VietQR Payment Manager';
      case '/admin/config':
        return lang === 'vi' ? 'Cấu Hình Thông Tin Hệ Thống' : 'System Information Config';
      case '/admin/logs':
        return lang === 'vi' ? 'Nhật Ký Hoạt Động Hệ Thống' : 'System Activity Audit Logs';
      case '/admin/feedbacks':
        return lang === 'vi' ? 'Quản Lý Phản Hồi Khách Hàng' : 'Customer Feedback Manager';
      default:
        return lang === 'vi' ? 'Bảng Điều Khiển Tổng Quan' : 'Dashboard Analytics';
    }
  };

  return (
    <div className={`admin-portal ${adminTheme}`}>
      {/* Mobile Overlay BackDrop */}
      {isSidebarOpen && (
        <div
          className="admin-mobile-backdrop"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`admin-sidebar ${isSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          {config?.faviconUrl ? (
            <img
              src={config.faviconUrl}
              alt="Logo"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                objectFit: 'cover',
                border: '1px solid rgba(0, 242, 254, 0.4)',
                boxShadow: '0 0 10px rgba(0, 242, 254, 0.3)',
                flexShrink: 0
              }}
            />
          ) : (
            <div className="sidebar-brand-icon">🛡️</div>
          )}
          <div>
            <h3>{config?.brandName || 'MOD LIÊN QUÂN'}</h3>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
              ADMIN PORTAL
            </span>
          </div>
          <button
            className="sidebar-close-mobile-btn"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close Sidebar"
          >
            ✕
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/admin"
            end
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
          >
            📊 {lang === 'vi' ? 'Tổng Quan Dashboard' : 'Dashboard Analytics'}
          </NavLink>

          <NavLink
            to="/admin/apps"
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
          >
            📱 {lang === 'vi' ? 'Quản Lý Apps' : 'Manage Catalog Apps'}
          </NavLink>

          <NavLink
            to="/admin/keys"
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
          >
            🔑 {lang === 'vi' ? 'Kho Key Bản Quyền' : 'Keys Inventory'}
          </NavLink>

          <NavLink
            to="/admin/orders"
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
          >
            💳 {lang === 'vi' ? 'Đơn Hàng VietQR' : 'Orders & Payments'}
          </NavLink>

          <NavLink
            to="/admin/services"
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
          >
            🌐 {lang === 'vi' ? 'Dịch Vụ & Media' : 'Manage Services'}
          </NavLink>

          <NavLink
            to="/admin/coupons"
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
          >
            🎁 {lang === 'vi' ? 'Mã Giảm Giá' : 'Discount Coupons'}
          </NavLink>

          <NavLink
            to="/admin/config"
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
          >
            ⚙️ {lang === 'vi' ? 'Cấu Hình Hệ Thống' : 'System Config'}
          </NavLink>

          <NavLink
            to="/admin/logs"
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
          >
            📜 {lang === 'vi' ? 'Nhật Ký Hoạt Động' : 'Activity Logs'}
          </NavLink>

          <NavLink
            to="/admin/feedbacks"
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
          >
            💬 {lang === 'vi' ? 'Phản Hồi Khách Hàng' : 'Customer Feedbacks'}
          </NavLink>
        </nav>

        {/* COMBINED AVATAR DROPDOWN MENU FOOTER */}
        <div className="sidebar-footer">
          <div className="admin-avatar-dropdown-wrap" ref={avatarDropdownRef}>
            <button
              className="admin-avatar-trigger"
              onClick={() => setIsAvatarMenuOpen(!isAvatarMenuOpen)}
              title="Tài khoản Admin - Click để mở Menu"
            >
              <div className="user-avatar">VK</div>
              <div className="trigger-info">
                <span className="trigger-name">Administrator</span>
                <span className="trigger-status">● Online Active</span>
              </div>
              <span className={`dropdown-chevron ${isAvatarMenuOpen ? 'open' : ''}`}>▾</span>
            </button>

            {isAvatarMenuOpen && (
              <div className="admin-avatar-dropdown-menu">
                <div className="dropdown-header">
                  <div className="dropdown-avatar">VK</div>
                  <div className="dropdown-user-details">
                    <strong>Administrator</strong>
                    <small>Super Admin System</small>
                  </div>
                </div>
                <div className="dropdown-divider" />
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setIsAvatarMenuOpen(false);
                    setIsChangePassOpen(true);
                  }}
                >
                  🔑 {lang === 'vi' ? 'Đổi Mật Khẩu Admin' : 'Change Password'}
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setIsAvatarMenuOpen(false);
                    navigate('/');
                  }}
                >
                  🌐 {lang === 'vi' ? 'Xem Trang Người Dùng' : 'View Public Site'}
                </button>
                <button
                  className="dropdown-item logout"
                  onClick={() => {
                    setIsAvatarMenuOpen(false);
                    onLogout();
                  }}
                >
                  🚪 {lang === 'vi' ? 'Đăng Xuất Admin' : 'Logout Admin'}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-left-wrap" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              className="admin-mobile-toggle-btn"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle Admin Navigation"
            >
              ☰
            </button>

            <div className="topbar-title">
              <div style={{ fontSize: '11.5px', color: 'var(--admin-text-muted, #94a3b8)', fontWeight: 600, marginBottom: '2px' }}>
                ADMIN DASHBOARD › {getPageTitle()}
              </div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>{getPageTitle()}</h1>
            </div>
          </div>

          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Live System Status Indicators */}
            <div className="admin-status-indicators" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="system-pill-online" title="Spring Boot REST API Operational" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 700,
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                API ACTIVE
              </span>
            </div>

            {/* Quick View Public Store */}
            <button
              onClick={() => navigate('/')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '10px',
                fontSize: '12.5px',
                fontWeight: 'bold',
                background: 'rgba(56, 189, 248, 0.12)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🌐 {lang === 'vi' ? 'Xem Cửa Hàng' : 'View Store'}
            </button>

            {/* Theme Toggle Button */}
            <button className="admin-theme-btn" onClick={toggleAdminTheme}>
              {adminTheme === 'light' ? '☀ Sáng' : '☾ Tối'}
            </button>

            <div className="role-pill">
              🛡️ Super Admin
            </div>
          </div>
        </header>

        <div className="admin-body">
          <Outlet />
        </div>
      </main>

      {/* CHANGE PASSWORD MODAL */}
      <ChangePasswordModal
        isOpen={isChangePassOpen}
        onClose={() => setIsChangePassOpen(false)}
        lang={lang}
        showToast={showToast || (() => {})}
      />
    </div>
  );
}
