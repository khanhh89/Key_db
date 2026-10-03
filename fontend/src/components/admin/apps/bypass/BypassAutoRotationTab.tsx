import type { Language } from '../../../../types';
import type { BypassRotationStatus } from '../../../../services/appsApi';

interface BypassAutoRotationTabProps {
  lang: Language;
  linkPoolText: string;
  setLinkPoolText: (val: string) => void;
  rotationMode: 'DAILY_SEQUENTIAL' | 'DAILY_RANDOM';
  setRotationMode: (mode: 'DAILY_SEQUENTIAL' | 'DAILY_RANDOM') => void;
  autoRotateEnabled: boolean;
  setAutoRotateEnabled: (val: boolean) => void;
  rotationStatus: BypassRotationStatus | null;
  isRotatingNow: boolean;
  onForceRotateNow: () => void;
}

export function BypassAutoRotationTab({
  lang,
  linkPoolText,
  setLinkPoolText,
  rotationMode,
  setRotationMode,
  autoRotateEnabled,
  setAutoRotateEnabled,
  rotationStatus,
  isRotatingNow,
  onForceRotateNow,
}: BypassAutoRotationTabProps) {
  const parsedPoolCount = linkPoolText
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.startsWith('http://') || s.startsWith('https://') || s.startsWith('//')).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Active Running Status Card */}
      {rotationStatus && (
        <div className="bg-[#2563EB]/[0.07] border border-[#2563EB] rounded-[14px] p-3.5 flex justify-between items-center flex-wrap gap-2.5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]" />
              <span className="text-xs font-extrabold text-[#2563EB]">
                {lang === 'vi' ? 'LINK ĐANG CHẠY HÔM NAY' : 'ACTIVE LINK TODAY'}
              </span>
              {rotationStatus.totalLinks > 0 && (
                <span className="text-[11px] bg-[#2563EB]/20 text-[#7dd3fc] px-1.5 py-0.5 rounded font-bold">
                  Link {rotationStatus.currentIndex + 1}/{rotationStatus.totalLinks}
                </span>
              )}
            </div>
            <div className="text-xs text-[#f8fafc] font-mono font-bold break-all">
              {rotationStatus.activeLink || (lang === 'vi' ? 'Chưa có link' : 'No link set')}
            </div>
          </div>

          {rotationStatus.totalLinks > 1 && (
            <button
              type="button"
              onClick={onForceRotateNow}
              disabled={isRotatingNow}
              className="px-3.5 py-2 rounded-xl border border-[#2563EB] bg-[#2563EB]/15 text-[#2563EB] font-bold text-xs cursor-pointer hover:bg-[#2563EB]/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
              title={lang === 'vi' ? 'Bấm để đổi ngay sang link tiếp theo mà không cần đợi sang ngày mới' : 'Rotate to next link now'}
            >
              {isRotatingNow ? '⏳...' : `⚡ ${lang === 'vi' ? 'Đổi sang link kế tiếp ngay' : 'Rotate Next Now'}`}
            </button>
          )}
        </div>
      )}

      {/* Textarea for 2-3 links */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-[#1F2937]">
            📝 {lang === 'vi' ? 'Dán danh sách 2 - 3 Link Vượt (Mỗi dòng 1 link):' : 'Paste 2 - 3 Bypass Links (1 per line):'}
          </label>
          <span className="text-[11px] font-bold" style={{ color: parsedPoolCount >= 2 ? '#22c55e' : '#94a3b8' }}>
            {parsedPoolCount} {lang === 'vi' ? 'link hợp lệ' : 'valid links'}
          </span>
        </div>

        <textarea
          rows={4}
          value={linkPoolText}
          onChange={(e) => setLinkPoolText(e.target.value)}
          placeholder={`https://link1s.com/link-1\nhttps://link4m.co/link-2\nhttps://yeumoney.com/link-3`}
          className="w-full p-3 rounded-xl border border-[#2563EB] bg-[#F5F7FB] text-[#1F2937] text-xs font-mono leading-relaxed outline-none resize-y"
        />
        <div className="text-[11px] text-[#64748b]">
          💡 {lang === 'vi'
            ? 'Ví dụ: Dán 3 link. Hệ thống sẽ dùng Link 1 vào hôm nay, Link 2 vào ngày mai, Link 3 vào ngày mốt và tự xoay vòng lặp lại lúc 00:00.'
            : 'Example: 3 links will rotate 1 -> 2 -> 3 daily at 00:00 automatically.'}
        </div>
      </div>

      {/* Rotation Strategy Options */}
      <div className="bg-[#0b1329] border border-[#E5E7EB] rounded-[14px] p-3.5 flex flex-col gap-3">
        <div className="text-xs font-bold text-[#1F2937]">
          ⚙️ {lang === 'vi' ? 'Chế độ xoay link:' : 'Rotation Strategy:'}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <label
            className="flex items-start gap-2 cursor-pointer p-2.5 rounded-lg transition-all"
            style={{
              background: rotationMode === 'DAILY_SEQUENTIAL' ? 'rgba(56,189,248,0.12)' : 'transparent',
              border: rotationMode === 'DAILY_SEQUENTIAL' ? '1px solid rgba(56,189,248,0.4)' : '1px solid transparent',
            }}
          >
            <input
              type="radio"
              name="rotMode"
              checked={rotationMode === 'DAILY_SEQUENTIAL'}
              onChange={() => setRotationMode('DAILY_SEQUENTIAL')}
              className="mt-1 accent-[#38bdf8]"
            />
            <div>
              <div className="text-xs font-bold text-[#f8fafc]">
                {lang === 'vi' ? 'Tuần tự mỗi ngày' : 'Daily Sequential'}
              </div>
              <div className="text-[11px] text-[#64748B]">
                {lang === 'vi' ? 'Link 1 ➔ Link 2 ➔ Link 3' : '1 ➔ 2 ➔ 3 cycle'}
              </div>
            </div>
          </label>

          <label
            className="flex items-start gap-2 cursor-pointer p-2.5 rounded-lg transition-all"
            style={{
              background: rotationMode === 'DAILY_RANDOM' ? 'rgba(56,189,248,0.12)' : 'transparent',
              border: rotationMode === 'DAILY_RANDOM' ? '1px solid rgba(56,189,248,0.4)' : '1px solid transparent',
            }}
          >
            <input
              type="radio"
              name="rotMode"
              checked={rotationMode === 'DAILY_RANDOM'}
              onChange={() => setRotationMode('DAILY_RANDOM')}
              className="mt-1 accent-[#38bdf8]"
            />
            <div>
              <div className="text-xs font-bold text-[#f8fafc]">
                {lang === 'vi' ? 'Ngẫu nhiên mỗi ngày' : 'Daily Random'}
              </div>
              <div className="text-[11px] text-[#64748B]">
                {lang === 'vi' ? 'Chọn ngẫu nhiên 1 link khác' : 'Random different link'}
              </div>
            </div>
          </label>
        </div>

        <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-xs text-[#64748B] font-semibold">
            ⏰ {lang === 'vi' ? 'Tự động kích hoạt đổi link lúc 00:00 mỗi đêm' : 'Auto trigger rotation at 00:00 every midnight'}
          </span>
          <input
            type="checkbox"
            checked={autoRotateEnabled}
            onChange={(e) => setAutoRotateEnabled(e.target.checked)}
            className="w-4 h-4 accent-[#38bdf8] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
