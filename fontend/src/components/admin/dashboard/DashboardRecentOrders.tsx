import { useNavigate } from 'react-router-dom';
import type { Language, OrderItem } from '../../../types';
import { formatDateTime } from '../../../services/api';

interface DashboardRecentOrdersProps {
  lang: Language;
  recentOrders: OrderItem[];
  isLoading: boolean;
}

export function DashboardRecentOrders({ lang, recentOrders, isLoading }: DashboardRecentOrdersProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 backdrop-blur-md shadow-sm flex-1">
      <div className="flex justify-between items-center flex-wrap gap-2 sm:gap-4">
        <h2 className="m-0 text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
          📋 {lang === 'vi' ? 'Đơn Hàng Gần Đây' : 'Recent Transactions'}
        </h2>
        <button
          className="bg-transparent hover:bg-black/5 dark:hover:bg-white/5 border border-[#E2E8F0] dark:border-white/10 text-[#2563EB] px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-colors"
          onClick={() => navigate('/admin/orders')}
        >
          {lang === 'vi' ? 'Xem Tất Cả ➔' : 'View All ➔'}
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-[#64748B] bg-[#F8FAFC] rounded-xl border border-dashed border-[#E5E7EB] flex-1 flex items-center justify-center text-xs">
          ⏳ {lang === 'vi' ? 'Đang tải dữ liệu đơn hàng...' : 'Loading recent orders...'}
        </div>
      ) : recentOrders.length === 0 ? (
        <div className="text-center py-8 text-[#64748B] bg-[#F8FAFC] rounded-xl border border-dashed border-[#E5E7EB] flex-1 flex items-center justify-center text-xs">
          {lang === 'vi' ? 'Chưa có đơn hàng nào phát sinh' : 'No recent orders yet'}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto max-h-[360px]">
          {recentOrders.map((o) => (
            <div key={o.id} className="flex justify-between items-center p-3 sm:p-4 bg-white border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-colors cursor-pointer gap-2">
              <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] font-bold tracking-wider shrink-0 ${o.status === 'PAID' ? 'bg-[#ECFDF5] text-[#16A34A] border border-[#D1FAE5]' : 'bg-[#FFFBEB] text-[#F59E0B] border border-[#FEF3C7]'}`}>
                  {o.status === 'PAID' ? '✓ PAID' : '⏳ PENDING'}
                </span>
                <div className="flex flex-col min-w-0">
                  <strong className="text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] font-mono truncate">{o.id}</strong>
                  <small className="text-[10px] sm:text-[11px] text-[#64748B] truncate max-w-[120px] sm:max-w-[160px]">{o.appName || o.appId}</small>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{o.amount.toLocaleString('vi-VN')} đ</span>
                <small className="text-[9px] sm:text-[10px] text-[#94A3B8]">{o.createdAt ? formatDateTime(o.createdAt).split(' ')[0] : ''}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
