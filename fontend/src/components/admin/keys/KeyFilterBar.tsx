import type { AppItem, LicenseKeyItem, Language } from '../../../types';
import { isKeyBelongToApp } from '../../../utils/keyUtils';

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
  apps: AppItem[];
  keys: LicenseKeyItem[];
  uniqueDurations: number[];
  countTotalAvailable: number;
  setCurrentPage: (p: number) => void;
}

export function KeyFilterBar({
  lang, searchQuery, setSearchQuery, filterDuration, setFilterDuration,
  filterAppId, setFilterAppId, filterStatus, setFilterStatus,
  apps, keys, uniqueDurations, countTotalAvailable, setCurrentPage
}: KeyFilterBarProps) {
  const hasFilter = filterDuration !== 'ALL' || filterAppId !== 'ALL' || filterStatus !== 'ALL' || searchQuery;

  return (
    <div className="admin-filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', background: '#0b101d', padding: '14px 18px', borderRadius: '16px', border: '1px solid #1e293b', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 220px' }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#94a3b8' }}>🔍 {lang === 'vi' ? 'Tìm Kiếm:' : 'Search:'}</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          placeholder={lang === 'vi' ? 'Nhập mã key hoặc tên app...' : 'Filter key code or app name...'}
          style={{ flex: 1, minWidth: '160px', padding: '8px 12px', borderRadius: '10px', background: '#080c14', border: '1px solid #1e293b', color: '#fff', fontSize: '13px', outline: 'none' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#94a3b8' }}>📦 {lang === 'vi' ? 'Gói Thời Hạn:' : 'Package:'}</span>
        <select
          value={filterDuration}
          onChange={(e) => setFilterDuration(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '10px', background: '#080c14', border: '1px solid #1e293b', color: '#fff', fontSize: '13px' }}
        >
          <option value="ALL">Tất Cả Các Gói ({keys.length} Key)</option>
          {uniqueDurations.map((days) => {
            const label = days >= 365 ? '👑 Gói Vĩnh Viễn' : (days === 1 ? '⚡ Gói 1 Ngày' : (days === 7 ? '🔥 Gói 7 Ngày' : (days === 30 ? '💎 Gói 30 Ngày' : `⏱️ Gói ${days} Ngày`)));
            const count = keys.filter((k) => k.durationDays === days).length;
            return <option key={days} value={String(days)}>{label} ({count} Key)</option>;
          })}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#94a3b8' }}>📱 App Catalog:</span>
        <select
          value={filterAppId}
          onChange={(e) => setFilterAppId(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '10px', background: '#080c14', border: '1px solid #1e293b', color: '#fff', fontSize: '13px' }}
        >
          <option value="ALL">Tất Cả Các App ({keys.length} Key)</option>
          {apps.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({keys.filter((k) => isKeyBelongToApp(k, a.id)).length} Key)
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#94a3b8' }}>📊 Trạng Thái:</span>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          style={{ padding: '8px 12px', borderRadius: '10px', background: '#080c14', border: '1px solid #1e293b', color: '#fff', fontSize: '13px' }}
        >
          <option value="ALL">Tất Cả Trạng Thái</option>
          <option value="AVAILABLE">● Còn Hàng ({countTotalAvailable} Key)</option>
          <option value="SOLD">✓ Đã Bán ({keys.length - countTotalAvailable} Key)</option>
        </select>
      </div>

      {hasFilter && (
        <button
          onClick={() => { setFilterDuration('ALL'); setFilterAppId('ALL'); setFilterStatus('ALL'); setSearchQuery(''); setCurrentPage(1); }}
          style={{ padding: '8px 14px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#f87171', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          ✕ {lang === 'vi' ? 'Xóa Bộ Lọc' : 'Clear Filters'}
        </button>
      )}
    </div>
  );
}
