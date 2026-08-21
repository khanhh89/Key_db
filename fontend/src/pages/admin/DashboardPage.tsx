import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppItem, ServiceItem, SystemConfig, Language, OrderItem, LicenseKeyItem } from '../../types';
import { fetchAllOrdersFromBackend, fetchKeysFromBackend, formatDateTime } from '../../services/api';

interface DashboardPageProps {
  lang: Language;
  apps: AppItem[];
  services: ServiceItem[];
  config: SystemConfig;
}

type DateFilterMode = 'ALL' | 'TODAY' | '7DAYS' | '30DAYS';

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
  const [dateFilter, setDateFilter] = useState<DateFilterMode>('ALL');

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

  // Date Filtering Logic
  const filteredOrders = useMemo(() => {
    if (dateFilter === 'ALL') return orders;
    const now = new Date().getTime();
    return orders.filter((o) => {
      const orderTime = o.createdAt ? new Date(o.createdAt).getTime() : 0;
      if (!orderTime) return true;
      const diffHours = (now - orderTime) / (1000 * 60 * 60);
      if (dateFilter === 'TODAY') return diffHours <= 24;
      if (dateFilter === '7DAYS') return diffHours <= 24 * 7;
      if (dateFilter === '30DAYS') return diffHours <= 24 * 30;
      return true;
    });
  }, [orders, dateFilter]);

  const paidOrders = filteredOrders.filter((o) => o.status === 'PAID');
  const pendingOrders = filteredOrders.filter((o) => o.status === 'PENDING');
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const availableKeys = keys.filter((k) => k.status === 'AVAILABLE');

  // Low Key Stock Calculation per App
  const appStockStats = useMemo(() => {
    return apps.map((app) => {
      const appKeys = keys.filter((k) => k.appId === app.id);
      const availCount = appKeys.filter((k) => k.status === 'AVAILABLE').length;
      const totalCount = appKeys.length;
      const appPaidOrders = orders.filter((o) => o.status === 'PAID' && (o.appId === app.id || o.appName === app.name));
      const appRevenue = appPaidOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

      return {
        app,
        availCount,
        totalCount,
        appPaidOrdersCount: appPaidOrders.length,
        appRevenue,
        isOut: availCount === 0,
        isLow: availCount > 0 && availCount <= 3
      };
    });
  }, [apps, keys, orders]);

  const lowOrOutStockApps = appStockStats.filter((item) => item.isOut || item.isLow);

  const [chartViewMode, setChartViewMode] = useState<'chart' | 'list'>('chart');

  // Helper to render App Icon properly (URL vs Emoji string)
  const renderAppIcon = (icon?: string, fallback = '📱') => {
    if (!icon) return <span className="app-icon-emoji">{fallback}</span>;
    if (icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('/') || icon.startsWith('data:')) {
      return (
        <img
          src={icon}
          alt=""
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            objectFit: 'cover',
            display: 'inline-block',
            verticalAlign: 'middle'
          }}
        />
      );
    }
    return <span className="app-icon-emoji">{icon}</span>;
  };

  const recentOrders = filteredOrders.slice(0, 5);

  // 1-Click Export CSV Revenue & Orders
  const exportDashboardCSV = () => {
    if (orders.length === 0) {
      alert(lang === 'vi' ? 'Chưa có dữ liệu đơn hàng để xuất!' : 'No order data to export!');
      return;
    }
    const headers = ['Mã Đơn Hàng', 'Ứng Dụng', 'Số Tiền (VND)', 'Trạng Thái', 'Mã Chuyển Khoản', 'Key Đã Nhả', 'Thời Gian'];
    const rows = orders.map((o) => [
      o.id,
      o.appName || o.appId,
      o.amount,
      o.status,
      o.paymentCode,
      o.deliveredKey || '',
      o.createdAt ? formatDateTime(o.createdAt) : ''
    ]);
    const csvContent = '\uFEFF' + [headers, ...rows].map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bao_Cao_Doanh_Thu_Don_Hang_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dashboard-wrapper">
      {/* Top Welcome Banner */}
      <div className="dash-welcome-banner">
        <div className="welcome-text">
          <h2>⚡ {lang === 'vi' ? 'Xin chào, Administrator!' : 'Welcome, Administrator!'}</h2>
          <p>
            {lang === 'vi'
              ? `Hệ thống quản trị PayOS & VietQR tự động 24/7 cho thương hiệu ${config.brandName || 'MOD VIP STORE'}`
              : `PayOS & VietQR Automated Dashboard for ${config.brandName || 'MOD VIP STORE'}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="csv-export-btn" onClick={exportDashboardCSV}>
            📊 {lang === 'vi' ? 'Xuất Báo Cáo CSV' : 'Export CSV Report'}
          </button>
          <div className="welcome-status-badge">
            <span className="live-pulse-dot" />
            <span>PAYOS AUTO ONLINE</span>
          </div>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="dash-filter-bar">
        <span className="filter-title">🗓️ {lang === 'vi' ? 'Thời gian thống kê:' : 'Stats Filter:'}</span>
        <div className="filter-pills">
          <button
            className={`filter-pill ${dateFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setDateFilter('ALL')}
          >
            {lang === 'vi' ? 'Tất cả' : 'All Time'}
          </button>
          <button
            className={`filter-pill ${dateFilter === 'TODAY' ? 'active' : ''}`}
            onClick={() => setDateFilter('TODAY')}
          >
            {lang === 'vi' ? 'Hôm nay (24h)' : 'Today'}
          </button>
          <button
            className={`filter-pill ${dateFilter === '7DAYS' ? 'active' : ''}`}
            onClick={() => setDateFilter('7DAYS')}
          >
            {lang === 'vi' ? '7 ngày qua' : 'Last 7 Days'}
          </button>
          <button
            className={`filter-pill ${dateFilter === '30DAYS' ? 'active' : ''}`}
            onClick={() => setDateFilter('30DAYS')}
          >
            {lang === 'vi' ? '30 ngày qua' : 'Last 30 Days'}
          </button>
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
            <h2>{filteredOrders.length}</h2>
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

      {/* Stock Warning Widget if any low/out of stock apps exist */}
      {lowOrOutStockApps.length > 0 && (
        <div className="stock-alert-widget">
          <div className="stock-alert-header">
            <div className="alert-title-wrap">
              <span className="alert-pulse-icon">🚨</span>
              <h3>{lang === 'vi' ? 'CẢNH BÁO TỒN KHO KEY (CẦN NẠP THÊM)' : 'KEY STOCK ALERT (REPLENISHMENT NEEDED)'}</h3>
              <span className="alert-count-badge">{lowOrOutStockApps.length}</span>
            </div>
            <button className="add-keys-nav-btn" onClick={() => navigate('/admin/keys')}>
              ⚡ {lang === 'vi' ? 'Nạp Key Ngay' : 'Add Keys Now'} ➔
            </button>
          </div>

          <div className="stock-alert-grid">
            {lowOrOutStockApps.map((item) => (
              <div key={item.app.id} className={`stock-alert-card ${item.isOut ? 'out' : 'low'}`}>
                <div className="alert-card-left">
                  <div className="alert-app-icon">{renderAppIcon(item.app.icon)}</div>
                  <div className="alert-app-info">
                    <strong>{item.app.name}</strong>
                    <span className="alert-app-sub">{item.app.sub || 'VIP APP'}</span>
                  </div>
                </div>
                <div className="alert-card-right">
                  <span className={`stock-badge ${item.isOut ? 'out' : 'low'}`}>
                    {item.isOut
                      ? (lang === 'vi' ? '🚨 HẾT KEY' : '🚨 OUT OF STOCK')
                      : (lang === 'vi' ? `⚠️ Còn ${item.availCount} Key` : `⚠️ ${item.availCount} Left`)}
                  </span>
                  <button className="mini-action-btn" onClick={() => navigate('/admin/keys')}>
                    ⚡ Nạp
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics & Quick Operations Grid */}
      <div className="dash-two-cols">
        {/* Left Column: Revenue Breakdown per App */}
        <div className="manager-panel">
          <div className="panel-header" style={{ justifyContent: 'space-between' }}>
            <h2>📈 {lang === 'vi' ? 'Phân Tích Doanh Thu Theo App' : 'App Revenue Analysis'}</h2>
            <div className="chart-view-toggle">
              <button
                className={`chart-toggle-btn ${chartViewMode === 'chart' ? 'active' : ''}`}
                onClick={() => setChartViewMode('chart')}
              >
                📊 {lang === 'vi' ? 'Biểu đồ' : 'Chart'}
              </button>
              <button
                className={`chart-toggle-btn ${chartViewMode === 'list' ? 'active' : ''}`}
                onClick={() => setChartViewMode('list')}
              >
                📋 {lang === 'vi' ? 'Danh sách' : 'List'}
              </button>
            </div>
          </div>

          {appStockStats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              {lang === 'vi' ? 'Chưa có ứng dụng nào trong catalog' : 'No apps in catalog'}
            </div>
          ) : chartViewMode === 'chart' ? (
            /* Visual Revenue Bar Chart */
            <div className="revenue-visual-chart">
              <div className="chart-bars-container">
                {appStockStats.map((item) => {
                  const maxRev = Math.max(...appStockStats.map((s) => s.appRevenue), 1);
                  const heightPercent = item.appRevenue > 0
                    ? Math.max(Math.round((item.appRevenue / maxRev) * 100), 12)
                    : 4;

                  return (
                    <div
                      key={item.app.id}
                      className="chart-bar-column"
                      onClick={() => navigate('/admin/keys')}
                    >
                      <div className="bar-tooltip">
                        <strong>{item.app.name}</strong>
                        <span>{item.appRevenue.toLocaleString('vi-VN')} đ</span>
                        <small>({item.appPaidOrdersCount} {lang === 'vi' ? 'đơn' : 'orders'})</small>
                      </div>

                      <div className="column-wrapper">
                        <div
                          className="column-fill"
                          style={{
                            height: `${heightPercent}%`,
                            background: item.appRevenue > 0
                              ? 'linear-gradient(180deg, #38bdf8, #818cf8)'
                              : 'rgba(255, 255, 255, 0.1)'
                          }}
                        >
                          <span className="column-val-badge">
                            {item.appRevenue >= 1000
                              ? `${(item.appRevenue / 1000).toFixed(0)}k`
                              : (item.appRevenue > 0 ? `${item.appRevenue}đ` : '0')}
                          </span>
                        </div>
                      </div>

                      <div className="column-label">
                        <span className="column-icon-wrap">{renderAppIcon(item.app.icon)}</span>
                        <span className="column-app-name">{item.app.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* List Detailed View */
            <div className="app-analytics-list">
              {appStockStats.map((item) => {
                const maxRev = Math.max(...appStockStats.map((s) => s.appRevenue), 1);
                const percent = Math.min(Math.round((item.appRevenue / maxRev) * 100), 100);

                return (
                  <div key={item.app.id} className="app-analytic-row">
                    <div className="analytic-top">
                      <div className="analytic-app-info">
                        <span className="app-icon-mini">{renderAppIcon(item.app.icon)}</span>
                        <strong>{item.app.name}</strong>
                      </div>
                      <div className="analytic-stats-right">
                        <span className="analytic-rev">{item.appRevenue.toLocaleString('vi-VN')} đ</span>
                        <small className="analytic-count">({item.appPaidOrdersCount} {lang === 'vi' ? 'đơn' : 'orders'})</small>
                      </div>
                    </div>

                    <div className="analytic-bar-bg">
                      <div className="analytic-bar-fill" style={{ width: `${percent}%` }} />
                    </div>

                    <div className="analytic-bottom">
                      <small className="stock-info">
                        🔑 Key sẵn có: <strong style={{ color: item.availCount === 0 ? '#ef4444' : (item.availCount <= 3 ? '#f59e0b' : '#10b981') }}>{item.availCount}</strong> / {item.totalCount}
                      </small>
                      <button className="text-link-btn" onClick={() => navigate('/admin/keys')}>
                        {lang === 'vi' ? 'Quản lý Key ➔' : 'Manage ➔'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recent Transactions & Quick Actions */}
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
                    <small className="order-item-time">{o.createdAt ? formatDateTime(o.createdAt) : ''}</small>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Operations Button Grid */}
          <div className="quick-action-grid" style={{ marginTop: '20px' }}>
            <button className="dash-quick-btn" onClick={() => navigate('/admin/apps')}>
              <span className="btn-icon">📱</span>
              <div className="btn-text">
                <strong>{lang === 'vi' ? 'Catalog Apps' : 'Catalog Apps'}</strong>
                <small>{lang === 'vi' ? 'Sửa App, Link IPA/APK' : 'Edit Apps & Links'}</small>
              </div>
            </button>
            <button className="dash-quick-btn" onClick={() => navigate('/admin/keys')}>
              <span className="btn-icon">🔑</span>
              <div className="btn-text">
                <strong>{lang === 'vi' ? 'Kho Key VIP' : 'VIP Keys'}</strong>
                <small>{lang === 'vi' ? 'Nhập Key hàng loạt' : 'Bulk Import Keys'}</small>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
