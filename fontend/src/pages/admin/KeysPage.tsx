import { useState, useEffect, useMemo, useCallback } from 'react';
import type { LicenseKeyItem, AppItem, Language, KeyPricePreset } from '../../types';
import {
  fetchAdminKeysFromBackend,
  saveKeyToBackend,
  updateKeyInBackend,
  deleteKeyFromBackend,
  batchDeleteKeysFromBackend,
  batchUpdateKeyStatusInBackend,
  fetchPricePresetsFromBackend,
} from '../../services/api';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Pagination } from '../../components/common/Pagination';
import { copyTextToClipboard } from '../../utils/clipboard';
import { isKeyBelongToApp } from '../../utils/keyUtils';
import { KeyStatsGrid } from '../../components/admin/keys/KeyStatsGrid';
import { KeyFilterBar } from '../../components/admin/keys/KeyFilterBar';
import { KeyBatchActionBar } from '../../components/admin/keys/KeyBatchActionBar';
import { KeyImportModal } from '../../components/admin/keys/KeyImportModal';
import { PricePresetsModal } from '../../components/admin/keys/PricePresetsModal';

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
  const [selectedKeyIds, setSelectedKeyIds] = useState<string[]>([]);
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterDuration, setFilterDuration] = useState<string>('ALL');
  const [filterAppId, setFilterAppId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'AVAILABLE' | 'SOLD'>('ALL');
  const [presets, setPresets] = useState<KeyPricePreset[]>(getStoredPresets);
  const [isPresetsManagerOpen, setIsPresetsManagerOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsModalOpen(false); setDeletingKeyId(null); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => { setCurrentPage(1); }, [filterDuration, filterAppId, filterStatus, searchQuery]);

  const loadKeys = async () => {
    setIsLoading(true);
    const [keysData, presetsData] = await Promise.all([fetchAdminKeysFromBackend(), fetchPricePresetsFromBackend()]);
    setKeys(keysData);
    if (presetsData && presetsData.length > 0) { setPresets(presetsData); saveStoredPresets(presetsData); }
    setIsLoading(false);
  };

  useEffect(() => { loadKeys(); }, []);

  const getAppName = useCallback((appId: string) => {
    const app = apps.find(a => a.id === appId);
    return app ? app.name : appId;
  }, [apps]);

  const getGroupAppNames = useCallback((groupAppIds: string) => {
    return groupAppIds.split(',').map(id => id.trim()).filter(Boolean).map(id => getAppName(id));
  }, [getAppName]);

  const handleCopyKey = async (code: string) => {
    if (!code) return;
    const success = await copyTextToClipboard(code);
    if (success) showToast(lang === 'vi' ? `📋 Đã sao chép mã Key: ${code}` : `Copied Key Code: ${code}`);
  };

  const handleSelectAll = () => {
    if (selectedKeyIds.length === paginatedKeys.length && paginatedKeys.length > 0) setSelectedKeyIds([]);
    else setSelectedKeyIds(paginatedKeys.map(k => k.id));
  };

  const toggleSelectKey = (id: string) => {
    setSelectedKeyIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBatchDelete = async () => {
    if (selectedKeyIds.length === 0) return;
    const res = await batchDeleteKeysFromBackend(selectedKeyIds);
    if (res.success) { showToast(lang === 'vi' ? `🗑 ${res.message}` : res.message); setSelectedKeyIds([]); await loadKeys(); }
    else showToast(lang === 'vi' ? `⚠️ ${res.message}` : res.message);
    setIsBatchConfirmOpen(false);
  };

  const handleBatchStatus = async (status: 'AVAILABLE' | 'SOLD') => {
    if (selectedKeyIds.length === 0) return;
    const res = await batchUpdateKeyStatusInBackend(selectedKeyIds, status);
    if (res.success) { showToast(lang === 'vi' ? `🎉 ${res.message}` : res.message); setSelectedKeyIds([]); await loadKeys(); }
    else showToast(lang === 'vi' ? `⚠️ ${res.message}` : res.message);
  };

  const confirmDeleteKey = async () => {
    if (!deletingKeyId) return;
    await deleteKeyFromBackend(deletingKeyId);
    await loadKeys();
    showToast(lang === 'vi' ? 'Đã xóa Key thành công!' : 'Deleted Key successfully!');
    setDeletingKeyId(null);
  };

  const exportKeysToCSV = () => {
    if (filteredKeys.length === 0) { showToast(lang === 'vi' ? '⚠️ Không có dữ liệu key để xuất!' : 'No keys to export!'); return; }
    const headers = ['ID', 'App Name', 'Key Code', 'Duration (Days)', 'Price (VND)', 'Status', 'Created At'];
    const rows = filteredKeys.map(k => [k.id, getAppName(k.appId), k.keyCode, k.durationDays, k.price || 50000, k.status, k.createdAt || '']);
    const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Kho_Key_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast(lang === 'vi' ? `📥 Đã xuất ${filteredKeys.length} Key ra file CSV thành công!` : `Exported ${filteredKeys.length} Keys to CSV!`);
  };

  const handleSaveKey = async (data: {
    isGroupMode: boolean; selectedAppId: string; selectedGroupAppIds: string[];
    keyCodeStr: string; durationDays: number; price: number; editingStatus: 'AVAILABLE' | 'SOLD';
  }) => {
    const { isGroupMode, selectedAppId, selectedGroupAppIds, keyCodeStr, durationDays, price, editingStatus } = data;
    if (isGroupMode && selectedGroupAppIds.length < 2) { showToast(lang === 'vi' ? '⚠️ Chế độ nhóm cần chọn ít nhất 2 App!' : '⚠️ Group mode requires at least 2 Apps!'); return; }
    if (!isGroupMode && !selectedAppId) { showToast(lang === 'vi' ? '⚠️ Vui lòng chọn App!' : '⚠️ Please select an App!'); return; }
    if (!keyCodeStr.trim()) { showToast(lang === 'vi' ? '⚠️ Mã Key không được để trống!' : '⚠️ Key Code cannot be empty!'); return; }

    const effectiveAppId = isGroupMode ? selectedGroupAppIds[0] : selectedAppId;
    const effectiveGroupAppIds = isGroupMode ? selectedGroupAppIds.join(',') : '';

    if (editingKey) {
      await updateKeyInBackend(editingKey.id, { appId: effectiveAppId, keyCode: keyCodeStr.trim(), durationDays, price, status: editingStatus, groupAppIds: effectiveGroupAppIds || undefined });
      showToast(lang === 'vi' ? '🎉 Đã cập nhật thông tin Key thành công!' : 'Updated Key details!');
    } else {
      const lines = keyCodeStr.split('\n').map(l => l.trim()).filter(Boolean);
      for (const code of lines) {
        await saveKeyToBackend({ appId: effectiveAppId, keyCode: code, durationDays, price, status: 'AVAILABLE', groupAppIds: effectiveGroupAppIds || undefined });
      }
      const groupLabel = isGroupMode ? ` cho nhóm [${selectedGroupAppIds.map(id => getAppName(id)).join(' + ')}]` : '';
      showToast(lang === 'vi' ? `Đã thêm ${lines.length} Key mới${groupLabel} thành công!` : `Added ${lines.length} Keys successfully!`);
    }
    await loadKeys();
    setIsModalOpen(false);
  };

  // Memoized computations
  const filteredKeys = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return keys.filter(k => {
      if (filterAppId !== 'ALL' && !isKeyBelongToApp(k, filterAppId)) return false;
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

  const availableKeys = useMemo(() => keys.filter(k => k.status === 'AVAILABLE'), [keys]);
  const countTotalAvailable = availableKeys.length;
  const totalInventoryValue = useMemo(() => availableKeys.reduce((sum, k) => sum + (k.price || 50000), 0), [availableKeys]);
  const uniqueDurations = useMemo(() => Array.from(new Set(keys.map(k => k.durationDays || 30))).sort((a, b) => a - b), [keys]);
  const packageStatsMap = useMemo(() => uniqueDurations.map(days => ({
    days,
    count: keys.filter(k => k.status === 'AVAILABLE' && k.durationDays === days).length,
    total: keys.filter(k => k.durationDays === days).length
  })), [uniqueDurations, keys]);

  const renderPackageBadge = (days: number) => {
    if (days === 1) return <span className="package-badge day1">⚡ Gói 1 Ngày</span>;
    if (days === 7) return <span className="package-badge day7">📅 Gói 7 Ngày</span>;
    if (days === 30) return <span className="package-badge day30">🌟 Gói 30 Ngày</span>;
    if (days >= 365) return <span className="package-badge lifetime">👑 Gói Vĩnh Viễn</span>;
    return <span className="package-badge day30">⏱️ Gói {days} Ngày</span>;
  };

  const totalPages = useMemo(() => Math.ceil(filteredKeys.length / pageSize) || 1, [filteredKeys.length, pageSize]);
  const paginatedKeys = useMemo(() => filteredKeys.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filteredKeys, currentPage, pageSize]);

  return (
    <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[24px] p-7 flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2>🔑 {lang === 'vi' ? 'Quản Lý Kho Key Theo Gói' : 'Keys Inventory Manager'}</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="bg-gradient-to-r from-[#38bdf8] to-[#6366f1] border-0 text-white px-5 py-3 rounded-[14px] font-heading font-extrabold text-sm cursor-pointer transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(56,189,248,0.4)]" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: 'none' }} onClick={() => setIsPresetsManagerOpen(true)}>
            ⚙️ {lang === 'vi' ? 'Cấu Hình Bảng Giá Mẫu' : 'Price Presets'}
          </button>
          <button className="bg-gradient-to-r from-[#38bdf8] to-[#6366f1] border-0 text-white px-5 py-3 rounded-[14px] font-heading font-extrabold text-sm cursor-pointer transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(56,189,248,0.4)]" style={{ background: 'linear-gradient(135deg, #0284c7, #2563eb)', border: 'none' }} onClick={exportKeysToCSV}>
            📥 {lang === 'vi' ? 'Xuất CSV Kho Key' : 'Export CSV'}
          </button>
          <button className="bg-gradient-to-r from-[#38bdf8] to-[#6366f1] border-0 text-white px-5 py-3 rounded-[14px] font-heading font-extrabold text-sm cursor-pointer transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(56,189,248,0.4)]" onClick={() => { setEditingKey(null); setIsModalOpen(true); }}>
            + {lang === 'vi' ? 'Nạp Key Mới Về Kho' : 'Import New Keys'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <KeyStatsGrid keys={keys} presets={presets} filterDuration={filterDuration} setFilterDuration={setFilterDuration} countTotalAvailable={countTotalAvailable} totalInventoryValue={totalInventoryValue} packageStatsMap={packageStatsMap} />

      {/* Batch Action Bar */}
      <KeyBatchActionBar lang={lang} selectedCount={selectedKeyIds.length} onMarkAvailable={() => handleBatchStatus('AVAILABLE')} onMarkSold={() => handleBatchStatus('SOLD')} onDeleteBatch={() => setIsBatchConfirmOpen(true)} onClearSelection={() => setSelectedKeyIds([])} />

      {/* Filter Bar */}
      <KeyFilterBar lang={lang} searchQuery={searchQuery} setSearchQuery={setSearchQuery} filterDuration={filterDuration} setFilterDuration={setFilterDuration} filterAppId={filterAppId} setFilterAppId={setFilterAppId} filterStatus={filterStatus} setFilterStatus={setFilterStatus} apps={apps} keys={keys} uniqueDurations={uniqueDurations} countTotalAvailable={countTotalAvailable} setCurrentPage={setCurrentPage} />

      {/* Keys Table */}
      <div className="w-full overflow-x-auto rounded-2xl border border-[#1e293b] bg-[#0f172a]/50 backdrop-blur-[10px]">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="hover:bg-[#38bdf8]/[0.04] transition-colors group">
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input type="checkbox" checked={selectedKeyIds.length === paginatedKeys.length && paginatedKeys.length > 0} onChange={handleSelectAll} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
              </th>
              <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">App</th>
              <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">Key Code</th>
              <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">{lang === 'vi' ? 'Phân Loại Gói' : 'Package'}</th>
              <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">{lang === 'vi' ? 'Thời hạn' : 'Duration'}</th>
              <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">{lang === 'vi' ? 'Giá bán' : 'Price'}</th>
              <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">{lang === 'vi' ? 'Trạng thái' : 'Status'}</th>
              <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">{lang === 'vi' ? 'Thao tác' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} style={{ opacity: 0.6 }}>
                  <td colSpan={8} className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]" style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span className="spin-dot">●</span> Đang tải dữ liệu Kho Key...
                    </div>
                  </td>
                </tr>
              ))
            ) : paginatedKeys.length === 0 ? (
              <tr className="hover:bg-[#38bdf8]/[0.04] transition-colors group">
                <td colSpan={8} className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                  📦 Không tìm thấy Key nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              paginatedKeys.map(k => (
                <tr key={k.id} className={selectedKeyIds.includes(k.id) ? 'selected-row' : ''}>
                  <td style={{ textAlign: 'center' }}>
                    <input type="checkbox" checked={selectedKeyIds.includes(k.id)} onChange={() => toggleSelectKey(k.id)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                  </td>
                  <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                    {k.groupAppIds && k.groupAppIds.trim() ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(99,102,241,0.2))', border: '1px solid rgba(168,85,247,0.5)', borderRadius: '8px', padding: '2px 8px', fontSize: '11px', fontWeight: 'bold', color: '#c084fc' }}>🔗 NHÓM APP</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '2px' }}>
                          {getGroupAppNames(k.groupAppIds).map((name, i) => (
                            <span key={i} style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '6px', padding: '1px 6px', fontSize: '10.5px', color: '#7dd3fc' }}>{name}</span>
                          ))}
                        </div>
                      </div>
                    ) : <strong>{getAppName(k.appId)}</strong>}
                  </td>
                  <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                    <code className="bg-[#1e293b] text-[#38bdf8] px-2.5 py-1 rounded-md font-mono text-[13px]" onClick={() => handleCopyKey(k.keyCode)} style={{ cursor: 'pointer' }} title="Nhấp để sao chép nhanh mã Key">
                      {k.keyCode} 📋
                    </code>
                  </td>
                  <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">{renderPackageBadge(k.durationDays)}</td>
                  <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">{k.durationDays} {lang === 'vi' ? 'ngày' : 'days'}</td>
                  <td style={{ fontWeight: 'bold', color: '#10b981' }}>
                    {(() => {
                      const preset = presets.find(p => p.durationDays === k.durationDays);
                      const displayPrice = preset?.price ?? k.price;
                      return displayPrice ? displayPrice.toLocaleString() : '50,000';
                    })()} đ
                  </td>
                  <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                    <span className={`status-badge ${k.status === 'AVAILABLE' ? 'available' : 'sold'}`}>{k.status === 'AVAILABLE' ? '● CÒN HÀNG' : '✓ ĐÃ BÁN'}</span>
                  </td>
                  <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                    <div className="flex items-center gap-2">
                      <button className="bg-[#38bdf8]/12 text-[#38bdf8] border border-[#38bdf8]/30 px-4 py-2 rounded-[10px] font-inherit font-bold text-[13px] cursor-pointer transition-all duration-200 inline-flex items-center gap-[6px] whitespace-nowrap hover:bg-[#38bdf8] hover:text-[#080c14] hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(56,189,248,0.35)]" onClick={() => { setEditingKey(k); setIsModalOpen(true); }}>
                        ✎ {lang === 'vi' ? 'Sửa' : 'Edit'}
                      </button>
                      <button className="bg-[#ef4444]/12 text-[#f87171] border border-[#ef4444]/30 px-4 py-2 rounded-[10px] font-inherit font-bold text-[13px] cursor-pointer transition-all duration-200 inline-flex items-center gap-[6px] whitespace-nowrap hover:bg-[#ef4444] hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(239,68,68,0.35)]" onClick={() => setDeletingKeyId(k.id)}>
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

      <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filteredKeys.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }} lang={lang} />

      <ConfirmModal isOpen={Boolean(deletingKeyId)} title={lang === 'vi' ? 'Xác Nhận Xóa Key?' : 'Confirm Delete Key?'} message={lang === 'vi' ? 'Bạn có chắc muốn xóa Key này không?' : 'Delete key?'} lang={lang} onConfirm={confirmDeleteKey} onCancel={() => setDeletingKeyId(null)} />

      <ConfirmModal isOpen={isBatchConfirmOpen} title={lang === 'vi' ? `Xác Nhận Xóa Hàng Loạt (${selectedKeyIds.length} Key)?` : `Confirm Batch Delete (${selectedKeyIds.length} Keys)?`} message={lang === 'vi' ? `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedKeyIds.length} Key đã chọn không? Hành động này không thể hoàn tác!` : `Delete selected ${selectedKeyIds.length} keys permanently?`} lang={lang} onConfirm={handleBatchDelete} onCancel={() => setIsBatchConfirmOpen(false)} />

      <KeyImportModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editingKey={editingKey} apps={apps} presets={presets} lang={lang} onSave={handleSaveKey} />

      <PricePresetsModal isOpen={isPresetsManagerOpen} onClose={() => setIsPresetsManagerOpen(false)} presets={presets} setPresets={setPresets} lang={lang} showToast={showToast} onPresetsChanged={loadKeys} />
    </div>
  );
}
