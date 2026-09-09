import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppItem, ServiceItem, SystemConfig, Language, OrderItem, LicenseKeyItem } from '../../types';
import { fetchAllOrdersFromBackend, fetchKeysFromBackend, formatDateTime } from '../../services/api';
import { DashboardMetricsGrid } from '../../components/admin/dashboard/DashboardMetricsGrid';
import { DashboardStockWarning } from '../../components/admin/dashboard/DashboardStockWarning';
import { DashboardRevenueChart } from '../../components/admin/dashboard/DashboardRevenueChart';
import { DashboardRecentOrders } from '../../components/admin/dashboard/DashboardRecentOrders';

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
    <div className="flex flex-col gap-6 w-full animate-fade-in-up">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] border border-[#334155]/60 rounded-3xl p-8 flex flex-col md:flex-row justify-between md:items-center gap-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        {/* Glow effect in background */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-[#38bdf8] rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-[#818cf8] rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
        
        <div className="flex flex-col gap-2 z-10">
          <h2 className="m-0 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-[#cbd5e1] flex items-center gap-3">
            ⚡ {lang === 'vi' ? 'Xin chào, Administrator!' : 'Welcome, Administrator!'}
          </h2>
          <p className="m-0 text-sm text-[#94a3b8] font-medium tracking-wide">
            {lang === 'vi'
              ? `Hệ thống quản trị PayOS & VietQR tự động 24/7 cho thương hiệu ${config.brandName || 'MOD VIP STORE'}`
              : `PayOS & VietQR Automated Dashboard for ${config.brandName || 'MOD VIP STORE'}`}
          </p>
        </div>
        <div className="flex gap-4 items-center flex-wrap z-10">
          <button 
            className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm cursor-pointer transition-all duration-300 flex items-center gap-2 hover:-translate-y-1 hover:shadow-lg backdrop-blur-md" 
            onClick={exportDashboardCSV}
          >
            📊 {lang === 'vi' ? 'Xuất Báo Cáo CSV' : 'Export CSV Report'}
          </button>
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] font-bold text-xs tracking-wider backdrop-blur-sm shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-ping" style={{ animationDuration: '2s' }} />
            <span>PAYOS AUTO ONLINE</span>
          </div>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-[#0f172a]/60 border border-[#1e293b] rounded-2xl p-4 backdrop-blur-md">
        <span className="text-sm font-bold text-[#e2e8f0] px-2 whitespace-nowrap">🗓️ {lang === 'vi' ? 'Thời gian thống kê:' : 'Stats Filter:'}</span>
        <div className="flex flex-wrap gap-2">
          {['ALL', 'TODAY', '7DAYS', '30DAYS'].map((filter) => {
            const labels: any = { ALL: 'Tất cả', TODAY: 'Hôm nay (24h)', '7DAYS': '7 ngày qua', '30DAYS': '30 ngày qua' };
            const labelsEn: any = { ALL: 'All Time', TODAY: 'Today', '7DAYS': 'Last 7 Days', '30DAYS': 'Last 30 Days' };
            const isActive = dateFilter === filter;
            return (
              <button
                key={filter}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                  isActive 
                  ? 'bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white shadow-[0_4px_12px_rgba(56,189,248,0.4)] border-0' 
                  : 'bg-[#1e293b]/50 text-[#94a3b8] border border-[#334155] hover:bg-[#1e293b] hover:text-[#cbd5e1]'
                }`}
                onClick={() => setDateFilter(filter as DateFilterMode)}
              >
                {lang === 'vi' ? labels[filter] : labelsEn[filter]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Dashboard Metrics Grid (Refactored) */}
      <DashboardMetricsGrid
        lang={lang}
        totalRevenue={totalRevenue}
        paidOrders={paidOrders.length}
        filteredOrders={filteredOrders.length}
        pendingOrders={pendingOrders.length}
        availableKeys={availableKeys.length}
        keys={keys.length}
        apps={apps.length}
        services={services.length}
      />

      {/* Stock Warning Widget (Refactored) */}
      <DashboardStockWarning
        lang={lang}
        lowOrOutStockApps={lowOrOutStockApps}
        renderAppIcon={renderAppIcon}
      />

      {/* Analytics & Quick Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Revenue Breakdown per App (Refactored) */}
        <DashboardRevenueChart
          appStockStats={appStockStats}
          lang={lang}
          renderAppIcon={renderAppIcon}
        />

        {/* Right Column: Recent Transactions & Quick Actions */}
        <div className="flex flex-col gap-6">
          <DashboardRecentOrders
            lang={lang}
            recentOrders={recentOrders}
            isLoading={isLoading}
          />

          {/* Quick Operations Button Grid */}
          <div className="grid grid-cols-2 gap-4 shrink-0">
            <button 
              className="group bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-[#334155] hover:border-[#38bdf8]/50 p-4 rounded-2xl flex items-center gap-4 text-left cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" 
              onClick={() => navigate('/admin/apps')}
            >
              <span className="w-10 h-10 rounded-xl bg-[#38bdf8]/10 text-[#38bdf8] flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">📱</span>
              <div className="flex flex-col">
                <strong className="text-sm text-white">{lang === 'vi' ? 'Catalog Apps' : 'Catalog Apps'}</strong>
                <small className="text-[11px] text-[#94a3b8] mt-0.5">{lang === 'vi' ? 'Quản lý App & Link' : 'Edit Apps & Links'}</small>
              </div>
            </button>
            <button 
              className="group bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-[#334155] hover:border-[#a855f7]/50 p-4 rounded-2xl flex items-center gap-4 text-left cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" 
              onClick={() => navigate('/admin/keys')}
            >
              <span className="w-10 h-10 rounded-xl bg-[#a855f7]/10 text-[#a855f7] flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">🔑</span>
              <div className="flex flex-col">
                <strong className="text-sm text-white">{lang === 'vi' ? 'Kho Key VIP' : 'VIP Keys'}</strong>
                <small className="text-[11px] text-[#94a3b8] mt-0.5">{lang === 'vi' ? 'Nhập Key hàng loạt' : 'Bulk Import Keys'}</small>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
