import type { Dispatch, SetStateAction } from 'react';
import type { AppItem, Language } from '../../../../types';

interface BypassAppSelectorProps {
  lang: Language;
  apps: AppItem[];
  selectedAppIds: string[];
  setSelectedAppIds: Dispatch<SetStateAction<string[]>>;
}

export function BypassAppSelector({
  lang,
  apps,
  selectedAppIds,
  setSelectedAppIds,
}: BypassAppSelectorProps) {
  const toggle = (appId: string) =>
    setSelectedAppIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );

  const handleSelectAll = () => setSelectedAppIds(apps.map((a) => a.id));
  const handleDeselectAll = () => setSelectedAppIds([]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-[#1F2937] flex items-center gap-2">
          📱 {lang === 'vi' ? 'Chọn App áp dụng link:' : 'Select Apps to apply link:'}
          <span className="bg-[#2563EB]/20 text-[#2563EB] px-2 py-0.5 rounded text-xs font-extrabold">
            {selectedAppIds.length}/{apps.length}
          </span>
        </label>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-[11px] px-2.5 py-1 rounded-lg border border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB] cursor-pointer font-bold hover:bg-[#2563EB]/20 transition-all"
          >
            {lang === 'vi' ? '✓ Chọn tất cả' : '✓ Select all'}
          </button>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-600 bg-slate-800 text-slate-400 cursor-pointer font-bold hover:bg-slate-700 transition-all"
          >
            {lang === 'vi' ? '✕ Bỏ chọn' : '✕ Deselect'}
          </button>
        </div>
      </div>

      <div className="max-h-[170px] overflow-y-auto flex flex-col gap-1 p-1 bg-[#F5F7FB] rounded-xl border border-[#E5E7EB]">
        {apps.map((a) => (
          <label
            key={a.id}
            className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all"
            style={{
              background: selectedAppIds.includes(a.id) ? 'rgba(56,189,248,0.12)' : 'transparent',
              border: selectedAppIds.includes(a.id) ? '1px solid rgba(56,189,248,0.3)' : '1px solid transparent',
            }}
          >
            <input
              type="checkbox"
              checked={selectedAppIds.includes(a.id)}
              onChange={() => toggle(a.id)}
              className="w-4 h-4 accent-[#38bdf8] cursor-pointer shrink-0"
            />
            {a.icon && (a.icon.startsWith('http') || a.icon.startsWith('data:image/') || a.icon.startsWith('/')) ? (
              <img src={a.icon} alt={a.name} className="w-6 h-6 rounded object-cover shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-xs shrink-0">
                📱
              </div>
            )}
            <span
              className="text-xs flex-1 truncate"
              style={{
                color: selectedAppIds.includes(a.id) ? '#7dd3fc' : '#cbd5e1',
                fontWeight: selectedAppIds.includes(a.id) ? 700 : 400,
              }}
            >
              {a.name}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
