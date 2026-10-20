import type { AppItem, LicenseKeyItem, Language } from '../../../types';
import { isKeyBelongToApp } from '../../../utils/keyUtils';

export type KeySortOption = 'NEWEST' | 'OLDEST' | 'DURATION_ASC' | 'DURATION_DESC' | 'PRICE_ASC' | 'PRICE_DESC';

interface KeyFilterBarProps {
  lang: Language;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filterDuration: string;
  setFilterDuration: (v: string) => void;
  filterAppId: string;
  setFilterAppId: (v: string) => void;
  filterStatus: 'ALL' | 'AVAILABLE' | 'SOLD';
  setFilterStatus: (v: 'ALL' | 'AVAILABLE' | 'SOLD') => void;
  sortBy: KeySortOption;
  setSortBy: (v: KeySortOption) => void;
  apps: AppItem[];
  keys: LicenseKeyItem[];
  uniqueDurations: number[];
  countTotalAvailable: number;
  setCurrentPage: (p: number) => void;
}

export function KeyFilterBar({
  lang, searchQuery, setSearchQuery, filterDuration, setFilterDuration,
  filterAppId, setFilterAppId, filterStatus, setFilterStatus,
  sortBy, setSortBy,
  apps, keys, uniqueDurations, countTotalAvailable, setCurrentPage
}: KeyFilterBarProps) {
  const hasFilter = filterDuration !== 'ALL' || filterAppId !== 'ALL' || filterStatus !== 'ALL' || Boolean(searchQuery.trim());

  return (
    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 md:p-5 flex flex-wrap gap-3.5 items-center shadow-sm">
      {/* Search Input */}
      <div className="flex items-center gap-2 flex-1 min-w-[220px] bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2 transition-all duration-200 focus-within:border-[#2563EB] focus-within:ring-[3px] focus-within:ring-[#2563EB]/15 shadow-sm">
        <span className="text-sm text-[#64748B]">🔍</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          placeholder={lang === 'vi' ? 'Tìm theo mã key, tên app hoặc nhóm...' : 'Filter key code, app or group...'}
          className="w-full bg-transparent border-0 outline-none text-sm text-[#1E293B] placeholder-[#94A3B8]"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
            className="text-xs text-[#94A3B8] hover:text-[#DC2626] cursor-pointer bg-transparent border-0"
            title="Xóa tìm kiếm"
          >
            ✕
          </button>
        )}
      </div>

      {/* Package Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-[#64748B] whitespace-nowrap">📦 {lang === 'vi' ? 'Gói:' : 'Package:'}</span>
        <select
          value={filterDuration}
          onChange={(e) => { setFilterDuration(e.target.value); setCurrentPage(1); }}
          className="bg-white border border-[#CBD5E1] text-[#1E293B] text-xs font-semibold rounded-xl px-3 py-2 outline-none cursor-pointer hover:border-[#2563EB] focus:ring-[3px] focus:ring-[#2563EB]/15 shadow-sm"
        >
          <option value="ALL">{lang === 'vi' ? 'Tất cả các gói' : 'All packages'} ({keys.length})</option>
          {uniqueDurations.map((days) => {
            const label = days >= 365 ? '👑 Gói Vĩnh Viễn' : (days === 1 ? '⚡ 1 Ngày' : (days === 7 ? '🔥 7 Ngày' : (days === 30 ? '💎 30 Ngày' : `⏱️ ${days} Ngày`)));
            const count = keys.filter((k) => (Number(k.durationDays) || 30) === days).length;
            return <option key={days} value={String(days)}>{label} ({count})</option>;
          })}
        </select>
      </div>

      {/* App Catalog Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-[#64748B] whitespace-nowrap">📱 App:</span>
        <select
          value={filterAppId}
          onChange={(e) => { setFilterAppId(e.target.value); setCurrentPage(1); }}
          className="bg-white border border-[#CBD5E1] text-[#1E293B] text-xs font-semibold rounded-xl px-3 py-2 outline-none cursor-pointer hover:border-[#2563EB] focus:ring-[3px] focus:ring-[#2563EB]/15 shadow-sm max-w-[170px] truncate"
        >
          <option value="ALL">{lang === 'vi' ? 'Tất cả Apps' : 'All Apps'} ({keys.length})</option>
          {apps.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({keys.filter((k) => isKeyBelongToApp(k, a.id)).length})
            </option>
          ))}
        </select>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-[#64748B] whitespace-nowrap">📊 {lang === 'vi' ? 'Kho:' : 'Stock:'}</span>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value as any); setCurrentPage(1); }}
          className="bg-white border border-[#CBD5E1] text-[#1E293B] text-xs font-semibold rounded-xl px-3 py-2 outline-none cursor-pointer hover:border-[#2563EB] focus:ring-[3px] focus:ring-[#2563EB]/15 shadow-sm"
        >
          <option value="ALL">{lang === 'vi' ? 'Tất cả trạng thái' : 'All status'}</option>
          <option value="AVAILABLE">● Còn hàng ({countTotalAvailable})</option>
          <option value="SOLD">✓ Đã bán ({keys.length - countTotalAvailable})</option>
        </select>
      </div>

      {/* Sort Option */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-[#64748B] whitespace-nowrap">↕️ {lang === 'vi' ? 'Xếp:' : 'Sort:'}</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as KeySortOption)}
          className="bg-white border border-[#CBD5E1] text-[#1E293B] text-xs font-semibold rounded-xl px-3 py-2 outline-none cursor-pointer hover:border-[#2563EB] focus:ring-[3px] focus:ring-[#2563EB]/15 shadow-sm"
        >
          <option value="NEWEST">⏳ {lang === 'vi' ? 'Mới nhất trước' : 'Newest first'}</option>
          <option value="OLDEST">⌛ {lang === 'vi' ? 'Cũ nhất trước' : 'Oldest first'}</option>
          <option value="DURATION_DESC">👑 {lang === 'vi' ? 'Thời hạn: Cao ➔ Thấp' : 'Duration: High to Low'}</option>
          <option value="DURATION_ASC">⚡ {lang === 'vi' ? 'Thời hạn: Thấp ➔ Cao' : 'Duration: Low to High'}</option>
          <option value="PRICE_DESC">💰 {lang === 'vi' ? 'Giá: Cao ➔ Thấp' : 'Price: High to Low'}</option>
          <option value="PRICE_ASC">💵 {lang === 'vi' ? 'Giá: Thấp ➔ Cao' : 'Price: Low to High'}</option>
        </select>
      </div>

      {/* Clear Filters Button */}
      {hasFilter && (
        <button
          type="button"
          onClick={() => { setFilterDuration('ALL'); setFilterAppId('ALL'); setFilterStatus('ALL'); setSearchQuery(''); setCurrentPage(1); }}
          className="px-3 py-2 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs font-bold cursor-pointer transition-all hover:bg-[#FEE2E2] flex items-center gap-1.5 shadow-sm"
          title="Xóa tất cả các điều kiện lọc"
        >
          ✕ {lang === 'vi' ? 'Bỏ lọc' : 'Clear'}
        </button>
      )}
    </div>
  );
}
