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
        className="bg-white border border-[#E2E8F0] rounded-[12px] p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-[#2563EB]"
        onClick={() => navigate('/admin/orders')}
      >
        <div className="flex justify-between items-start mb-3">
          <span className="text-sm font-semibold text-[#64748B]">{lang === 'vi' ? 'Tổng doanh thu' : 'Total Revenue'}</span>
          <div className="w-8 h-8 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center text-sm">💰</div>
        </div>
        <h2 className="text-2xl font-bold text-[#1E293B] m-0 leading-none">{totalRevenue.toLocaleString('vi-VN')} VNĐ</h2>
        <div className="text-xs text-[#94A3B8] mt-3 font-medium">
          <span className="text-[#16A34A]">{paidOrders}</span> {lang === 'vi' ? 'đơn hàng thành công' : 'paid orders'}
        </div>
      </div>

      {/* Metric 2: Orders Count */}
      <div
        className="bg-white border border-[#E2E8F0] rounded-[12px] p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-[#2563EB]"
        onClick={() => navigate('/admin/orders')}
      >
        <div className="flex justify-between items-start mb-3">
          <span className="text-sm font-semibold text-[#64748B]">{lang === 'vi' ? 'Tổng đơn hàng' : 'Total Orders'}</span>
          <div className="w-8 h-8 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center text-sm">💳</div>
        </div>
        <h2 className="text-2xl font-bold text-[#1E293B] m-0 leading-none">{filteredOrders}</h2>
        <div className="text-xs text-[#94A3B8] mt-3 font-medium">
          <span className="text-[#F59E0B]">{pendingOrders}</span> {lang === 'vi' ? 'đơn đang chờ' : 'pending'}
        </div>
      </div>

      {/* Metric 3: Available Keys */}
      <div
        className="bg-white border border-[#E2E8F0] rounded-[12px] p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-[#2563EB]"
        onClick={() => navigate('/admin/keys')}
      >
        <div className="flex justify-between items-start mb-3">
          <span className="text-sm font-semibold text-[#64748B]">{lang === 'vi' ? 'Kho key' : 'VIP Keys'}</span>
          <div className="w-8 h-8 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center text-sm">🔑</div>
        </div>
        <h2 className="text-2xl font-bold text-[#1E293B] m-0 leading-none">{availableKeys} <span className="text-[#94A3B8] text-lg">/ {keys}</span></h2>
        <div className="text-xs text-[#94A3B8] mt-3 font-medium">
          {lang === 'vi' ? 'Sẵn sàng cấp tự động' : 'Ready for delivery'}
        </div>
      </div>

      {/* Metric 4: Total Apps */}
      <div
        className="bg-white border border-[#E2E8F0] rounded-[12px] p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-[#2563EB]"
        onClick={() => navigate('/admin/apps')}
      >
        <div className="flex justify-between items-start mb-3">
          <span className="text-sm font-semibold text-[#64748B]">{lang === 'vi' ? 'Ứng dụng' : 'Apps'}</span>
          <div className="w-8 h-8 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center text-sm">📱</div>
        </div>
        <h2 className="text-2xl font-bold text-[#1E293B] m-0 leading-none">{apps}</h2>
        <div className="text-xs text-[#94A3B8] mt-3 font-medium">
          <span className="text-[#2563EB]">{services}</span> {lang === 'vi' ? 'dịch vụ & social' : 'services & media'}
        </div>
      </div>
    </div>
  );
}
