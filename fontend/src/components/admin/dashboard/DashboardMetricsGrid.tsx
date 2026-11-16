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
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
      {/* Metric 1: Total Revenue */}
      <div
        className="bg-white border border-[#E2E8F0] rounded-[14px] p-3.5 sm:p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-[#2563EB]"
        onClick={() => navigate('/admin/orders')}
      >
        <div className="flex justify-between items-start mb-2 sm:mb-3">
          <span className="text-xs sm:text-sm font-semibold text-[#64748B]">{lang === 'vi' ? 'Tổng doanh thu' : 'Revenue'}</span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center text-xs sm:text-sm shrink-0">💰</div>
        </div>
        <h2 className="text-base sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] m-0 leading-tight">
          {totalRevenue.toLocaleString('vi-VN')} <span className="text-[11px] sm:text-sm font-semibold text-[#64748B]">đ</span>
        </h2>
        <div className="text-[11px] sm:text-xs text-[#94A3B8] mt-2 sm:mt-3 font-medium">
          <span className="text-[#16A34A] font-bold">{paidOrders}</span> {lang === 'vi' ? 'đơn thành công' : 'paid'}
        </div>
      </div>

      {/* Metric 2: Orders Count */}
      <div
        className="bg-white border border-[#E2E8F0] rounded-[14px] p-3.5 sm:p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-[#2563EB]"
        onClick={() => navigate('/admin/orders')}
      >
        <div className="flex justify-between items-start mb-2 sm:mb-3">
          <span className="text-xs sm:text-sm font-semibold text-[#64748B]">{lang === 'vi' ? 'Tổng đơn hàng' : 'Orders'}</span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center text-xs sm:text-sm shrink-0">💳</div>
        </div>
        <h2 className="text-lg sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] m-0 leading-tight">{filteredOrders}</h2>
        <div className="text-[11px] sm:text-xs text-[#94A3B8] mt-2 sm:mt-3 font-medium">
          <span className="text-[#F59E0B] font-bold">{pendingOrders}</span> {lang === 'vi' ? 'đang chờ' : 'pending'}
        </div>
      </div>

      {/* Metric 3: Available Keys */}
      <div
        className="bg-white border border-[#E2E8F0] rounded-[14px] p-3.5 sm:p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-[#2563EB]"
        onClick={() => navigate('/admin/keys')}
      >
        <div className="flex justify-between items-start mb-2 sm:mb-3">
          <span className="text-xs sm:text-sm font-semibold text-[#64748B]">{lang === 'vi' ? 'Kho Key VIP' : 'Keys'}</span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center text-xs sm:text-sm shrink-0">🔑</div>
        </div>
        <h2 className="text-lg sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] m-0 leading-tight">
          {availableKeys} <span className="text-[#94A3B8] text-sm sm:text-lg font-normal">/ {keys}</span>
        </h2>
        <div className="text-[11px] sm:text-xs text-[#94A3B8] mt-2 sm:mt-3 font-medium">
          {lang === 'vi' ? 'Sẵn sàng cấp' : 'Ready'}
        </div>
      </div>

      {/* Metric 4: Total Apps */}
      <div
        className="bg-white border border-[#E2E8F0] rounded-[14px] p-3.5 sm:p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-[#2563EB]"
        onClick={() => navigate('/admin/apps')}
      >
        <div className="flex justify-between items-start mb-2 sm:mb-3">
          <span className="text-xs sm:text-sm font-semibold text-[#64748B]">{lang === 'vi' ? 'Ứng dụng' : 'Apps'}</span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center text-xs sm:text-sm shrink-0">📱</div>
        </div>
        <h2 className="text-lg sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] m-0 leading-tight">{apps}</h2>
        <div className="text-[11px] sm:text-xs text-[#94A3B8] mt-2 sm:mt-3 font-medium">
          <span className="text-[#2563EB] font-bold">{services}</span> {lang === 'vi' ? 'dịch vụ & media' : 'services'}
        </div>
      </div>
    </div>
  );
}
