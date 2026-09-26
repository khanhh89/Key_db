import type { Language } from '../../../../types';

interface AppLinksSectionProps {
  lang: Language;
  appDownloadUrl: string;
  setAppDownloadUrl: (val: string) => void;
  appPlatform: 'android' | 'ios' | 'both';
  setAppPlatform: (val: 'android' | 'ios' | 'both') => void;
  appNote: string;
  setAppNote: (val: string) => void;
}

export function AppLinksSection({
  lang,
  appDownloadUrl,
  setAppDownloadUrl,
  appPlatform,
  setAppPlatform,
  appNote,
  setAppNote,
}: AppLinksSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-[#94a3b8]">
            {lang === 'vi' ? 'Link Tải Trực Tiếp (.apk / File / Direct Link):' : 'Direct Download Link (.apk/Direct Link):'}
          </label>
          <input
            className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
            type="text"
            value={appDownloadUrl}
            placeholder="https://drive.google.com/..."
            onChange={(e) => setAppDownloadUrl(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-[#94a3b8]">
            🖥️ {lang === 'vi' ? 'Nền tảng hỗ trợ:' : 'Platform:'}
          </label>
          <select
            className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
            value={appPlatform}
            onChange={(e) => setAppPlatform(e.target.value as 'android' | 'ios' | 'both')}
          >
            <option value="both">🌐 Cả Android + iOS (Hiện cả 2 nút)</option>
            <option value="android">🤖 Android only (Chỉ hiện nút APK)</option>
            <option value="ios">🍎 iOS only (Chỉ hiện nút IPA)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-[#94a3b8]">
          📝 {lang === 'vi' ? 'Ghi chú / Lưu ý khi tải:' : 'Notice / Download Note:'}
        </label>
        <input
          className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
          type="text"
          value={appNote}
          placeholder={lang === 'vi' ? 'VD: Cần xóa bản gốc trước khi cài đặt...' : 'e.g. Uninstall official app first...'}
          onChange={(e) => setAppNote(e.target.value)}
        />
      </div>
    </div>
  );
}
