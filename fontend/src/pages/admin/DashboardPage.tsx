import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppItem, ServiceItem, SystemConfig, Language, OrderItem, LicenseKeyItem } from '../../types';
import { fetchAllOrdersFromBackend, fetchKeysFromBackend, formatDateTime } from '../../services/api';

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
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [keys, setKeys] = useState<LicenseKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardMetrics = async () => {
      try {
        const [fetchedOrders, fetchedKeys] = await Promise.all([
          fetchAllOrdersFromBackend(),
          fetchKeysFromBackend()
        ]);
        if (fetchedOrders) setOrders(fetchedOrders);
        if (fetchedKeys) setKeys(fetchedKeys);
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardMetrics();
  }, []);

  const paidOrders = orders.filter((o) => o.status === 'PAID');
  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const availableKeys = keys.filter((k) => k.status === 'AVAILABLE');

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="dashboard-wrapper">
      {/* Top Welcome Banner */}
      <div className="dash-welcome-banner">
        <div className="welcome-text">
          <h2>⚡ {lang === 'vi' ? 'Xin chào, Administrator!' : 'Welcome, Administrator!'}</h2>
          <p>
            {lang === 'vi'
              ? `Hệ thống tự động PayOS & VietQR hoạt động 24/7 cho thương hiệu ${config.brandName || 'MOD VIP STORE'}`
              : `PayOS & VietQR Automated System Operational 24/7 for ${config.brandName || 'MOD VIP STORE'}`}
          </p>
        </div>
        <div className="welcome-status-badge">
          <span className="live-pulse-dot" />
          <span>PAYOS AUTO ONLINE</span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="dashboard-grid">
        {/* Metric 1: Total Revenue */}
        <div className="dash-stat-card stat-revenue" onClick={() => navigate('/admin/orders')}>
          <div className="stat-info">
            <span>{lang === 'vi' ? 'TỔNG DOANH THU (PAID)' : 'TOTAL REVENUE'}</span>
            <h2>{totalRevenue.toLocaleString('vi-VN')} VNĐ</h2>
            <small>{paidOrders.length} {lang === 'vi' ? 'đơn hàng thành công' : 'paid orders'}</small>
          </div>
          <div className="stat-icon">💰</div>
        </div>

        {/* Metric 2: Orders Count */}
        <div className="dash-stat-card stat-orders" onClick={() => navigate('/admin/orders')}>
          <div className="stat-info">
            <span>{lang === 'vi' ? 'TỔNG ĐƠN HÀNG' : 'TOTAL ORDERS'}</span>
            <h2>{orders.length}</h2>
            <small style={{ color: '#f59e0b' }}>
              {pendingOrders.length} {lang === 'vi' ? 'đơn đang chờ' : 'pending'}
            </small>
          </div>
          <div className="stat-icon">💳</div>
        </div>

        {/* Metric 3: Available Keys */}
        <div className="dash-stat-card stat-keys" onClick={() => navigate('/admin/keys')}>
          <div className="stat-info">
            <span>{lang === 'vi' ? 'KHO KEY KHẢ DỤNG' : 'AVAILABLE VIP KEYS'}</span>
            <h2>{availableKeys.length} / {keys.length}</h2>
            <small>{lang === 'vi' ? 'Key sẵn sàng cấp tự động' : 'Ready for delivery'}</small>
          </div>
          <div className="stat-icon">🔑</div>
        </div>

        {/* Metric 4: Total Apps */}
        <div className="dash-stat-card stat-apps" onClick={() => navigate('/admin/apps')}>
          <div className="stat-info">
            <span>{lang === 'vi' ? 'ỨNG DỤNG CATALOG' : 'CATALOG APPS'}</span>
            <h2>{apps.length}</h2>
            <small>{services.length} {lang === 'vi' ? 'dịch vụ & truyền thông' : 'services & media'}</small>
          </div>
          <div className="stat-icon">📱</div>
        </div>
      </div>

      {/* Quick Operations & Recent Orders Panels */}
      <div className="dash-two-cols">
        {/* Left Column: Quick Action Panel */}
        <div className="manager-panel">
          <div className="panel-header">
            <h2>⚡ {lang === 'vi' ? 'Thao Tác Nhanh Admin' : 'Admin Quick Actions'}</h2>
          </div>
          <div className="quick-action-grid">
            <button className="dash-quick-btn" onClick={() => navigate('/admin/apps')}>
              <span className="btn-icon">📱</span>
              <div className="btn-text">
                <strong>{lang === 'vi' ? 'Quản Lý Catalog Apps' : 'Manage Apps'}</strong>
                <small>{lang === 'vi' ? 'Thêm / Sửa / Thêm link IPA & APK' : 'Add/edit apps & download links'}</small>
              </div>
            </button>

            <button className="dash-quick-btn" onClick={() => navigate('/admin/keys')}>
              <span className="btn-icon">🔑</span>
              <div className="btn-text">
                <strong>{lang === 'vi' ? 'Kho Key Bản Quyền' : 'Keys Inventory'}</strong>
                <small>{lang === 'vi' ? 'Nhập Key hàng loạt, quản lý thời hạn' : 'Bulk add keys & duration'}</small>
              </div>
            </button>

            <button className="dash-quick-btn" onClick={() => navigate('/admin/orders')}>
              <span className="btn-icon">💳</span>
              <div className="btn-text">
                <strong>{lang === 'vi' ? 'Cấu Hình VietQR & PayOS' : 'PayOS & VietQR Config'}</strong>
                <small>{lang === 'vi' ? 'Duyệt đơn thủ công, nạp tài khoản' : 'Manual approve & payment settings'}</small>
              </div>
            </button>

            <button className="dash-quick-btn" onClick={() => navigate('/admin/coupons')}>
              <span className="btn-icon">🎁</span>
              <div className="btn-text">
                <strong>{lang === 'vi' ? 'Mã Giảm Giá (Coupons)' : 'Discount Coupons'}</strong>
                <small>{lang === 'vi' ? 'Tạo mã khuyến mãi giảm giá %' : 'Create promo codes & limits'}</small>
              </div>
            </button>

            <button className="dash-quick-btn" onClick={() => navigate('/admin/logs')}>
              <span className="btn-icon">📜</span>
              <div className="btn-text">
                <strong>{lang === 'vi' ? 'Nhật Ký Hoạt Động (Logs)' : 'Activity Audit Logs'}</strong>
                <small>{lang === 'vi' ? 'Theo dõi lượt truy cập & mua hàng' : 'Monitor traffic & event logs'}</small>
              </div>
            </button>

            <button className="dash-quick-btn" onClick={() => navigate('/admin/config')}>
              <span className="btn-icon">⚙️</span>
              <div className="btn-text">
                <strong>{lang === 'vi' ? 'Cấu Hình Hệ Thống' : 'System Configuration'}</strong>
                <small>{lang === 'vi' ? 'Tên thương hiệu, Logo, Social links' : 'Brand name, logo & social'}</small>
              </div>
            </button>
          </div>
        </div>

        {/* Right Column: Recent Transactions List */}
        <div className="manager-panel">
          <div className="panel-header" style={{ justifyContent: 'space-between' }}>
            <h2>📋 {lang === 'vi' ? 'Đơn Hàng Gần Đây' : 'Recent Transactions'}</h2>
            <button className="add-btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => navigate('/admin/orders')}>
              {lang === 'vi' ? 'Xem Tất Cả ➔' : 'View All ➔'}
            </button>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              ⏳ {lang === 'vi' ? 'Đang tải dữ liệu đơn hàng...' : 'Loading recent orders...'}
            </div>
          ) : recentOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              {lang === 'vi' ? 'Chưa có đơn hàng nào phát sinh' : 'No recent orders yet'}
            </div>
          ) : (
            <div className="recent-orders-list">
              {recentOrders.map((o) => (
                <div key={o.id} className="recent-order-item">
                  <div className="order-item-left">
                    <span className={`status-tag-pill ${o.status === 'PAID' ? 'paid' : 'pending'}`}>
                      {o.status === 'PAID' ? '✅ PAID' : '⏳ PENDING'}
                    </span>
                    <div>
                      <strong className="order-item-id">{o.id}</strong>
                      <small className="order-item-app">{o.appName || o.appId}</small>
                    </div>
                  </div>
                  <div className="order-item-right">
                    <span className="order-item-amount">{o.amount.toLocaleString('vi-VN')} VNĐ</span>
                    <small className="order-item-time">{formatDateTime(o.createdAt)}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
