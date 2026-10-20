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
import { formatDateTime } from '../../services/dateUtils';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Pagination } from '../../components/common/Pagination';
import { copyTextToClipboard } from '../../utils/clipboard';
import { isKeyBelongToApp } from '../../utils/keyUtils';
import { KeyStatsGrid } from '../../components/admin/keys/KeyStatsGrid';
import { KeyFilterBar, type KeySortOption } from '../../components/admin/keys/KeyFilterBar';
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
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
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
  const [sortBy, setSortBy] = useState<KeySortOption>('NEWEST');
  const [showKeyCodes, setShowKeyCodes] = useState<boolean>(true);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [presets, setPresets] = useState<KeyPricePreset[]>(getStoredPresets);
  const [isPresetsManagerOpen, setIsPresetsManagerOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsModalOpen(false); setDeletingKeyId(null); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => { setCurrentPage(1); }, [filterDuration, filterAppId, filterStatus, searchQuery, sortBy]);

  const loadKeys = async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);
    const [keysData, presetsData] = await Promise.all([fetchAdminKeysFromBackend(), fetchPricePresetsFromBackend()]);
    setKeys(keysData);
    if (presetsData && presetsData.length > 0) { setPresets(presetsData); saveStoredPresets(presetsData); }
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => { loadKeys(); }, []);

  const handleRefresh = async () => {
    await loadKeys(true);
    showToast(lang === 'vi' ? '🔄 Đã cập nhật dữ liệu kho Key mới nhất!' : 'Refreshed keys inventory!');
  };

  const getAppName = useCallback((appId: string) => {
    const app = apps.find(a => a.id === appId);
    return app ? app.name : appId;
  }, [apps]);

  const getGroupAppNames = useCallback((groupAppIds: string) => {
    return groupAppIds.split(',').map(id => id.trim()).filter(Boolean).map(id => getAppName(id));
  }, [getAppName]);

  const handleCopyKey = async (id: string, code: string) => {
    if (!code) return;
    const success = await copyTextToClipboard(code);
    if (success) {
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
      showToast(lang === 'vi' ? `📋 Đã sao chép mã Key: ${code}` : `Copied Key Code: ${code}`);
    }
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

  const handleQuickToggleStatus = async (k: LicenseKeyItem) => {
    const newStatus = k.status === 'AVAILABLE' ? 'SOLD' : 'AVAILABLE';
    const res = await batchUpdateKeyStatusInBackend([k.id], newStatus);
    if (res.success) {
      showToast(lang === 'vi' ? `⚡ Đã đổi trạng thái sang [${newStatus === 'AVAILABLE' ? 'Còn hàng' : 'Đã bán'}]` : `Status updated to ${newStatus}`);
      await loadKeys(true);
    }
  };

  const handleCopySelectedKeys = async () => {
    const selectedKeys = keys.filter(k => selectedKeyIds.includes(k.id));
    const codes = selectedKeys.map(k => k.keyCode).filter(Boolean).join('\n');
    if (!codes) {
      showToast(lang === 'vi' ? '⚠️ Không có mã key nào để sao chép!' : 'No key codes to copy!');
      return;
    }
    const success = await copyTextToClipboard(codes);
    if (success) {
      showToast(lang === 'vi' ? `📋 Đã sao chép ${selectedKeys.length} mã Key đã chọn vào Clipboard!` : `Copied ${selectedKeys.length} selected keys!`);
    }
  };

  const handleCopyAllAvailable = async () => {
    const availCodes = filteredKeys.filter(k => k.status === 'AVAILABLE').map(k => k.keyCode).filter(Boolean).join('\n');
    if (!availCodes) {
      showToast(lang === 'vi' ? '⚠️ Hiện không có key nào còn hàng trong danh sách!' : 'No available keys to copy!');
      return;
    }
    const count = filteredKeys.filter(k => k.status === 'AVAILABLE').length;
    const success = await copyTextToClipboard(availCodes);
    if (success) {
      showToast(lang === 'vi' ? `📋 Đã sao chép tất cả ${count} Key còn hàng vào Clipboard!` : `Copied all ${count} available keys!`);
    }
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
    const headers = ['ID', 'App Name', 'Key Code', 'Duration (Days)', 'Price (VND)', 'Status', 'Created At', 'Sold At'];
    const rows = filteredKeys.map(k => [k.id, getAppName(k.appId), k.keyCode, k.durationDays, k.price || 50000, k.status, k.createdAt || '', k.soldAt || '']);
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
      await updateKeyInBackend(editingKey.id, {
        appId: effectiveAppId,
        keyCode: keyCodeStr.trim(),
        durationDays,
        price,
        status: editingStatus,
        groupAppIds: isGroupMode ? effectiveGroupAppIds : ''
      });
      showToast(lang === 'vi' ? '🎉 Đã cập nhật thông tin Key thành công!' : 'Updated Key details!');
    } else {
      // Tự động lọc trùng các mã key trùng lặp trong cùng đợt nạp
      const lines = Array.from(new Set(keyCodeStr.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean)));
      for (const code of lines) {
        await saveKeyToBackend({ appId: effectiveAppId, keyCode: code, durationDays, price, status: 'AVAILABLE', groupAppIds: effectiveGroupAppIds || undefined });
      }
      const groupLabel = isGroupMode ? ` cho nhóm [${selectedGroupAppIds.map(id => getAppName(id)).join(' + ')}]` : '';
      showToast(lang === 'vi' ? `Đã thêm ${lines.length} Key mới${groupLabel} thành công!` : `Added ${lines.length} Keys successfully!`);
    }
    await loadKeys();
    setIsModalOpen(false);
  };

  // Memoized computations - CHÍNH XÁC HÓA BỘ LỌC KEY: Hỗ trợ tìm kiếm cả Key Nhóm & Thời Hạn chuẩn
  const filteredKeys = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return keys.filter(k => {
      if (filterAppId !== 'ALL' && !isKeyBelongToApp(k, filterAppId)) return false;
      if (filterStatus !== 'ALL' && k.status !== filterStatus) return false;
      const keyDays = Number(k.durationDays) || 30;
      if (filterDuration !== 'ALL' && String(keyDays) !== filterDuration) return false;
      if (query) {
        const appName = getAppName(k.appId).toLowerCase();
        const keyCode = (k.keyCode || '').toLowerCase();
        // Kiểm tra cả tên của tất cả app trong nhóm
        let matchesGroupApp = false;
        if (k.groupAppIds && k.groupAppIds.trim()) {
          const groupNames = getGroupAppNames(k.groupAppIds).map(n => n.toLowerCase());
          matchesGroupApp = groupNames.some(name => name.includes(query));
        }
        if (!keyCode.includes(query) && !appName.includes(query) && !matchesGroupApp) return false;
      }
      return true;
    });
  }, [keys, filterAppId, filterStatus, filterDuration, searchQuery, getAppName, getGroupAppNames]);

  // Sorting
  const sortedAndFilteredKeys = useMemo(() => {
    const list = [...filteredKeys];
    if (sortBy === 'NEWEST') {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (sortBy === 'OLDEST') {
      list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    } else if (sortBy === 'DURATION_DESC') {
      list.sort((a, b) => (Number(b.durationDays) || 30) - (Number(a.durationDays) || 30));
    } else if (sortBy === 'DURATION_ASC') {
      list.sort((a, b) => (Number(a.durationDays) || 30) - (Number(b.durationDays) || 30));
    } else if (sortBy === 'PRICE_DESC') {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'PRICE_ASC') {
      list.sort((a, b) => (a.price || 0) - (b.price || 0));
    }
    return list;
  }, [filteredKeys, sortBy]);

  const availableKeys = useMemo(() => keys.filter(k => k.status === 'AVAILABLE'), [keys]);
  const countTotalAvailable = availableKeys.length;
  const totalInventoryValue = useMemo(() => availableKeys.reduce((sum, k) => sum + (k.price || 50000), 0), [availableKeys]);
  const uniqueDurations = useMemo(() => Array.from(new Set(keys.map(k => Number(k.durationDays) || 30))).sort((a, b) => a - b), [keys]);
  const packageStatsMap = useMemo(() => uniqueDurations.map(days => ({
    days,
    count: keys.filter(k => k.status === 'AVAILABLE' && (Number(k.durationDays) || 30) === days).length,
    total: keys.filter(k => (Number(k.durationDays) || 30) === days).length
  })), [uniqueDurations, keys]);

  const renderPackageBadge = (days: number) => {
    if (days === 1) return <span className="package-badge day1">⚡ Gói 1 Ngày</span>;
    if (days === 7) return <span className="package-badge day7">📅 Gói 7 Ngày</span>;
    if (days === 30) return <span className="package-badge day30">🌟 Gói 30 Ngày</span>;
    if (days >= 365) return <span className="package-badge lifetime">👑 Gói Vĩnh Viễn</span>;
    return <span className="package-badge day30">⏱️ Gói {days} Ngày</span>;
  };

  const isAnyFilterActive = filterDuration !== 'ALL' || filterAppId !== 'ALL' || filterStatus !== 'ALL' || Boolean(searchQuery.trim());

  const totalPages = useMemo(() => Math.ceil(sortedAndFilteredKeys.length / pageSize) || 1, [sortedAndFilteredKeys.length, pageSize]);
  const paginatedKeys = useMemo(() => sortedAndFilteredKeys.slice((currentPage - 1) * pageSize, currentPage * pageSize), [sortedAndFilteredKeys, currentPage, pageSize]);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[24px] p-7 flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-heading font-extrabold text-[#1E293B] m-0 flex items-center gap-2.5">
            <span>🔑</span> {lang === 'vi' ? 'Quản Lý Kho Key VIP' : 'License Keys Inventory'}
            <span className="text-xs font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-0.5 rounded-full">
              {keys.length} Key
            </span>
          </h2>
          <p className="text-xs text-[#64748B] m-0 mt-1">
            {lang === 'vi' ? 'Quản lý, nạp kho, phân loại theo gói và kiểm tra trạng thái bán tự động' : 'Manage key stocks, packages and inventory status'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="bg-white border border-[#CBD5E1] text-[#334155] px-3.5 py-2.5 rounded-xl font-heading font-bold text-xs cursor-pointer transition-all duration-200 flex items-center gap-1.5 hover:bg-[#F8FAFC] hover:border-[#94A3B8] shadow-sm"
            onClick={handleRefresh}
            title="Tải lại dữ liệu kho mới nhất"
          >
            <span className={isRefreshing ? 'animate-spin inline-block' : ''}>🔄</span> {lang === 'vi' ? 'Làm Mới' : 'Refresh'}
          </button>

          <button
            type="button"
            className="bg-white border border-[#CBD5E1] text-[#334155] px-3.5 py-2.5 rounded-xl font-heading font-bold text-xs cursor-pointer transition-all duration-200 flex items-center gap-1.5 hover:bg-[#F8FAFC] hover:border-[#94A3B8] shadow-sm"
            onClick={handleCopyAllAvailable}
            title="Sao chép toàn bộ mã Key còn hàng đang hiển thị"
          >
            📋 {lang === 'vi' ? 'Copy Key Còn Hàng' : 'Copy Available'}
          </button>

          <button
            type="button"
            className="bg-white border border-[#CBD5E1] text-[#334155] px-3.5 py-2.5 rounded-xl font-heading font-bold text-xs cursor-pointer transition-all duration-200 flex items-center gap-1.5 hover:bg-[#F8FAFC] hover:border-[#94A3B8] shadow-sm"
            onClick={() => setIsPresetsManagerOpen(true)}
          >
            ⚙️ {lang === 'vi' ? 'Bảng Giá Mẫu' : 'Price Presets'}
          </button>

          <button
            type="button"
            className="bg-white border border-[#CBD5E1] text-[#334155] px-3.5 py-2.5 rounded-xl font-heading font-bold text-xs cursor-pointer transition-all duration-200 flex items-center gap-1.5 hover:bg-[#F8FAFC] hover:border-[#94A3B8] shadow-sm"
            onClick={exportKeysToCSV}
          >
            📥 {lang === 'vi' ? 'Xuất CSV' : 'Export CSV'}
          </button>

          <button
            type="button"
            className="bg-[#2563EB] border-0 text-white px-4 py-2.5 rounded-xl font-heading font-extrabold text-xs cursor-pointer transition-all duration-200 flex items-center gap-1.5 hover:-translate-y-0.5 hover:bg-[#1D4ED8] shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
            onClick={() => { setEditingKey(null); setIsModalOpen(true); }}
          >
            + {lang === 'vi' ? 'Nạp Key Mới' : 'Import Keys'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <KeyStatsGrid keys={keys} presets={presets} filterDuration={filterDuration} setFilterDuration={setFilterDuration} countTotalAvailable={countTotalAvailable} totalInventoryValue={totalInventoryValue} packageStatsMap={packageStatsMap} />

      {/* Batch Action Bar */}
      <KeyBatchActionBar
        lang={lang}
        selectedCount={selectedKeyIds.length}
        onCopySelected={handleCopySelectedKeys}
        onMarkAvailable={() => handleBatchStatus('AVAILABLE')}
        onMarkSold={() => handleBatchStatus('SOLD')}
        onDeleteBatch={() => setIsBatchConfirmOpen(true)}
        onClearSelection={() => setSelectedKeyIds([])}
      />

      {/* Filter Bar */}
      <KeyFilterBar
        lang={lang}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterDuration={filterDuration}
        setFilterDuration={setFilterDuration}
        filterAppId={filterAppId}
        setFilterAppId={setFilterAppId}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        sortBy={sortBy}
        setSortBy={setSortBy}
        apps={apps}
        keys={keys}
        uniqueDurations={uniqueDurations}
        countTotalAvailable={countTotalAvailable}
        setCurrentPage={setCurrentPage}
      />

      {/* Active Filter Notification Bar */}
      {isAnyFilterActive && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', padding: '10px 16px', background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.3)', borderRadius: '12px', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', color: '#1d4ed8', fontWeight: 600 }}>
            <span>🔍 Đang áp dụng bộ lọc:</span>
            <span>Hiển thị <strong>{sortedAndFilteredKeys.length}</strong> / <strong>{keys.length}</strong> Key</span>
            {filterDuration !== 'ALL' && <span style={{ background: '#dbeafe', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' }}>Gói: {filterDuration} ngày</span>}
            {filterAppId !== 'ALL' && <span style={{ background: '#dbeafe', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' }}>App: {getAppName(filterAppId)}</span>}
            {filterStatus !== 'ALL' && <span style={{ background: '#dbeafe', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' }}>Trạng thái: {filterStatus === 'AVAILABLE' ? 'Còn hàng' : 'Đã bán'}</span>}
            {searchQuery && <span style={{ background: '#dbeafe', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' }}>Từ khóa: "{searchQuery}"</span>}
          </div>
          <button
            type="button"
            onClick={() => { setFilterDuration('ALL'); setFilterAppId('ALL'); setFilterStatus('ALL'); setSearchQuery(''); setCurrentPage(1); }}
            style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ✕ Xóa bộ lọc (Xem tất cả)
          </button>
        </div>
      )}

      {/* Keys Table */}
      <div className="w-full overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white backdrop-blur-[10px]">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
              <th style={{ width: '40px', textAlign: 'center', padding: '14px 12px' }}>
                <input
                  type="checkbox"
                  checked={selectedKeyIds.length === paginatedKeys.length && paginatedKeys.length > 0}
                  onChange={handleSelectAll}
                  style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#2563EB' }}
                />
              </th>
              <th className="p-[14px_16px] text-[#64748B] font-heading font-extrabold text-xs tracking-[0.5px] uppercase">App Catalog</th>
              <th className="p-[14px_16px] text-[#64748B] font-heading font-extrabold text-xs tracking-[0.5px] uppercase">
                <div className="flex items-center gap-2">
                  <span>Mã Key Code</span>
                  <button
                    type="button"
                    onClick={() => setShowKeyCodes(!showKeyCodes)}
                    className="border-0 bg-transparent text-[#64748B] hover:text-[#2563EB] cursor-pointer text-xs"
                    title={showKeyCodes ? 'Ẩn mã key' : 'Hiện mã key'}
                  >
                    {showKeyCodes ? '👁️' : '🙈'}
                  </button>
                </div>
              </th>
              <th className="p-[14px_16px] text-[#64748B] font-heading font-extrabold text-xs tracking-[0.5px] uppercase">{lang === 'vi' ? 'Phân Loại' : 'Package'}</th>
              <th className="p-[14px_16px] text-[#64748B] font-heading font-extrabold text-xs tracking-[0.5px] uppercase">{lang === 'vi' ? 'Giá bán' : 'Price'}</th>
              <th className="p-[14px_16px] text-[#64748B] font-heading font-extrabold text-xs tracking-[0.5px] uppercase">{lang === 'vi' ? 'Thời gian' : 'Date'}</th>
              <th className="p-[14px_16px] text-[#64748B] font-heading font-extrabold text-xs tracking-[0.5px] uppercase">{lang === 'vi' ? 'Trạng thái' : 'Status'}</th>
              <th className="p-[14px_16px] text-[#64748B] font-heading font-extrabold text-xs tracking-[0.5px] uppercase text-right">{lang === 'vi' ? 'Thao tác' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} style={{ opacity: 0.6 }}>
                  <td colSpan={8} className="p-[18px_20px] border-b border-[#E5E7EB] text-center text-[#94a3b8]">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span className="spin-dot">●</span> Đang tải dữ liệu Kho Key...
                    </div>
                  </td>
                </tr>
              ))
            ) : paginatedKeys.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 border-b border-[#E5E7EB] text-center text-[#94a3b8]">
                  📦 Không tìm thấy Key nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              paginatedKeys.map(k => (
                <tr key={k.id} className={`hover:bg-[#2563EB]/[0.02] transition-colors border-b border-[#E5E7EB] last:border-b-0 ${selectedKeyIds.includes(k.id) ? 'bg-[#EFF6FF]/60' : ''}`}>
                  <td style={{ textAlign: 'center', padding: '14px 12px' }}>
                    <input
                      type="checkbox"
                      checked={selectedKeyIds.includes(k.id)}
                      onChange={() => toggleSelectKey(k.id)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#2563EB' }}
                    />
                  </td>
                  <td className="p-[14px_16px] align-middle">
                    {k.groupAppIds && k.groupAppIds.trim() ? (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 text-purple-700 rounded-md px-2 py-0.5 text-[10.5px] font-extrabold w-fit">
                          🔗 NHÓM APP ({k.groupAppIds.split(',').length})
                        </span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {getGroupAppNames(k.groupAppIds).map((name, i) => (
                            <span key={i} className="bg-sky-50 border border-sky-200 text-sky-800 rounded px-1.5 py-0.2 text-[11px] font-medium">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <strong className="text-[#1E293B] text-sm">{getAppName(k.appId)}</strong>
                    )}
                  </td>
                  <td className="p-[14px_16px] align-middle">
                    <div className="flex items-center gap-2">
                      <code
                        className="bg-[#F8FAFC] border border-[#CBD5E1] text-[#2563EB] px-2.5 py-1 rounded-lg font-mono text-[13px] font-bold cursor-pointer hover:bg-[#EFF6FF] hover:border-[#2563EB] transition-all flex items-center gap-1.5"
                        onClick={() => handleCopyKey(k.id, k.keyCode)}
                        title="Bấm để sao chép mã Key"
                      >
                        {showKeyCodes ? k.keyCode : '••••••••••••••••'}
                        <span className="text-xs text-[#64748B]">📋</span>
                      </code>
                      {copiedKeyId === k.id && (
                        <span className="text-[11px] font-bold text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 rounded-md animate-[fadeIn_0.2s_ease-out]">
                          ✓ Đã chép!
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-[14px_16px] align-middle">
                    <div className="flex flex-col gap-1">
                      {renderPackageBadge(k.durationDays)}
                      <span className="text-xs text-[#64748B]">{k.durationDays} {lang === 'vi' ? 'ngày sử dụng' : 'days'}</span>
                    </div>
                  </td>
                  <td className="p-[14px_16px] align-middle">
                    <strong className="text-[#059669] text-sm">
                      {(() => {
                        const preset = presets.find(p => p.durationDays === k.durationDays);
                        const displayPrice = preset?.price ?? k.price;
                        return displayPrice ? displayPrice.toLocaleString() : '50,000';
                      })()} đ
                    </strong>
                  </td>
                  <td className="p-[14px_16px] align-middle text-xs text-[#64748B]">
                    <div>
                      <span className="font-semibold text-[#334155]">Nạp:</span> {k.createdAt ? formatDateTime(k.createdAt) : '-'}
                    </div>
                    {k.status === 'SOLD' && k.soldAt && (
                      <div className="text-[#DC2626] font-medium mt-0.5">
                        <span className="font-semibold">Bán:</span> {formatDateTime(k.soldAt)}
                      </div>
                    )}
                  </td>
                  <td className="p-[14px_16px] align-middle">
                    <button
                      type="button"
                      onClick={() => handleQuickToggleStatus(k)}
                      className={`status-badge cursor-pointer transition-all border-0 ${k.status === 'AVAILABLE' ? 'available hover:opacity-85' : 'sold hover:opacity-85'}`}
                      title="Bấm vào để chuyển đổi nhanh trạng thái Còn Hàng / Đã Bán"
                    >
                      {k.status === 'AVAILABLE' ? '● CÒN HÀNG' : '✓ ĐÃ BÁN'}
                    </button>
                  </td>
                  <td className="p-[14px_16px] align-middle text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        className="bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-all hover:bg-[#2563EB] hover:text-white"
                        onClick={() => { setEditingKey(k); setIsModalOpen(true); }}
                        title="Chỉnh sửa thông tin key"
                      >
                        ✎ Sửa
                      </button>
                      <button
                        type="button"
                        className="bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] px-2.5 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-all hover:bg-[#DC2626] hover:text-white"
                        onClick={() => setDeletingKeyId(k.id)}
                        title="Xóa key này"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={sortedAndFilteredKeys.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }} lang={lang} />

      <ConfirmModal isOpen={Boolean(deletingKeyId)} title={lang === 'vi' ? 'Xác Nhận Xóa Key?' : 'Confirm Delete Key?'} message={lang === 'vi' ? 'Bạn có chắc muốn xóa Key này không?' : 'Delete key?'} lang={lang} onConfirm={confirmDeleteKey} onCancel={() => setDeletingKeyId(null)} />

      <ConfirmModal isOpen={isBatchConfirmOpen} title={lang === 'vi' ? `Xác Nhận Xóa Hàng Loạt (${selectedKeyIds.length} Key)?` : `Confirm Batch Delete (${selectedKeyIds.length} Keys)?`} message={lang === 'vi' ? `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedKeyIds.length} Key đã chọn không? Hành động này không thể hoàn tác!` : `Delete selected ${selectedKeyIds.length} keys permanently?`} lang={lang} onConfirm={handleBatchDelete} onCancel={() => setIsBatchConfirmOpen(false)} />

      <KeyImportModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editingKey={editingKey} apps={apps} presets={presets} lang={lang} onSave={handleSaveKey} />

      <PricePresetsModal isOpen={isPresetsManagerOpen} onClose={() => setIsPresetsManagerOpen(false)} presets={presets} setPresets={setPresets} lang={lang} showToast={showToast} onPresetsChanged={loadKeys} />
    </div>
  );
}
