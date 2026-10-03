import { useNavigate } from 'react-router-dom';
import type { Language } from '../../../types';

interface AppStockStat {
  app: any; // Can use AppItem here
  availCount: number;
  totalCount: number;
  appPaidOrdersCount: number;
  appRevenue: number;
  isOut: boolean;
  isLow: boolean;
}

interface DashboardStockWarningProps {
  lang: Language;
  lowOrOutStockApps: AppStockStat[];
  renderAppIcon: (icon?: string, fallback?: string) => React.ReactNode;
}

export function DashboardStockWarning({ lang, lowOrOutStockApps, renderAppIcon }: DashboardStockWarningProps) {
  const navigate = useNavigate();

  if (lowOrOutStockApps.length === 0) return null;

  return (
    <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[12px] p-6 relative overflow-hidden">
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-5 border-b border-[#FECACA]">
        <div className="flex items-center gap-3">
          <span className="text-2xl animate-bounce">🚨</span>
          <div>
            <h3 className="m-0 text-lg font-bold text-[#DC2626] tracking-wide">{lang === 'vi' ? 'CẢNH BÁO TỒN KHO KEY (CẦN NẠP THÊM)' : 'KEY STOCK ALERT (REPLENISHMENT NEEDED)'}</h3>
            <p className="m-0 text-xs text-[#991B1B] mt-1">{lowOrOutStockApps.length} {lang === 'vi' ? 'ứng dụng đang cạn kiệt key VIP' : 'apps are running out of VIP keys'}</p>
          </div>
        </div>
        <button
          className="px-6 py-2.5 rounded-xl bg-[#DC2626] text-white font-bold text-sm cursor-pointer transition-all duration-200 hover:bg-[#B91C1C] whitespace-nowrap border-none shadow-[0_1px_2px_rgba(220,38,38,0.2)]"
          onClick={() => navigate('/admin/keys')}
        >
          ⚡ {lang === 'vi' ? 'Nạp Key Ngay' : 'Add Keys Now'} ➔
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {lowOrOutStockApps.map((item) => (
          <div key={item.app.id} className={`flex items-center justify-between p-4 rounded-[12px] border bg-white ${item.isOut ? 'border-[#FECACA]' : 'border-[#FDE68A]'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] flex items-center justify-center border border-[#E2E8F0] shrink-0 text-[#1E293B]">
                {renderAppIcon(item.app.icon)}
              </div>
              <div className="flex flex-col min-w-0">
                <strong className="text-[#1E293B] text-sm truncate max-w-[120px]">{item.app.name}</strong>
                <span className="text-xs text-[#64748B] truncate max-w-[120px]">{item.app.sub || 'VIP APP'}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider ${item.isOut ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]' : 'bg-[#FFFBEB] text-[#F59E0B] border border-[#FEF3C7]'}`}>
                {item.isOut
                  ? (lang === 'vi' ? '🚨 HẾT KEY' : '🚨 OUT OF STOCK')
                  : (lang === 'vi' ? `⚠️ Còn ${item.availCount} Key` : `⚠️ ${item.availCount} Left`)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
