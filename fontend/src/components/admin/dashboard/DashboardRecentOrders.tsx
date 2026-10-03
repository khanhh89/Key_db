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
    <div className="bg-white border border-[#E5E7EB] rounded-[24px] p-7 flex flex-col gap-6 backdrop-blur-md shadow-lg flex-1">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="m-0 text-lg font-bold text-[#1F2937] flex items-center gap-2">📋 {lang === 'vi' ? 'Đơn Hàng Gần Đây' : 'Recent Transactions'}</h2>
        <button
          className="bg-transparent hover:bg-white/5 border border-white/10 text-[#64748B] hover:text-[#1F2937] px-4 py-2 rounded-lg font-bold text-xs cursor-pointer transition-colors border-0"
          onClick={() => navigate('/admin/orders')}
        >
          {lang === 'vi' ? 'Xem Tất Cả ➔' : 'View All ➔'}
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-[#64748B] bg-white rounded-2xl border border-dashed border-[#E5E7EB] flex-1 flex items-center justify-center">
          ⏳ {lang === 'vi' ? 'Đang tải dữ liệu đơn hàng...' : 'Loading recent orders...'}
        </div>
      ) : recentOrders.length === 0 ? (
        <div className="text-center py-10 text-[#64748B] bg-white rounded-2xl border border-dashed border-[#E5E7EB] flex-1 flex items-center justify-center">
          {lang === 'vi' ? 'Chưa có đơn hàng nào phát sinh' : 'No recent orders yet'}
        </div>
      ) : (
        <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
          {recentOrders.map((o) => (
            <div key={o.id} className="flex justify-between items-center p-4 bg-white border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest ${o.status === 'PAID' ? 'bg-[#ECFDF5] text-[#16A34A] border border-[#D1FAE5]' : 'bg-[#FFFBEB] text-[#F59E0B] border border-[#FEF3C7]'}`}>
                  {o.status === 'PAID' ? '✓ PAID' : '⏳ PENDING'}
                </span>
                <div className="flex flex-col">
                  <strong className="text-sm text-[#1E293B] font-mono">{o.id}</strong>
                  <small className="text-[11px] text-[#64748B] truncate max-w-[150px]">{o.appName || o.appId}</small>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-[#1E293B]">{o.amount.toLocaleString('vi-VN')} VNĐ</span>
                <small className="text-[10px] text-[#94A3B8]">{o.createdAt ? formatDateTime(o.createdAt) : ''}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
