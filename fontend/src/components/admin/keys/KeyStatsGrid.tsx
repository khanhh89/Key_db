import type { LicenseKeyItem, KeyPricePreset } from '../../../types';

interface PackageStat { days: number; count: number; total: number; }

interface KeyStatsGridProps {
  keys: LicenseKeyItem[];
  presets: KeyPricePreset[];
  filterDuration: string;
  setFilterDuration: (v: string) => void;
  countTotalAvailable: number;
  totalInventoryValue: number;
  packageStatsMap: PackageStat[];
}

export function KeyStatsGrid({
  keys, presets, filterDuration, setFilterDuration,
  countTotalAvailable, totalInventoryValue, packageStatsMap
}: KeyStatsGridProps) {
  return (
    <div className="key-stats-grid">
      <div className="key-stat-card">
        <span style={{ color: '#2563EB', fontWeight: 'bold' }}>📦 TỔNG KEY CÒN HÀNG</span>
        <strong style={{ fontSize: '24px', color: '#1E293B', marginTop: '8px', display: 'block' }}>{countTotalAvailable} Key</strong>
        {totalInventoryValue > 0 && (
          <small style={{ fontSize: '12px', color: '#64748B', fontWeight: '600', display: 'block', marginTop: '8px' }}>
            💰 Tổng trị giá: <span style={{ color: '#16A34A' }}>{totalInventoryValue.toLocaleString()} đ</span>
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
              border: isActiveFilter ? '1px solid #2563EB' : undefined,
              boxShadow: isActiveFilter ? '0 0 0 1px #2563EB' : undefined
            }}
            title="Bấm để lọc nhanh gói này"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#2563EB', fontWeight: 'bold' }}>{icon} {title}</span>
              <span className={`status-badge ${count === 0 ? 'sold' : count < 5 ? 'badge-warning' : 'available'}`}>{healthLabel}</span>
            </div>
            <strong style={{ fontSize: '20px', color: '#1E293B', marginTop: '8px', display: 'block' }}>{count} Key</strong>
            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>
                Giá: {currentPkgPrice !== undefined && currentPkgPrice !== null ? `${currentPkgPrice.toLocaleString()} đ` : 'Chưa đặt giá'}
              </span>
              <small style={{ fontSize: '11px', color: isActiveFilter ? '#2563EB' : '#94A3B8', fontWeight: isActiveFilter ? 'bold' : 'normal' }}>{isActiveFilter ? '✓ Đang lọc' : 'Lọc nhanh'}</small>
            </div>
          </div>
        );
      })}
    </div>
  );
}
