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

      {/* Primary Metrics Grid (Bento Box) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1: Total Revenue */}
        <div 
          className="group relative overflow-hidden bg-[#0f172a]/70 border border-[#1e293b] rounded-[24px] p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_10px_40px_rgba(56,189,248,0.15)] hover:border-[#38bdf8]/50 backdrop-blur-lg" 
          onClick={() => navigate('/admin/orders')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#38bdf8]/20 to-transparent rounded-full blur-[40px] -mr-10 -mt-10 transition-opacity group-hover:opacity-100 opacity-50"></div>
          <div className="flex justify-between items-start z-10 relative">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-[#94a3b8] tracking-widest uppercase">{lang === 'vi' ? 'TỔNG DOANH THU (PAID)' : 'TOTAL REVENUE'}</span>
              <h2 className="m-0 text-[26px] font-extrabold text-white mt-1">{totalRevenue.toLocaleString('vi-VN')} VNĐ</h2>
              <small className="text-[#38bdf8] font-medium text-xs mt-1">{paidOrders.length} {lang === 'vi' ? 'đơn hàng thành công' : 'paid orders'}</small>
            </div>
            <div className="w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl bg-gradient-to-br from-[#38bdf8]/20 to-[#6366f1]/20 border border-[#38bdf8]/30 shadow-inner group-hover:scale-110 transition-transform duration-300">💰</div>
          </div>
        </div>

        {/* Metric 2: Orders Count */}
        <div 
          className="group relative overflow-hidden bg-[#0f172a]/70 border border-[#1e293b] rounded-[24px] p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_10px_40px_rgba(245,158,11,0.15)] hover:border-[#f59e0b]/50 backdrop-blur-lg" 
          onClick={() => navigate('/admin/orders')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#f59e0b]/20 to-transparent rounded-full blur-[40px] -mr-10 -mt-10 transition-opacity group-hover:opacity-100 opacity-50"></div>
          <div className="flex justify-between items-start z-10 relative">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-[#94a3b8] tracking-widest uppercase">{lang === 'vi' ? 'TỔNG ĐƠN HÀNG' : 'TOTAL ORDERS'}</span>
              <h2 className="m-0 text-[26px] font-extrabold text-white mt-1">{filteredOrders.length}</h2>
              <small className="text-[#f59e0b] font-medium text-xs mt-1">
                {pendingOrders.length} {lang === 'vi' ? 'đơn đang chờ' : 'pending'}
              </small>
            </div>
            <div className="w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl bg-gradient-to-br from-[#f59e0b]/20 to-[#ea580c]/20 border border-[#f59e0b]/30 shadow-inner group-hover:scale-110 transition-transform duration-300">💳</div>
          </div>
        </div>

        {/* Metric 3: Available Keys */}
        <div 
          className="group relative overflow-hidden bg-[#0f172a]/70 border border-[#1e293b] rounded-[24px] p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_10px_40px_rgba(16,185,129,0.15)] hover:border-[#10b981]/50 backdrop-blur-lg" 
          onClick={() => navigate('/admin/keys')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#10b981]/20 to-transparent rounded-full blur-[40px] -mr-10 -mt-10 transition-opacity group-hover:opacity-100 opacity-50"></div>
          <div className="flex justify-between items-start z-10 relative">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-[#94a3b8] tracking-widest uppercase">{lang === 'vi' ? 'KHO KEY KHẢ DỤNG' : 'AVAILABLE VIP KEYS'}</span>
              <h2 className="m-0 text-[26px] font-extrabold text-white mt-1">{availableKeys.length} <span className="text-[#64748b] text-xl">/ {keys.length}</span></h2>
              <small className="text-[#10b981] font-medium text-xs mt-1">{lang === 'vi' ? 'Sẵn sàng cấp tự động' : 'Ready for delivery'}</small>
            </div>
            <div className="w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl bg-gradient-to-br from-[#10b981]/20 to-[#059669]/20 border border-[#10b981]/30 shadow-inner group-hover:scale-110 transition-transform duration-300">🔑</div>
          </div>
        </div>

        {/* Metric 4: Total Apps */}
        <div 
          className="group relative overflow-hidden bg-[#0f172a]/70 border border-[#1e293b] rounded-[24px] p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_10px_40px_rgba(168,85,247,0.15)] hover:border-[#a855f7]/50 backdrop-blur-lg" 
          onClick={() => navigate('/admin/apps')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#a855f7]/20 to-transparent rounded-full blur-[40px] -mr-10 -mt-10 transition-opacity group-hover:opacity-100 opacity-50"></div>
          <div className="flex justify-between items-start z-10 relative">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-[#94a3b8] tracking-widest uppercase">{lang === 'vi' ? 'ỨNG DỤNG CATALOG' : 'CATALOG APPS'}</span>
              <h2 className="m-0 text-[26px] font-extrabold text-white mt-1">{apps.length}</h2>
              <small className="text-[#a855f7] font-medium text-xs mt-1">{services.length} {lang === 'vi' ? 'dịch vụ & social' : 'services & media'}</small>
            </div>
            <div className="w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl bg-gradient-to-br from-[#a855f7]/20 to-[#7e22ce]/20 border border-[#a855f7]/30 shadow-inner group-hover:scale-110 transition-transform duration-300">📱</div>
          </div>
        </div>
      </div>

      {/* Stock Warning Widget if any low/out of stock apps exist */}
      {lowOrOutStockApps.length > 0 && (
        <div className="bg-[#450a0a]/40 border border-[#ef4444]/40 rounded-3xl p-6 relative overflow-hidden shadow-[0_0_40px_rgba(239,68,68,0.1)]">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDIiLz4KPC9zdmc+')] opacity-30 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-5 border-b border-[#ef4444]/20">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-bounce">🚨</span>
              <div>
                <h3 className="m-0 text-lg font-bold text-[#fca5a5] tracking-wide">{lang === 'vi' ? 'CẢNH BÁO TỒN KHO KEY (CẦN NẠP THÊM)' : 'KEY STOCK ALERT (REPLENISHMENT NEEDED)'}</h3>
                <p className="m-0 text-xs text-[#fca5a5]/70 mt-1">{lowOrOutStockApps.length} {lang === 'vi' ? 'ứng dụng đang cạn kiệt key VIP' : 'apps are running out of VIP keys'}</p>
              </div>
            </div>
            <button 
              className="px-6 py-2.5 rounded-xl bg-[#ef4444] text-white font-bold text-sm cursor-pointer transition-all duration-200 hover:bg-[#dc2626] shadow-[0_4px_14px_rgba(239,68,68,0.4)] whitespace-nowrap" 
              onClick={() => navigate('/admin/keys')}
            >
              ⚡ {lang === 'vi' ? 'Nạp Key Ngay' : 'Add Keys Now'} ➔
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
            {lowOrOutStockApps.map((item) => (
              <div key={item.app.id} className={`flex items-center justify-between p-4 rounded-2xl border backdrop-blur-md ${item.isOut ? 'bg-[#7f1d1d]/40 border-[#ef4444]/50' : 'bg-[#78350f]/40 border-[#f59e0b]/50'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center border border-white/10 shrink-0">
                    {renderAppIcon(item.app.icon)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <strong className="text-[#f8fafc] text-sm truncate max-w-[120px]">{item.app.name}</strong>
                    <span className="text-xs text-[#94a3b8] truncate max-w-[120px]">{item.app.sub || 'VIP APP'}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider ${item.isOut ? 'bg-[#ef4444]/20 text-[#fca5a5] border border-[#ef4444]/30' : 'bg-[#f59e0b]/20 text-[#fcd34d] border border-[#f59e0b]/30'}`}>
                    {item.isOut
                      ? (lang === 'vi' ? '🚨 HẾT KEY' : '🚨 OUT OF STOCK')
                      : (lang === 'vi' ? `⚠️ Còn ${item.availCount} Key` : `⚠️ ${item.availCount} Left`)}
                  </span>
                  <button className="text-xs font-bold text-[#fca5a5] hover:text-white underline decoration-[#fca5a5]/40 underline-offset-4 cursor-pointer bg-transparent border-0 p-0" onClick={() => navigate('/admin/keys')}>
                    Nạp thêm
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics & Quick Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Revenue Breakdown per App */}
        <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[24px] p-7 flex flex-col gap-6 backdrop-blur-md shadow-lg">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <h2 className="m-0 text-lg font-bold text-white flex items-center gap-2">📈 {lang === 'vi' ? 'Phân Tích Doanh Thu' : 'App Revenue Analysis'}</h2>
            <div className="flex p-1 bg-[#1e293b]/80 rounded-xl border border-[#334155]">
              <button
                className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors border-0 ${chartViewMode === 'chart' ? 'bg-[#38bdf8] text-[#0f172a] shadow-sm' : 'bg-transparent text-[#94a3b8] hover:text-white'}`}
                onClick={() => setChartViewMode('chart')}
              >
                📊 {lang === 'vi' ? 'Biểu đồ' : 'Chart'}
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors border-0 ${chartViewMode === 'list' ? 'bg-[#38bdf8] text-[#0f172a] shadow-sm' : 'bg-transparent text-[#94a3b8] hover:text-white'}`}
                onClick={() => setChartViewMode('list')}
              >
                📋 {lang === 'vi' ? 'Danh sách' : 'List'}
              </button>
            </div>
          </div>

          {appStockStats.length === 0 ? (
            <div className="text-center py-10 text-[#94a3b8] bg-[#1e293b]/30 rounded-2xl border border-dashed border-[#334155]">
              {lang === 'vi' ? 'Chưa có ứng dụng nào trong catalog' : 'No apps in catalog'}
            </div>
          ) : chartViewMode === 'chart' ? (
            /* Visual Revenue Bar Chart */
            <div className="h-[320px] bg-[#1e293b]/30 rounded-2xl border border-[#334155] p-5 flex items-end justify-around gap-2 overflow-x-auto overflow-y-hidden snap-x">
              {appStockStats.map((item) => {
                const maxRev = Math.max(...appStockStats.map((s) => s.appRevenue), 1);
                const heightPercent = item.appRevenue > 0
                  ? Math.max(Math.round((item.appRevenue / maxRev) * 100), 12)
                  : 4;

                return (
                  <div
                    key={item.app.id}
                    className="flex flex-col items-center justify-end h-full gap-3 group cursor-pointer snap-center relative min-w-[60px]"
                    onClick={() => navigate('/admin/keys')}
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 backdrop-blur-md border border-[#38bdf8]/30 rounded-lg py-2 px-3 flex flex-col items-center whitespace-nowrap shadow-xl pointer-events-none z-20">
                      <strong className="text-xs text-white">{item.app.name}</strong>
                      <span className="text-[11px] text-[#38bdf8] font-bold">{item.appRevenue.toLocaleString('vi-VN')} đ</span>
                      <small className="text-[10px] text-[#94a3b8]">({item.appPaidOrdersCount} {lang === 'vi' ? 'đơn' : 'orders'})</small>
                    </div>

                    <div className="w-10 bg-[#1e293b] rounded-t-xl overflow-hidden relative border-t border-l border-r border-[#334155] group-hover:border-[#38bdf8]/50 transition-colors shadow-inner flex flex-col justify-end" style={{ height: '100%' }}>
                      <div
                        className="w-full relative transition-all duration-700 ease-out flex justify-center items-start pt-2"
                        style={{
                          height: `${heightPercent}%`,
                          background: item.appRevenue > 0
                            ? 'linear-gradient(180deg, #38bdf8, #818cf8)'
                            : 'rgba(255, 255, 255, 0.05)'
                        }}
                      >
                        {item.appRevenue > 0 && (
                          <span className="text-[9px] font-bold text-white bg-black/30 px-1 rounded">
                            {item.appRevenue >= 1000
                              ? `${(item.appRevenue / 1000).toFixed(0)}k`
                              : `${item.appRevenue}đ`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-1 w-full max-w-[64px]">
                      <div className="w-6 h-6 rounded border border-[#334155] overflow-hidden bg-[#0f172a] shrink-0">
                        {renderAppIcon(item.app.icon)}
                      </div>
                      <span className="text-[10px] text-[#94a3b8] text-center truncate w-full group-hover:text-white transition-colors">{item.app.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List Detailed View */
            <div className="flex flex-col gap-3 h-[320px] overflow-y-auto pr-2 custom-scrollbar">
              {appStockStats.map((item) => {
                const maxRev = Math.max(...appStockStats.map((s) => s.appRevenue), 1);
                const percent = Math.min(Math.round((item.appRevenue / maxRev) * 100), 100);

                return (
                  <div key={item.app.id} className="bg-[#1e293b]/40 border border-[#334155]/60 rounded-xl p-4 flex flex-col gap-3 hover:bg-[#1e293b]/70 transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-black/30 overflow-hidden shrink-0">
                          {renderAppIcon(item.app.icon)}
                        </div>
                        <strong className="text-sm text-white">{item.app.name}</strong>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-bold text-[#38bdf8]">{item.appRevenue.toLocaleString('vi-VN')} đ</span>
                        <small className="text-[11px] text-[#94a3b8]">({item.appPaidOrdersCount} {lang === 'vi' ? 'đơn' : 'orders'})</small>
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-[#0f172a] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#38bdf8] to-[#818cf8] rounded-full" style={{ width: `${percent}%` }} />
                    </div>

                    <div className="flex justify-between items-center mt-1">
                      <small className="text-xs text-[#94a3b8]">
                        🔑 Key sẵn có: <strong style={{ color: item.availCount === 0 ? '#ef4444' : (item.availCount <= 3 ? '#f59e0b' : '#10b981') }}>{item.availCount}</strong> / {item.totalCount}
                      </small>
                      <button className="text-xs font-bold text-[#cbd5e1] hover:text-[#38bdf8] bg-transparent border-0 cursor-pointer p-0 underline decoration-transparent hover:decoration-[#38bdf8] transition-all" onClick={() => navigate('/admin/keys')}>
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
        <div className="flex flex-col gap-6">
          <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[24px] p-7 flex flex-col gap-6 backdrop-blur-md shadow-lg flex-1">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <h2 className="m-0 text-lg font-bold text-white flex items-center gap-2">📋 {lang === 'vi' ? 'Đơn Hàng Gần Đây' : 'Recent Transactions'}</h2>
              <button 
                className="bg-transparent hover:bg-white/5 border border-white/10 text-[#cbd5e1] hover:text-white px-4 py-2 rounded-lg font-bold text-xs cursor-pointer transition-colors border-0" 
                onClick={() => navigate('/admin/orders')}
              >
                {lang === 'vi' ? 'Xem Tất Cả ➔' : 'View All ➔'}
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-10 text-[#94a3b8] bg-[#1e293b]/30 rounded-2xl border border-dashed border-[#334155] flex-1 flex items-center justify-center">
                ⏳ {lang === 'vi' ? 'Đang tải dữ liệu đơn hàng...' : 'Loading recent orders...'}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-10 text-[#94a3b8] bg-[#1e293b]/30 rounded-2xl border border-dashed border-[#334155] flex-1 flex items-center justify-center">
                {lang === 'vi' ? 'Chưa có đơn hàng nào phát sinh' : 'No recent orders yet'}
              </div>
            ) : (
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                {recentOrders.map((o) => (
                  <div key={o.id} className="flex justify-between items-center p-4 bg-[#1e293b]/40 border border-[#334155]/60 rounded-xl hover:bg-[#1e293b]/70 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest ${o.status === 'PAID' ? 'bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/30' : 'bg-[#f59e0b]/20 text-[#fcd34d] border border-[#f59e0b]/30'}`}>
                        {o.status === 'PAID' ? '✅ PAID' : '⏳ PENDING'}
                      </span>
                      <div className="flex flex-col">
                        <strong className="text-sm text-white font-mono">{o.id}</strong>
                        <small className="text-[11px] text-[#94a3b8] truncate max-w-[150px]">{o.appName || o.appId}</small>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-[#f8fafc]">{o.amount.toLocaleString('vi-VN')} VNĐ</span>
                      <small className="text-[10px] text-[#64748b]">{o.createdAt ? formatDateTime(o.createdAt) : ''}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
