import { useNavigate } from 'react-router-dom';
import type { AppItem, ServiceItem, SystemConfig, Language } from '../../types';

interface DashboardPageProps {
  lang: Language;
  apps: AppItem[];
  services: ServiceItem[];
  config: SystemConfig;
}

export function DashboardPage({
  lang,
  apps,
  services,
  config
}: DashboardPageProps) {
  const navigate = useNavigate();

  return (
    <div className="dashboard-wrapper">
      {/* Top Overview Cards */}
      <div className="dashboard-grid">
        <div className="dash-stat-card" onClick={() => navigate('/admin/apps')}>
          <div className="stat-info">
            <span>{lang === 'vi' ? 'TỔNG ỨNG DỤNG' : 'TOTAL APPS'}</span>
            <h2>{apps.length}</h2>
          </div>
          <div className="stat-icon">📱</div>
        </div>

        <div className="dash-stat-card" onClick={() => navigate('/admin/services')}>
          <div className="stat-info">
            <span>{lang === 'vi' ? 'DỊCH VỤ & MEDIA' : 'SERVICES & MEDIA'}</span>
            <h2>{services.length}</h2>
          </div>
          <div className="stat-icon">🌐</div>
        </div>

        <div className="dash-stat-card" onClick={() => navigate('/admin/config')}>
          <div className="stat-info">
            <span>{lang === 'vi' ? 'CHUYÊN MÔN' : 'SPECIALTIES'}</span>
            <h2>{(config.specialties || []).length}</h2>
          </div>
          <div className="stat-icon">⚡</div>
        </div>

        <div className="dash-stat-card">
          <div className="stat-info">
            <span>{lang === 'vi' ? 'TRẠNG THÁI HỆ THỐNG' : 'SYSTEM STATUS'}</span>
            <h2 style={{ color: '#10b981', fontSize: '24px' }}>ONLINE</h2>
          </div>
          <div className="stat-icon">🟢</div>
        </div>
      </div>

      {/* Overview Panels */}
      <div className="manager-panel">
        <div className="panel-header">
          <h2>{lang === 'vi' ? '⚡ Thao Tác Nhanh' : '⚡ Quick Actions'}</h2>
        </div>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <button className="add-btn" onClick={() => navigate('/admin/apps')}>
            📱 {lang === 'vi' ? 'Quản Lý Apps Catalog' : 'Manage Apps Catalog'}
          </button>
          <button className="add-btn" onClick={() => navigate('/admin/services')}>
            🌐 {lang === 'vi' ? 'Quản Lý Dịch Vụ & Truyền Thông' : 'Manage Services'}
          </button>
          <button className="add-btn" onClick={() => navigate('/admin/config')}>
            ⚙️ {lang === 'vi' ? 'Cấu Hình Hệ Thống' : 'System Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
