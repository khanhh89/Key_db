import type { LicenseKeyItem, KeyPricePreset, Language } from '../../../types';

interface PackageStat { days: number; count: number; total: number; }

interface KeyStatsGridProps {
  keys: LicenseKeyItem[];
  presets: KeyPricePreset[];
  filterDuration: string;
  setFilterDuration: (v: string) => void;
  countTotalAvailable: number;
  totalInventoryValue: number;
  packageStatsMap: PackageStat[];
  lang: Language;
}

export function KeyStatsGrid({
  keys, presets, filterDuration, setFilterDuration,
  countTotalAvailable, totalInventoryValue, packageStatsMap, lang
}: KeyStatsGridProps) {
  return (
    <div className="key-stats-grid">
      <div className="key-stat-card">
        <span>📦 TỔNG KEY CÒN HÀNG</span>
        <strong>{countTotalAvailable} Key</strong>
        {totalInventoryValue > 0 && (
          <small style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold', display: 'block', marginTop: '2px' }}>
            💰 Tổng trị giá: {totalInventoryValue.toLocaleString()} đ
          </small>
        )}
      </div>

      {packageStatsMap.map(({ days, count }) => {
        let icon = '⏱️';
        let title = `GÓI ${days} NGÀY`;
        let color = '#38bdf8';

        if (days === 1) { icon = '⚡'; color = '#fb923c'; }
        else if (days === 7) { icon = '📅'; color = '#c084fc'; }
        else if (days === 30) { icon = '🌟'; color = '#38bdf8'; }
        else if (days >= 365) { icon = '👑'; title = 'GÓI VĨNH VIỄN'; color = '#facc15'; }

        const matchingPreset = presets.find((p) => p.durationDays === days);
        const matchingWithPrice = keys.find((k) => k.durationDays === days && (k.price || k.price === 0));
        const currentPkgPrice = matchingPreset?.price ?? matchingWithPrice?.price;
        const isActiveFilter = filterDuration === String(days);

        let healthLabel = '🟢 Còn hàng';
        let healthColor = '#10b981';
        if (count === 0) { healthLabel = '🔴 Hết hàng'; healthColor = '#ef4444'; }
        else if (count < 5) { healthLabel = '🟡 Sắp hết'; healthColor = '#f59e0b'; }

        return (
          <div
            className={`key-stat-card ${isActiveFilter ? 'active-filter-card' : ''}`}
            key={days}
            onClick={() => setFilterDuration(isActiveFilter ? 'ALL' : String(days))}
            style={{
              cursor: 'pointer',
              border: isActiveFilter ? '1px solid #38bdf8' : undefined,
              boxShadow: isActiveFilter ? '0 0 16px rgba(56, 189, 248, 0.4)' : undefined
            }}
            title="Bấm để lọc nhanh gói này"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{icon} {title}</span>
              <span style={{ fontSize: '10px', color: healthColor, fontWeight: 'bold' }}>{healthLabel}</span>
            </div>
            <strong style={{ color }}>{count} Key</strong>
            <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>
                Giá: {currentPkgPrice !== undefined && currentPkgPrice !== null ? `${currentPkgPrice.toLocaleString()} đ` : 'Chưa đặt giá'}
              </span>
              <small style={{ fontSize: '10px', color: '#94a3b8' }}>{isActiveFilter ? '✓ Đang lọc' : 'Lọc nhanh'}</small>
            </div>
          </div>
        );
      })}
    </div>
  );
}
