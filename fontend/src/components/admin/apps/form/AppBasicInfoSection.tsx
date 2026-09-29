import type { RefObject } from 'react';
import type { Language } from '../../../../types';

interface AppBasicInfoSectionProps {
  lang: Language;
  appName: string;
  setAppName: (val: string) => void;
  appSub: string;
  setAppSub: (val: string) => void;
  appAllowSellKey: boolean;
  setAppAllowSellKey: (val: boolean) => void;
  appAllowFreeKey: boolean;
  setAppAllowFreeKey: (val: boolean) => void;
  appRequireBypass: boolean;
  setAppRequireBypass: (val: boolean) => void;
  appHidden: boolean;
  setAppHidden: (val: boolean) => void;
  appNameInputRef: RefObject<HTMLInputElement | null>;
}

export function AppBasicInfoSection({
  lang,
  appName,
  setAppName,
  appSub,
  setAppSub,
  appAllowSellKey,
  setAppAllowSellKey,
  appAllowFreeKey,
  setAppAllowFreeKey,
  appRequireBypass,
  setAppRequireBypass,
  appHidden,
  setAppHidden,
  appNameInputRef,
}: AppBasicInfoSectionProps) {
  return (
    <div className="bg-[#1e293b]/40 border border-white/10 rounded-[18px] p-5 flex flex-col gap-4">
      <div className="text-[#38bdf8] font-heading font-bold text-sm tracking-wide flex items-center gap-2">
        📌 {lang === 'vi' ? '1. Thông Tin Cơ Bản App' : '1. Basic App Information'}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-[#94a3b8]">
            {lang === 'vi' ? 'Tên App (*):' : 'App Name (*):'}
          </label>
          <input
            className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
            type="text"
            ref={appNameInputRef}
            value={appName}
            placeholder={lang === 'vi' ? 'VD: Liên Quân Mobile Mod' : 'e.g. Arena of Valor Mod'}
            onChange={(e) => setAppName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-[#94a3b8]">
            {lang === 'vi' ? 'Tên Game / Subtitle (*):' : 'Sub Title (*):'}
          </label>
          <input
            className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
            type="text"
            value={appSub}
            placeholder={lang === 'vi' ? 'VD: Hack Map + Cam Xa + Skin' : 'e.g. Map Hack + Drone View'}
            onChange={(e) => setAppSub(e.target.value)}
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-col gap-3 pt-2">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={appAllowSellKey}
            onChange={(e) => setAppAllowSellKey(e.target.checked)}
            className="w-[18px] h-[18px] accent-[#00f2fe] cursor-pointer"
          />
          <span className="text-sm font-bold" style={{ color: appAllowSellKey ? '#00f2fe' : '#ef4444' }}>
            🛒 {lang === 'vi' ? 'Cho Phép Bán Key VIP (Hiển thị nút Mua Key trên trang chủ)' : 'Enable VIP Key Sales'}
          </span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={appAllowFreeKey}
            onChange={(e) => setAppAllowFreeKey(e.target.checked)}
            className="w-[18px] h-[18px] accent-[#22c55e] cursor-pointer"
          />
          <span className="text-sm font-bold" style={{ color: appAllowFreeKey ? '#22c55e' : '#ef4444' }}>
            🔑 {lang === 'vi' ? 'Cho Phép Cấp Key Free (Hiển thị nút Lấy Key Free trên trang chủ)' : 'Enable Free Key'}
          </span>
        </label>

        {appAllowFreeKey && (
          <label className="flex items-center gap-2.5 cursor-pointer select-none ml-6">
            <input
              type="checkbox"
              checked={appRequireBypass}
              onChange={(e) => setAppRequireBypass(e.target.checked)}
              className="w-[18px] h-[18px] accent-[#a855f7] cursor-pointer"
            />
            <span className="text-sm font-bold" style={{ color: appRequireBypass ? '#a855f7' : '#94a3b8' }}>
              ⛓️ {lang === 'vi' ? 'Yêu cầu Vượt Link (Bật = Bắt buộc vượt link để lấy Key Free)' : 'Require Bypass for Free Key'}
            </span>
          </label>
        )}

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={appHidden}
            onChange={(e) => setAppHidden(e.target.checked)}
            className="w-[18px] h-[18px] accent-[#f97316] cursor-pointer"
          />
          <span className="text-sm font-bold" style={{ color: appHidden ? '#f97316' : '#94a3b8' }}>
            🙈 {lang === 'vi' ? 'Ẩn App này khỏi Trang chủ (Khách hàng sẽ KHÔNG thấy App trên Trang chủ)' : 'Hide App from Homepage'}
          </span>
        </label>
      </div>
    </div>
  );
}
