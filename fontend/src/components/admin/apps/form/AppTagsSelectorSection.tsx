import type { Language } from '../../../../types';

interface AppTagsSelectorSectionProps {
  lang: Language;
  appTagsStr: string;
  setAppTagsStr: (val: string) => void;
}

const QUICK_TAGS = [
  'Hack Map Liên Quân',
  '🎮 Delta Roblox',
  '🍎 Mod iOS IPA',
  '🤖 Mod Android APK',
  '⚡ AUTO KEY 24/7',
  '🛡 ANTI-BAN',
];

export function AppTagsSelectorSection({
  lang,
  appTagsStr,
  setAppTagsStr,
}: AppTagsSelectorSectionProps) {
  const tagsList = appTagsStr ? appTagsStr.split(',').map((t) => t.trim()).filter(Boolean) : [];

  const handleToggleTag = (tag: string) => {
    const isSelected = tagsList.includes(tag);
    if (isSelected) {
      setAppTagsStr(tagsList.filter((t) => t !== tag).join(', '));
    } else {
      setAppTagsStr([...tagsList, tag].join(', '));
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-2">
      <label className="text-xs font-bold text-[#94a3b8]">
        {lang === 'vi' ? '🏷️ Thẻ Nhãn Nổi Bật (Badges):' : '🏷️ Custom App Badges / Tags:'}
      </label>
      <input
        className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
        type="text"
        value={appTagsStr}
        placeholder={lang === 'vi' ? 'VD: Hack Map Liên Quân, 🎮 Delta Roblox' : 'e.g. Hack Map, Delta Roblox'}
        onChange={(e) => setAppTagsStr(e.target.value)}
      />

      <div className="flex gap-2 flex-wrap mt-1">
        {QUICK_TAGS.map((tag) => {
          const sel = tagsList.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => handleToggleTag(tag)}
              className="px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all"
              style={{
                border: sel ? '1px solid #00f2fe' : '1px solid rgba(255,255,255,0.15)',
                background: sel ? 'rgba(0,242,254,0.2)' : 'rgba(15,23,42,0.6)',
                color: sel ? '#00f2fe' : '#94a3b8',
              }}
            >
              {sel ? '✓ ' : '+ '}
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
