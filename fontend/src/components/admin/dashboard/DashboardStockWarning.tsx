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
  );
}
