import { useNavigate } from 'react-router-dom';
import type { Language } from '../../../types';

interface DashboardMetricsGridProps {
  lang: Language;
  totalRevenue: number;
  paidOrders: number;
  filteredOrders: number;
  pendingOrders: number;
  availableKeys: number;
  keys: number;
  apps: number;
  services: number;
}

export function DashboardMetricsGrid({
  lang, totalRevenue, paidOrders, filteredOrders, pendingOrders, availableKeys, keys, apps, services
}: DashboardMetricsGridProps) {
  const navigate = useNavigate();

  return (
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
            <small className="text-[#38bdf8] font-medium text-xs mt-1">{paidOrders} {lang === 'vi' ? 'đơn hàng thành công' : 'paid orders'}</small>
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
            <h2 className="m-0 text-[26px] font-extrabold text-white mt-1">{filteredOrders}</h2>
            <small className="text-[#f59e0b] font-medium text-xs mt-1">
              {pendingOrders} {lang === 'vi' ? 'đơn đang chờ' : 'pending'}
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
            <h2 className="m-0 text-[26px] font-extrabold text-white mt-1">{availableKeys} <span className="text-[#64748b] text-xl">/ {keys}</span></h2>
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
            <h2 className="m-0 text-[26px] font-extrabold text-white mt-1">{apps}</h2>
            <small className="text-[#a855f7] font-medium text-xs mt-1">{services} {lang === 'vi' ? 'dịch vụ & social' : 'services & media'}</small>
          </div>
          <div className="w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl bg-gradient-to-br from-[#a855f7]/20 to-[#7e22ce]/20 border border-[#a855f7]/30 shadow-inner group-hover:scale-110 transition-transform duration-300">📱</div>
        </div>
      </div>
    </div>
  );
}
