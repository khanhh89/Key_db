import { useState } from 'react';
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

interface DashboardRevenueChartProps {
  appStockStats: AppStockStat[];
  lang: Language;
  renderAppIcon: (icon?: string, fallback?: string) => React.ReactNode;
}

export function DashboardRevenueChart({ appStockStats, lang, renderAppIcon }: DashboardRevenueChartProps) {
  const navigate = useNavigate();
  const [chartViewMode, setChartViewMode] = useState<'chart' | 'list'>('chart');

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[24px] p-7 flex flex-col gap-6 backdrop-blur-md shadow-lg">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="m-0 text-lg font-bold text-[#1F2937] flex items-center gap-2">📈 {lang === 'vi' ? 'Phân Tích Doanh Thu' : 'App Revenue Analysis'}</h2>
        <div className="flex p-1 bg-white rounded-xl border border-[#E5E7EB]">
          <button
            className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors border-0 ${chartViewMode === 'chart' ? 'bg-[#2563EB] text-[#0f172a] shadow-sm' : 'bg-transparent text-[#64748B] hover:text-[#1F2937]'}`}
            onClick={() => setChartViewMode('chart')}
          >
            📊 {lang === 'vi' ? 'Biểu đồ' : 'Chart'}
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors border-0 ${chartViewMode === 'list' ? 'bg-[#2563EB] text-[#0f172a] shadow-sm' : 'bg-transparent text-[#64748B] hover:text-[#1F2937]'}`}
            onClick={() => setChartViewMode('list')}
          >
            📋 {lang === 'vi' ? 'Danh sách' : 'List'}
          </button>
        </div>
      </div>

      {appStockStats.length === 0 ? (
        <div className="text-center py-10 text-[#64748B] bg-white rounded-2xl border border-dashed border-[#E5E7EB]">
          {lang === 'vi' ? 'Chưa có ứng dụng nào trong catalog' : 'No apps in catalog'}
        </div>
      ) : chartViewMode === 'chart' ? (
        /* Visual Revenue Bar Chart */
        <div className="h-[320px] bg-white rounded-2xl border border-[#E5E7EB] p-5 flex items-end justify-around gap-2 overflow-x-auto overflow-y-hidden snap-x">
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
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-[#E2E8F0] rounded-lg py-2 px-3 flex flex-col items-center whitespace-nowrap shadow-lg pointer-events-none z-20">
                  <strong className="text-xs text-[#1E293B]">{item.app.name}</strong>
                  <span className="text-[11px] text-[#2563EB] font-bold">{item.appRevenue.toLocaleString('vi-VN')} đ</span>
                  <small className="text-[10px] text-[#64748B]">({item.appPaidOrdersCount} {lang === 'vi' ? 'đơn' : 'orders'})</small>
                </div>

                <div className="w-10 bg-white rounded-t-xl overflow-hidden relative border-t border-l border-r border-[#E2E8F0] group-hover:border-[#2563EB] transition-colors flex flex-col justify-end" style={{ height: '100%' }}>
                  <div
                    className="w-full relative transition-all duration-700 ease-out flex justify-center items-start pt-2"
                    style={{
                      height: `${heightPercent}%`,
                      background: item.appRevenue > 0
                        ? '#2563EB'
                        : '#F1F5F9'
                    }}
                  >
                    {item.appRevenue > 0 && (
                      <span className="text-[9px] font-bold text-white px-1 rounded bg-[#1D4ED8]">
                        {item.appRevenue >= 1000
                          ? `${(item.appRevenue / 1000).toFixed(0)}k`
                          : `${item.appRevenue}đ`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1 w-full max-w-[64px]">
                  <div className="w-6 h-6 rounded border border-[#E5E7EB] overflow-hidden bg-white shrink-0">
                    {renderAppIcon(item.app.icon)}
                  </div>
                  <span className="text-[10px] text-[#64748B] text-center truncate w-full group-hover:text-[#1F2937] transition-colors">{item.app.name}</span>
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
              <div key={item.app.id} className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-col gap-3 hover:bg-white transition-colors">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-black/30 overflow-hidden shrink-0">
                      {renderAppIcon(item.app.icon)}
                    </div>
                    <strong className="text-sm text-[#1F2937]">{item.app.name}</strong>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-[#2563EB]">{item.appRevenue.toLocaleString('vi-VN')} đ</span>
                    <small className="text-[11px] text-[#64748B]">({item.appPaidOrdersCount} {lang === 'vi' ? 'đơn' : 'orders'})</small>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                  <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${percent}%` }} />
                </div>

                <div className="flex justify-between items-center mt-1">
                  <small className="text-xs text-[#64748B]">
                    🔑 Key sẵn có: <strong style={{ color: item.availCount === 0 ? '#ef4444' : (item.availCount <= 3 ? '#f59e0b' : '#10b981') }}>{item.availCount}</strong> / {item.totalCount}
                  </small>
                  <button className="text-xs font-bold text-[#64748B] hover:text-[#2563EB] bg-transparent border-0 cursor-pointer p-0 underline decoration-transparent hover:decoration-[#38bdf8] transition-all" onClick={() => navigate('/admin/keys')}>
                    {lang === 'vi' ? 'Quản lý Key ➔' : 'Manage ➔'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
