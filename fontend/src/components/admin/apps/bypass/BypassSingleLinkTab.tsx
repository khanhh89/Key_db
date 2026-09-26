import type { Language } from '../../../../types';

interface BypassSingleLinkTabProps {
  lang: Language;
  bypassLinkUrl: string;
  setBypassLinkUrl: (url: string) => void;
}

export function BypassSingleLinkTab({
  lang,
  bypassLinkUrl,
  setBypassLinkUrl,
}: BypassSingleLinkTabProps) {
  return (
    <div className="flex flex-col gap-2 mb-4">
      <label className="text-xs font-bold text-[#e2e8f0]">
        {lang === 'vi' ? '🔗 URL Link Vượt (Bypass Link) dùng chung:' : '🔗 Shared Bypass Link URL:'}
      </label>
      <input
        type="text"
        value={bypassLinkUrl}
        onChange={(e) => setBypassLinkUrl(e.target.value)}
        placeholder={lang === 'vi' ? 'Nhập URL Link Vượt (vd: https://link1s...)' : 'Enter Bypass Link URL...'}
        className="w-full px-4 py-3 rounded-xl border border-[#38bdf8]/40 bg-[#080c14] text-white text-xs font-mono font-bold outline-none"
      />
    </div>
  );
}
