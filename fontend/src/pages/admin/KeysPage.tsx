import { useState, useEffect, useMemo, useCallback } from 'react';
import type { LicenseKeyItem, AppItem, Language, KeyPricePreset } from '../../types';
import {
  fetchAdminKeysFromBackend,
  saveKeyToBackend,
  updateKeyInBackend,
  deleteKeyFromBackend,
  updateKeyPricesByCategoryInBackend,
  batchDeleteKeysFromBackend,
  batchUpdateKeyStatusInBackend,
  fetchPricePresetsFromBackend,
  savePricePresetToBackend,
  deletePricePresetFromBackend
} from '../../services/api';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { ModalPortal } from '../../components/common/ModalPortal';
import { Pagination } from '../../components/common/Pagination';
import { copyTextToClipboard } from '../../utils/clipboard';

export const defaultKeyPricePresets: KeyPricePreset[] = [
  { id: 'preset-1', name: 'Gói 1 Ngày', durationDays: 1, price: 15000 },
  { id: 'preset-3', name: 'Gói 3 Ngày', durationDays: 3, price: 25000 },
  { id: 'preset-7', name: 'Gói 7 Ngày', durationDays: 7, price: 35000 },
  { id: 'preset-15', name: 'Gói 15 Ngày', durationDays: 15, price: 65000 },
  { id: 'preset-30', name: 'Gói 1 Tháng (30 Ngày)', durationDays: 30, price: 100000 },
  { id: 'preset-90', name: 'Gói 3 Tháng (90 Ngày)', durationDays: 90, price: 250000 },
  { id: 'preset-365', name: 'Gói 1 Năm (365 Ngày)', durationDays: 365, price: 500000 },
  { id: 'preset-9999', name: 'Gói Vĩnh Viễn', durationDays: 9999, price: 1000000 }
];

export function getStoredPresets(): KeyPricePreset[] {
  try {
    const saved = localStorage.getItem('modlienquan_key_price_presets');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return defaultKeyPricePresets;
}

export function saveStoredPresets(presets: KeyPricePreset[]) {
  try {
    localStorage.setItem('modlienquan_key_price_presets', JSON.stringify(presets));
  } catch (e) {}
}

interface KeysPageProps {
  lang: Language;
  apps: AppItem[];
  showToast: (msg: string) => void;
}

export function KeysPage({ lang, apps, showToast }: KeysPageProps) {
  const [keys, setKeys] = useState<LicenseKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<LicenseKeyItem | null>(null);
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);

  // Multi-Select Batch Actions State
  const [selectedKeyIds, setSelectedKeyIds] = useState<string[]>([]);
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState<boolean>(false);

  // Instant Search State
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Bulk Price Update Modal States
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkDuration, setBulkDuration] = useState<string>('7');
  const [bulkAppId, setBulkAppId] = useState<string>('ALL');
  const [bulkPrice, setBulkPrice] = useState<number>(35000);
  const [bulkOnlyAvailable, setBulkOnlyAvailable] = useState<boolean>(true);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter state (Dynamic filter duration string or 'ALL')
  const [filterDuration, setFilterDuration] = useState<string>('ALL');
  const [filterAppId, setFilterAppId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'AVAILABLE' | 'SOLD'>('ALL');

  // Keyboard shortcut UX (Esc to close open modals)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setIsBulkModalOpen(false);
        setDeletingKeyId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterDuration, filterAppId, filterStatus, searchQuery]);

  // Form state
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [keyCodeStr, setKeyCodeStr] = useState<string>('');
  const [durationDays, setDurationDays] = useState<number>(30);
  const [price, setPrice] = useState<number>(50000);
  const [editingStatus, setEditingStatus] = useState<'AVAILABLE' | 'SOLD'>('AVAILABLE');

  // Key Price Presets States
  const [presets, setPresets] = useState<KeyPricePreset[]>(getStoredPresets);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('preset-7');
  const [isPresetsManagerOpen, setIsPresetsManagerOpen] = useState<boolean>(false);

  // New Preset Form State
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [newPresetDays, setNewPresetDays] = useState<number>(7);
  const [newPresetPrice, setNewPresetPrice] = useState<number>(35000);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (presetId === 'custom') return;
    const found = presets.find((p) => p.id === presetId);
    if (found) {
      setDurationDays(found.durationDays);
      setPrice(found.price);
    }
  };

  const handleAddPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim() || newPresetDays <= 0 || newPresetPrice < 2000) {
      showToast(lang === 'vi' ? '⚠️ Vui lòng điền Tên gói, Số ngày > 0 và Giá >= 2,000đ!' : 'Please enter valid preset details!');
      return;
    }
    const newPresetData: Partial<KeyPricePreset> = {
      name: newPresetName.trim(),
      durationDays: newPresetDays,
      price: newPresetPrice
    };
    const saved = await savePricePresetToBackend(newPresetData);
    if (saved) {
      const updated = [...presets.filter((p) => p.id !== saved.id), saved];
      setPresets(updated);
      saveStoredPresets(updated);
      setNewPresetName('');
      showToast(lang === 'vi' ? `🎉 Đã lưu gói giá mẫu vào MySQL DB: ${saved.name}!` : `Saved price preset ${saved.name} to DB!`);
    } else {
      showToast(lang === 'vi' ? '❌ Lỗi khi lưu gói giá vào máy chủ.' : 'Failed to save preset.');
    }
  };

  const handleDeletePreset = async (presetId: string) => {
    await deletePricePresetFromBackend(presetId);
    const updated = presets.filter((p) => p.id !== presetId);
    setPresets(updated);
    saveStoredPresets(updated);
    showToast(lang === 'vi' ? '🗑 Đã xóa gói giá mẫu khỏi MySQL DB!' : 'Deleted price preset from DB!');
  };

  const loadKeys = async () => {
    setIsLoading(true);
    const [keysData, presetsData] = await Promise.all([
      fetchAdminKeysFromBackend(),
      fetchPricePresetsFromBackend()
    ]);
    setKeys(keysData);
    if (presetsData && presetsData.length > 0) {
      setPresets(presetsData);
      saveStoredPresets(presetsData);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const openBulkPriceModal = (targetDuration?: number) => {
    if (targetDuration !== undefined) {
      setBulkDuration(String(targetDuration));
      const sampleKey = keys.find(k => k.durationDays === targetDuration && (k.price || k.price === 0));
      setBulkPrice(sampleKey?.price ? sampleKey.price : (targetDuration === 1 ? 15000 : (targetDuration === 7 ? 35000 : (targetDuration === 30 ? 50000 : 350000))));
    } else {
      setBulkDuration('7');
      setBulkPrice(35000);
    }
    setBulkAppId('ALL');
    setBulkOnlyAvailable(true);
    setIsBulkModalOpen(true);
  };

  const handleBulkUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkPrice < 2000) {
      showToast(lang === 'vi' ? '⚠️ Giá bán tối thiểu phải từ 2,000 VNĐ trở lên!' : 'Minimum price must be at least 2,000 VND!');
      return;
    }
    setIsBulkSubmitting(true);
    const durationNum = bulkDuration === 'ALL' ? null : Number(bulkDuration);
    const res = await updateKeyPricesByCategoryInBackend(durationNum, bulkPrice, bulkAppId, bulkOnlyAvailable);
    setIsBulkSubmitting(false);

    if (res.success) {
      showToast(lang === 'vi' ? `🎉 ${res.message}` : res.message);
      await loadKeys();
      setIsBulkModalOpen(false);
    } else {
      showToast(lang === 'vi' ? `⚠️ ${res.message}` : res.message);
    }
  };

  const openNewKeyModal = () => {
    setEditingKey(null);
    if (apps.length > 0) setSelectedAppId(apps[0].id);
    setKeyCodeStr('');

    if (presets.length > 0) {
      setSelectedPresetId(presets[0].id);
      setDurationDays(presets[0].durationDays);
      setPrice(presets[0].price);
    } else {
      setSelectedPresetId('custom');
      setDurationDays(30);
      setPrice(50000);
    }

    setEditingStatus('AVAILABLE');
    setIsModalOpen(true);
  };

  const openEditKeyModal = (key: LicenseKeyItem) => {
    setEditingKey(key);
    setSelectedAppId(key.appId);
    setKeyCodeStr(key.keyCode);
    setDurationDays(key.durationDays);
    setPrice(key.price);
    setSelectedPresetId('custom');
    setEditingStatus(key.status as 'AVAILABLE' | 'SOLD');
    setIsModalOpen(true);
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyCodeStr.trim() || !selectedAppId) return;

    if (editingKey) {
      // UPDATE EXISTING KEY MODE
      await updateKeyInBackend(editingKey.id, {
        appId: selectedAppId,
        keyCode: keyCodeStr.trim(),
        durationDays,
        price,
        status: editingStatus
      });
      showToast(lang === 'vi' ? '🎉 Đã cập nhật thông tin Key thành công!' : 'Updated Key details!');
    } else {
      // BULK / SINGLE INSERT KEY MODE
      const lines = keyCodeStr
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      for (const code of lines) {
        await saveKeyToBackend({
          appId: selectedAppId,
          keyCode: code,
          durationDays,
          price,
          status: 'AVAILABLE'
        });
      }
      showToast(lang === 'vi' ? `Đã thêm ${lines.length} Key mới thành công!` : `Added ${lines.length} Keys successfully!`);
    }

    await loadKeys();
    setIsModalOpen(false);
  };

  const confirmDeleteKey = async () => {
    if (!deletingKeyId) return;
    await deleteKeyFromBackend(deletingKeyId);
    await loadKeys();
    showToast(lang === 'vi' ? 'Đã xóa Key thành công!' : 'Deleted Key successfully!');
    setDeletingKeyId(null);
  };

  const getAppName = useCallback((appId: string) => {
    const app = apps.find((a) => a.id === appId);
    return app ? app.name : appId;
  }, [apps]);

  // Quick 1-Click Copy Key Code
  const handleCopyKey = async (code: string) => {
    if (!code) return;
    const success = await copyTextToClipboard(code);
    if (success) {
      showToast(lang === 'vi' ? `📋 Đã sao chép mã Key: ${code}` : `Copied Key Code: ${code}`);
    }
  };

  // 1-Click Export Inventory to CSV File
  const exportKeysToCSV = () => {
    if (filteredKeys.length === 0) {
      showToast(lang === 'vi' ? '⚠️ Không có dữ liệu key để xuất!' : 'No keys to export!');
      return;
    }
    const headers = ['ID', 'App Name', 'Key Code', 'Duration (Days)', 'Price (VND)', 'Status', 'Created At'];
    const rows = filteredKeys.map((k) => [
      k.id,
      getAppName(k.appId),
      k.keyCode,
      k.durationDays,
      k.price || 50000,
      k.status,
      k.createdAt || ''
    ]);
    const csvContent = '\uFEFF' + [headers, ...rows].map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Kho_Key_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(lang === 'vi' ? `📥 Đã xuất ${filteredKeys.length} Key ra file CSV thành công!` : `Exported ${filteredKeys.length} Keys to CSV!`);
  };

  // Multi-Select Batch Action Handlers
  const handleSelectAll = () => {
    if (selectedKeyIds.length === paginatedKeys.length && paginatedKeys.length > 0) {
      setSelectedKeyIds([]);
    } else {
      setSelectedKeyIds(paginatedKeys.map((k) => k.id));
    }
  };

  const toggleSelectKey = (id: string) => {
    setSelectedKeyIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBatchDelete = async () => {
    if (selectedKeyIds.length === 0) return;
    const res = await batchDeleteKeysFromBackend(selectedKeyIds);
    if (res.success) {
      showToast(lang === 'vi' ? `🗑 ${res.message}` : res.message);
      setSelectedKeyIds([]);
      await loadKeys();
    } else {
      showToast(lang === 'vi' ? `⚠️ ${res.message}` : res.message);
    }
    setIsBatchConfirmOpen(false);
  };

  const handleBatchStatus = async (status: 'AVAILABLE' | 'SOLD') => {
    if (selectedKeyIds.length === 0) return;
    const res = await batchUpdateKeyStatusInBackend(selectedKeyIds, status);
    if (res.success) {
      showToast(lang === 'vi' ? `🎉 ${res.message}` : res.message);
      setSelectedKeyIds([]);
      await loadKeys();
    } else {
      showToast(lang === 'vi' ? `⚠️ ${res.message}` : res.message);
    }
  };

  // Memoized Filtered Keys Calculation
  const filteredKeys = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return keys.filter((k) => {
      if (filterAppId !== 'ALL' && k.appId !== filterAppId) return false;
      if (filterStatus !== 'ALL' && k.status !== filterStatus) return false;
      if (filterDuration !== 'ALL' && String(k.durationDays) !== filterDuration) return false;
      if (query) {
        const appName = getAppName(k.appId).toLowerCase();
        const keyCode = (k.keyCode || '').toLowerCase();
        if (!keyCode.includes(query) && !appName.includes(query)) return false;
      }
      return true;
    });
  }, [keys, filterAppId, filterStatus, filterDuration, searchQuery, getAppName]);

  // Memoized Inventory Statistics & Total Value
  const availableKeys = useMemo(() => keys.filter((k) => k.status === 'AVAILABLE'), [keys]);
  const countTotalAvailable = availableKeys.length;

  const totalInventoryValue = useMemo(() => {
    return availableKeys.reduce((sum, k) => sum + (k.price || 50000), 0);
  }, [availableKeys]);

  const uniqueDurations = useMemo(() => {
    return Array.from(new Set(keys.map((k) => k.durationDays || 30))).sort((a, b) => a - b);
  }, [keys]);

  const packageStatsMap = useMemo(() => {
    return uniqueDurations.map((days) => {
      const count = keys.filter((k) => k.status === 'AVAILABLE' && k.durationDays === days).length;
      const total = keys.filter((k) => k.durationDays === days).length;
      return { days, count, total };
    });
  }, [uniqueDurations, keys]);

  const renderPackageBadge = (days: number) => {
    if (days === 1) {
      return <span className="package-badge day1">⚡ Gói 1 Ngày</span>;
    } else if (days === 7) {
      return <span className="package-badge day7">📅 Gói 7 Ngày</span>;
    } else if (days === 30) {
      return <span className="package-badge day30">🌟 Gói 30 Ngày</span>;
    } else if (days >= 365) {
      return <span className="package-badge lifetime">👑 Gói Vĩnh Viễn</span>;
    }
    return <span className="package-badge day30">⏱️ Gói {days} Ngày</span>;
  };

  const totalPages = useMemo(() => Math.ceil(filteredKeys.length / pageSize) || 1, [filteredKeys.length, pageSize]);
  const paginatedKeys = useMemo(() => {
    return filteredKeys.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredKeys, currentPage, pageSize]);

  return (
    <div className="manager-panel">
      <div className="panel-header">
        <h2>🔑 {lang === 'vi' ? 'Quản Lý Kho Key Theo Gói' : 'Keys Inventory Manager'}</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="add-btn"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: 'none' }}
            onClick={() => setIsPresetsManagerOpen(true)}
          >
            ⚙️ {lang === 'vi' ? 'Cấu Hình Bảng Giá Mẫu' : 'Price Presets'}
          </button>
          <button
            className="add-btn"
            style={{ background: 'linear-gradient(135deg, #0284c7, #2563eb)', border: 'none' }}
            onClick={exportKeysToCSV}
          >
            📥 {lang === 'vi' ? 'Xuất CSV Kho Key' : 'Export CSV'}
          </button>
          <button
            className="add-btn"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
            onClick={() => openBulkPriceModal()}
          >
            💰 {lang === 'vi' ? 'Sửa Giá Hàng Loạt Theo Gói' : 'Bulk Edit Prices'}
          </button>
          <button className="add-btn" onClick={openNewKeyModal}>
            + {lang === 'vi' ? 'Nạp Key Mới Về Kho' : 'Import New Keys'}
          </button>
        </div>
      </div>

      {/* DYNAMIC PACKAGE SUMMARY STATISTICS CARDS WITH STOCK HEALTH & TỔNG GIÁ TRỊ */}
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

          if (days === 1) {
            icon = '⚡';
            color = '#fb923c';
          } else if (days === 7) {
            icon = '📅';
            color = '#c084fc';
          } else if (days === 30) {
            icon = '🌟';
            color = '#38bdf8';
          } else if (days >= 365) {
            icon = '👑';
            title = 'GÓI VĨNH VIỄN';
            color = '#facc15';
          }

          const matchingWithPrice = keys.find((k) => k.durationDays === days && (k.price || k.price === 0));
          const currentPkgPrice = matchingWithPrice?.price;
          const isActiveFilter = filterDuration === String(days);

          let healthLabel = '🟢 Còn hàng';
          let healthColor = '#10b981';
          if (count === 0) {
            healthLabel = '🔴 Hết hàng';
            healthColor = '#ef4444';
          } else if (count < 5) {
            healthLabel = '🟡 Sắp hết';
            healthColor = '#f59e0b';
          }

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

      {/* MULTI-SELECT FLOATING ACTION BAR */}
      {selectedKeyIds.length > 0 && (
        <div className="batch-action-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '16px', padding: '12px 20px', marginBottom: '16px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(16px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 'bold', color: '#38bdf8', fontSize: '13px' }}>☑ Đã chọn {selectedKeyIds.length} Key</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="add-btn"
              style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399' }}
              onClick={() => handleBatchStatus('AVAILABLE')}
            >
              ● Đánh Dấu CÒN HÀNG
            </button>
            <button
              className="add-btn"
              style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)', color: '#818cf8' }}
              onClick={() => handleBatchStatus('SOLD')}
            >
              ✓ Đánh Dấu ĐÃ BÁN
            </button>
            <button
              className="delete-btn"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => setIsBatchConfirmOpen(true)}
            >
              🗑 Xóa {selectedKeyIds.length} Key
            </button>
            <button
              className="cancel-btn"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => setSelectedKeyIds([])}
            >
              ✕ Bỏ Chọn
            </button>
          </div>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
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
              return (
                <option key={days} value={String(days)}>
                  {label} ({count} Key)
                </option>
              );
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
                {a.name} ({keys.filter((k) => k.appId === a.id).length} Key)
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

        {(filterDuration !== 'ALL' || filterAppId !== 'ALL' || filterStatus !== 'ALL' || searchQuery) && (
          <button
            onClick={() => { setFilterDuration('ALL'); setFilterAppId('ALL'); setFilterStatus('ALL'); setSearchQuery(''); setCurrentPage(1); }}
            style={{ padding: '8px 14px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#f87171', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            ✕ {lang === 'vi' ? 'Xóa Bộ Lọc' : 'Clear Filters'}
          </button>
        )}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={selectedKeyIds.length === paginatedKeys.length && paginatedKeys.length > 0}
                  onChange={handleSelectAll}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
              </th>
              <th>App</th>
              <th>Key Code</th>
              <th>{lang === 'vi' ? 'Phân Loại Gói' : 'Package'}</th>
              <th>{lang === 'vi' ? 'Thời hạn' : 'Duration'}</th>
              <th>{lang === 'vi' ? 'Giá bán' : 'Price'}</th>
              <th>{lang === 'vi' ? 'Trạng thái' : 'Status'}</th>
              <th>{lang === 'vi' ? 'Thao tác' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} style={{ opacity: 0.6 }}>
                  <td colSpan={8} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span className="spin-dot">●</span> Đang tải dữ liệu Kho Key...
                    </div>
                  </td>
                </tr>
              ))
            ) : paginatedKeys.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                  📦 Không tìm thấy Key nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              paginatedKeys.map((k) => (
                <tr key={k.id} className={selectedKeyIds.includes(k.id) ? 'selected-row' : ''}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedKeyIds.includes(k.id)}
                      onChange={() => toggleSelectKey(k.id)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </td>
                  <td>
                    <strong>{getAppName(k.appId)}</strong>
                  </td>
                  <td>
                    <code
                      className="key-table-code"
                      onClick={() => handleCopyKey(k.keyCode)}
                      style={{ cursor: 'pointer' }}
                      title="Nhấp để sao chép nhanh mã Key"
                    >
                      {k.keyCode} 📋
                    </code>
                  </td>
                  <td>{renderPackageBadge(k.durationDays)}</td>
                  <td>{k.durationDays} {lang === 'vi' ? 'ngày' : 'days'}</td>
                  <td style={{ fontWeight: 'bold', color: '#10b981' }}>
                    {k.price ? k.price.toLocaleString() : '50,000'} đ
                  </td>
                  <td>
                    <span className={`status-badge ${k.status === 'AVAILABLE' ? 'available' : 'sold'}`}>
                      {k.status === 'AVAILABLE' ? '● CÒN HÀNG' : '✓ ĐÃ BÁN'}
                    </span>
                  </td>
                  <td>
                    <div className="btn-group">
                      <button
                        className="edit-btn"
                        onClick={() => openEditKeyModal(k)}
                      >
                        ✎ {lang === 'vi' ? 'Sửa' : 'Edit'}
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => setDeletingKeyId(k.id)}
                      >
                        🗑 {lang === 'vi' ? 'Xóa' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredKeys.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }}
        lang={lang}
      />

      <ConfirmModal
        isOpen={Boolean(deletingKeyId)}
        title={lang === 'vi' ? 'Xác Nhận Xóa Key?' : 'Confirm Delete Key?'}
        message={lang === 'vi' ? 'Bạn có chắc muốn xóa Key này không?' : 'Delete key?'}
        lang={lang}
        onConfirm={confirmDeleteKey}
        onCancel={() => setDeletingKeyId(null)}
      />

      <ConfirmModal
        isOpen={isBatchConfirmOpen}
        title={lang === 'vi' ? `Xác Nhận Xóa Hàng Loạt (${selectedKeyIds.length} Key)?` : `Confirm Batch Delete (${selectedKeyIds.length} Keys)?`}
        message={lang === 'vi' ? `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedKeyIds.length} Key đã chọn không? Hành động này không thể hoàn tác!` : `Delete selected ${selectedKeyIds.length} keys permanently?`}
        lang={lang}
        onConfirm={handleBatchDelete}
        onCancel={() => setIsBatchConfirmOpen(false)}
      />

      {isModalOpen && (
        <ModalPortal>
          <div className="sub-modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="sub-modal-card" onClick={(e) => e.stopPropagation()}>
              <h4>
                🔑 {editingKey ? (lang === 'vi' ? 'Chỉnh Sửa Thông Tin Key' : 'Edit License Key') : (lang === 'vi' ? 'Nạp Key Mới Phân Loại Theo Gói' : 'Import New Keys By Package')}
              </h4>
              <form onSubmit={handleSaveKey} className="modal-form">
                <div className="form-group">
                  <label>{lang === 'vi' ? 'Chọn App Catalog (*):' : 'Select App (*):'}</label>
                  <select
                    value={selectedAppId}
                    onChange={(e) => setSelectedAppId(e.target.value)}
                  >
                    {apps.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.sub})
                      </option>
                    ))}
                  </select>
                </div>

                {!editingKey && (
                  <div className="form-group" style={{ background: 'rgba(99, 102, 241, 0.12)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.4)', marginBottom: '14px' }}>
                    <label style={{ color: '#a5b4fc', fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                      💎 {lang === 'vi' ? 'Chọn Gói Giá Có Sẵn (*):' : 'Select Pre-set Package (*):'}
                    </label>
                    <select
                      value={selectedPresetId}
                      onChange={(e) => handleSelectPreset(e.target.value)}
                      style={{ fontWeight: 800, color: '#38bdf8', background: '#0f172a', border: '1px solid #38bdf8', padding: '9px 12px', borderRadius: '8px', width: '100%', fontSize: '13.5px' }}
                    >
                      {presets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.durationDays} Ngày — {p.price.toLocaleString()} VNĐ
                        </option>
                      ))}
                      <option value="custom">✏️ {lang === 'vi' ? 'Tự nhập ngày & giá thủ công...' : 'Enter custom days & price...'}</option>
                    </select>

                    {selectedPresetId !== 'custom' && (
                      <div style={{ display: 'flex', gap: '14px', marginTop: '10px', padding: '8px 12px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)', fontSize: '12.5px' }}>
                        <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>⏱️ {lang === 'vi' ? 'Hạn dùng:' : 'Duration:'} {durationDays} {lang === 'vi' ? 'Ngày' : 'Days'}</span>
                        <span style={{ color: '#4ade80', fontWeight: 'bold' }}>💰 {lang === 'vi' ? 'Giá bán:' : 'Price:'} {price.toLocaleString()} đ</span>
                      </div>
                    )}
                  </div>
                )}

                {(editingKey || selectedPresetId === 'custom') && (
                  <div className="form-grid">
                    <div className="form-group">
                      <label>{lang === 'vi' ? 'Số Ngày Thời Hạn (Ngày):' : 'Duration (Days):'}</label>
                      <input
                        type="number"
                        min="1"
                        value={durationDays || ''}
                        onChange={(e) => setDurationDays(e.target.value === '' ? 0 : parseInt(e.target.value.replace(/^0+/, ''), 10) || 0)}
                      />
                    </div>
                    <div className="form-group">
                      <label>{lang === 'vi' ? 'Giá Bán Gói (VNĐ - Tối thiểu 2,000đ):' : 'Price (VND - Min 2,000):'}</label>
                      <input
                        type="number"
                        min="2000"
                        step="1000"
                        value={price || ''}
                        onChange={(e) => setPrice(e.target.value === '' ? 0 : parseInt(e.target.value.replace(/^0+/, ''), 10) || 0)}
                      />
                    </div>
                  </div>
                )}

                {editingKey && (
                  <div className="form-group">
                    <label>{lang === 'vi' ? 'Trạng Thái Key:' : 'Key Status:'}</label>
                    <select
                      value={editingStatus}
                      onChange={(e) => setEditingStatus(e.target.value as 'AVAILABLE' | 'SOLD')}
                    >
                      <option value="AVAILABLE">● CÒN HÀNG (AVAILABLE)</option>
                      <option value="SOLD">✓ ĐÃ BÁN (SOLD)</option>
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>
                    {editingKey
                      ? (lang === 'vi' ? 'Mã Key Code:' : 'Key Code:')
                      : (lang === 'vi' ? 'Danh sách Mã Key (Mỗi mã 1 dòng để nạp hàng loạt):' : 'Key Codes (One per line for bulk import):')}
                  </label>
                  {editingKey ? (
                    <input
                      type="text"
                      required
                      value={keyCodeStr}
                      onChange={(e) => setKeyCodeStr(e.target.value)}
                    />
                  ) : (
                    <textarea
                      rows={5}
                      required
                      value={keyCodeStr}
                      onChange={(e) => setKeyCodeStr(e.target.value)}
                    />
                  )}
                </div>

                <div className="modal-btn-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setIsModalOpen(false)}
                  >
                    {lang === 'vi' ? 'Hủy' : 'Cancel'}
                  </button>
                  <button type="submit" className="save-btn">
                    {editingKey ? (lang === 'vi' ? '💾 Lưu Thay Đổi' : '💾 Save Changes') : (lang === 'vi' ? '💾 Nạp Vào Kho' : '💾 Import Keys')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {isBulkModalOpen && (
        <ModalPortal>
          <div className="sub-modal-overlay" onClick={() => setIsBulkModalOpen(false)}>
            <div className="sub-modal-card" onClick={(e) => e.stopPropagation()}>
              <h4>
                💰 {lang === 'vi' ? 'Cập Nhật Giá Bán Hàng Loạt Theo Phân Loại Key' : 'Bulk Update Selling Prices By Key Package'}
              </h4>
              <form onSubmit={handleBulkUpdatePrice} className="modal-form">
                <div className="form-group">
                  <label>{lang === 'vi' ? 'Chọn Phân Loại / Gói Key (*):' : 'Select Package Category (*):'}</label>
                  <select
                    value={bulkDuration}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBulkDuration(val);
                      if (val !== 'ALL') {
                        const d = Number(val);
                        const sample = keys.find(k => k.durationDays === d && (k.price || k.price === 0));
                        if (sample && sample.price) setBulkPrice(sample.price);
                      }
                    }}
                  >
                    <option value="ALL">🌐 Tất Cả Các Gói ({keys.length} Key)</option>
                    <option value="1">⚡ Gói 1 Ngày ({keys.filter(k => k.durationDays === 1).length} Key)</option>
                    <option value="7">📅 Gói 7 Ngày - Tuần ({keys.filter(k => k.durationDays === 7).length} Key)</option>
                    <option value="30">🌟 Gói 30 Ngày - Tháng ({keys.filter(k => k.durationDays === 30).length} Key)</option>
                    <option value="365">👑 Gói 365 Ngày - Vĩnh Viễn ({keys.filter(k => k.durationDays === 365).length} Key)</option>
                    {uniqueDurations.filter(d => ![1, 7, 30, 365].includes(d)).map(d => (
                      <option key={d} value={String(d)}>⏱️ Gói {d} Ngày ({keys.filter(k => k.durationDays === d).length} Key)</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{lang === 'vi' ? 'Áp Dụng Cho App Catalog (*):' : 'Apply To App Catalog (*):'}</label>
                  <select
                    value={bulkAppId}
                    onChange={(e) => setBulkAppId(e.target.value)}
                  >
                    <option value="ALL">🌐 Tất Cả Các App</option>
                    {apps.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({keys.filter(k => k.appId === a.id).length} Key)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{lang === 'vi' ? 'Giá Bán Mới Hàng Loạt (VNĐ - Tối thiểu 2,000đ) (*):' : 'New Price (VND - Min 2,000) (*):'}</label>
                  <input
                    type="number"
                    min="2000"
                    step="1000"
                    required
                    value={bulkPrice || ''}
                    onChange={(e) => setBulkPrice(e.target.value === '' ? 0 : parseInt(e.target.value.replace(/^0+/, ''), 10) || 0)}
                    placeholder="Ví dụ: 35000 (Tối thiểu 2,000đ)"
                  />
                  <small style={{ color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                    {lang === 'vi' ? '💡 Nhập giá bán mới từ 2,000đ trở lên cho các key thuộc phân loại gói & app được chọn.' : 'Set new price (min 2,000 VND) for selected key package & app.'}
                  </small>
                </div>

                <label
                  htmlFor="bulkOnlyAvailable"
                  className="checkbox-toggle-card"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      id="bulkOnlyAvailable"
                      checked={bulkOnlyAvailable}
                      onChange={(e) => setBulkOnlyAvailable(e.target.checked)}
                      style={{
                        width: '18px',
                        height: '18px',
                        accentColor: '#38bdf8',
                        cursor: 'pointer'
                      }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>
                      {lang === 'vi' ? 'Chỉ áp dụng Key chưa bán (CÒN HÀNG)' : 'Only apply to unsold keys (AVAILABLE)'}
                    </span>
                  </div>
                  <span
                    className={`status-badge ${bulkOnlyAvailable ? 'available' : 'sold'}`}
                    style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px' }}
                  >
                    {bulkOnlyAvailable ? '● CÒN HÀNG' : 'TẤT CẢ KEY'}
                  </span>
                </label>

                <div className="modal-btn-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setIsBulkModalOpen(false)}
                  >
                    {lang === 'vi' ? 'Hủy' : 'Cancel'}
                  </button>
                  <button type="submit" className="save-btn" disabled={isBulkSubmitting} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                    {isBulkSubmitting ? '...' : (lang === 'vi' ? '🚀 Cập Nhật Giá Hàng Loạt' : '🚀 Apply Bulk Price')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {isPresetsManagerOpen && (
        <ModalPortal>
          <div className="sub-modal-overlay" onClick={() => setIsPresetsManagerOpen(false)}>
            <div className="sub-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
              <button className="close" onClick={() => setIsPresetsManagerOpen(false)}>×</button>
              <h4 style={{ color: '#a855f7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚙️ {lang === 'vi' ? 'Cấu Hình Bảng Giá Key Mẫu' : 'Configure Key Price Presets'}
              </h4>
              <p style={{ color: '#94a3b8', fontSize: '12.5px', marginBottom: '16px' }}>
                {lang === 'vi'
                  ? 'Tạo các gói giá & ngày cố định để khi nạp key mới chỉ cần chọn từ danh sách mà không cần nhập lại nhiều lần.'
                  : 'Manage pricing presets for faster key importation.'}
              </p>

              {/* Form Add Preset */}
              <form onSubmit={handleAddPreset} style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.3)', marginBottom: '16px' }}>
                <strong style={{ color: '#e9d5ff', fontSize: '13px', display: 'block', marginBottom: '10px' }}>
                  + {lang === 'vi' ? 'Thêm Gói Mẫu Mới:' : 'Add New Preset:'}
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.2fr auto', gap: '8px', alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#cbd5e1' }}>{lang === 'vi' ? 'Tên Gói:' : 'Name:'}</label>
                    <input
                      type="text"
                      placeholder="VD: Gói 7 Ngày"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12.5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#cbd5e1' }}>{lang === 'vi' ? 'Số Ngày:' : 'Days:'}</label>
                    <input
                      type="number"
                      min="1"
                      value={newPresetDays || ''}
                      onChange={(e) => setNewPresetDays(e.target.value === '' ? 0 : parseInt(e.target.value.replace(/^0+/, ''), 10) || 0)}
                      style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12.5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#cbd5e1' }}>{lang === 'vi' ? 'Giá (VNĐ):' : 'Price:'}</label>
                    <input
                      type="number"
                      min="2000"
                      step="1000"
                      value={newPresetPrice || ''}
                      onChange={(e) => setNewPresetPrice(e.target.value === '' ? 0 : parseInt(e.target.value.replace(/^0+/, ''), 10) || 0)}
                      style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12.5px' }}
                    />
                  </div>
                  <button
                    type="submit"
                    style={{
                      background: 'linear-gradient(135deg, #a855f7, #7e22ce)',
                      color: '#fff',
                      border: 'none',
                      padding: '7px 14px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      height: '32px'
                    }}
                  >
                    + {lang === 'vi' ? 'Lưu' : 'Add'}
                  </button>
                </div>
              </form>

              {/* List Existing Presets */}
              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className="admin-table" style={{ width: '100%', fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th>{lang === 'vi' ? 'Tên Gói' : 'Name'}</th>
                      <th>{lang === 'vi' ? 'Thời Hạn' : 'Duration'}</th>
                      <th>{lang === 'vi' ? 'Giá Bán (VNĐ)' : 'Price'}</th>
                      <th style={{ textAlign: 'center' }}>{lang === 'vi' ? 'Thao tác' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {presets.map((p) => (
                      <tr key={p.id}>
                        <td><strong>{p.name}</strong></td>
                        <td>{p.durationDays} {lang === 'vi' ? 'Ngày' : 'Days'}</td>
                        <td style={{ color: '#10b981', fontWeight: 'bold' }}>{p.price.toLocaleString()} đ</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="delete-btn"
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                            onClick={() => handleDeletePreset(p.id)}
                          >
                            🗑 {lang === 'vi' ? 'Xóa' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
