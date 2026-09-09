import { useState, useRef, useEffect } from 'react';
import type { LicenseKeyItem, AppItem, KeyPricePreset, Language } from '../../../types';
import { ModalPortal } from '../../common/ModalPortal';

interface KeyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingKey: LicenseKeyItem | null;
  apps: AppItem[];
  presets: KeyPricePreset[];
  lang: Language;
  onSave: (data: {
    isGroupMode: boolean;
    selectedAppId: string;
    selectedGroupAppIds: string[];
    keyCodeStr: string;
    durationDays: number;
    price: number;
    editingStatus: 'AVAILABLE' | 'SOLD';
  }) => Promise<void>;
  initialGroupAppIds?: string[];
}

export function KeyImportModal({
  isOpen, onClose, editingKey, apps, presets, lang, onSave, initialGroupAppIds
}: KeyImportModalProps) {
  const [selectedAppId, setSelectedAppId] = useState(apps[0]?.id || '');
  const [keyCodeStr, setKeyCodeStr] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [price, setPrice] = useState(50000);
  const [editingStatus, setEditingStatus] = useState<'AVAILABLE' | 'SOLD'>('AVAILABLE');
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [selectedGroupAppIds, setSelectedGroupAppIds] = useState<string[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState(presets[0]?.id || 'custom');

  const appIdSelectRef = useRef<HTMLSelectElement>(null);
  const keyCodeInputRef = useRef<HTMLInputElement>(null);
  const keyCodeTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingKey) {
      setSelectedAppId(editingKey.appId);
      setKeyCodeStr(editingKey.keyCode);
      setDurationDays(editingKey.durationDays);
      setPrice(editingKey.price);
      setEditingStatus(editingKey.status as 'AVAILABLE' | 'SOLD');
      if (editingKey.groupAppIds?.trim()) {
        setIsGroupMode(true);
        setSelectedGroupAppIds(editingKey.groupAppIds.split(',').map(id => id.trim()).filter(Boolean));
      } else {
        setIsGroupMode(false);
        setSelectedGroupAppIds(initialGroupAppIds || []);
      }
      const matched = presets.find(p => p.durationDays === editingKey.durationDays && Math.abs(p.price - editingKey.price) < 1);
      setSelectedPresetId(matched ? matched.id : 'custom');
    } else {
      setSelectedAppId(apps[0]?.id || '');
      setKeyCodeStr('');
      setIsGroupMode(false);
      setSelectedGroupAppIds([]);
      setEditingStatus('AVAILABLE');
      if (presets.length > 0) {
        setSelectedPresetId(presets[0].id);
        setDurationDays(presets[0].durationDays);
        setPrice(presets[0].price);
      } else {
        setSelectedPresetId('custom');
        setDurationDays(30);
        setPrice(50000);
      }
    }
  }, [isOpen, editingKey]);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (presetId === 'custom') return;
    const found = presets.find(p => p.id === presetId);
    if (found) { setDurationDays(found.durationDays); setPrice(found.price); }
  };

  const toggleGroupApp = (appId: string) => {
    setSelectedGroupAppIds(prev => prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]);
  };

  const getAppName = (id: string) => apps.find(a => a.id === id)?.name || id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ isGroupMode, selectedAppId, selectedGroupAppIds, keyCodeStr, durationDays, price, editingStatus });
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/85 backdrop-blur-[14px] flex justify-center items-start z-[999999] p-[20px_16px] overflow-y-auto animate-[fadeIn_0.25s_ease-out]" onClick={onClose}>
        <div className="w-[min(640px,94vw)] h-auto max-h-[calc(100vh-40px)] m-auto flex flex-col bg-[#0f172a] border border-[#38bdf8]/30 rounded-[28px] p-7 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(56,189,248,0.15)] relative overflow-hidden" onClick={e => e.stopPropagation()}>
          <h4>🔑 {editingKey ? (lang === 'vi' ? 'Chỉnh Sửa Thông Tin Key' : 'Edit License Key') : (lang === 'vi' ? 'Nạp Key Mới Phân Loại Theo Gói' : 'Import New Keys By Package')}</h4>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-170px)] pr-1">

            {/* Toggle: Group mode */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: isGroupMode ? 'rgba(168,85,247,0.12)' : 'rgba(30,41,59,0.6)', border: isGroupMode ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(51,65,85,0.8)', borderRadius: '12px', padding: '10px 14px', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onClick={() => { setIsGroupMode(!isGroupMode); setSelectedGroupAppIds([]); if (!isGroupMode && apps.length >= 2) setSelectedGroupAppIds([apps[0].id, apps[1].id]); }}>
              <div style={{ width: '38px', height: '21px', borderRadius: '11px', position: 'relative', background: isGroupMode ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'rgba(51,65,85,0.8)', border: isGroupMode ? '1px solid #a855f7' : '1px solid #475569', transition: 'all 0.25s ease', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: '2px', left: isGroupMode ? '18px' : '2px', width: '15px', height: '15px', borderRadius: '50%', background: isGroupMode ? '#fff' : '#94a3b8', transition: 'left 0.25s ease' }} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: isGroupMode ? '#c084fc' : '#94a3b8' }}>🔗 {lang === 'vi' ? 'Key Nhóm Ứng Dụng (Multi-App)' : 'Multi-App Group Key'}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>{lang === 'vi' ? 'Key được dùng chung cho nhiều app — mua từ app nào cũng được' : 'Key shared across multiple apps — purchasable from any app in the group'}</div>
              </div>
            </div>

            {/* App selection */}
            {isGroupMode ? (
              <div className="flex flex-col gap-2">
                <label style={{ color: '#c084fc', fontWeight: 'bold', fontSize: '13px' }}>🔗 {lang === 'vi' ? 'Chọn các App trong Nhóm (* ít nhất 2 app):' : 'Select Apps in Group (* min 2):'}</label>
                <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.35)', borderRadius: '12px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {apps.map(a => (
                    <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer', background: selectedGroupAppIds.includes(a.id) ? 'rgba(168,85,247,0.15)' : 'transparent', border: selectedGroupAppIds.includes(a.id) ? '1px solid rgba(168,85,247,0.4)' : '1px solid transparent', transition: 'all 0.15s ease' }}>
                      <input type="checkbox" checked={selectedGroupAppIds.includes(a.id)} onChange={() => toggleGroupApp(a.id)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#a855f7' }} />
                      <span style={{ fontSize: '13px', color: selectedGroupAppIds.includes(a.id) ? '#c084fc' : '#cbd5e1', fontWeight: selectedGroupAppIds.includes(a.id) ? 'bold' : 'normal' }}>
                        {a.name} <span style={{ color: '#64748b', fontSize: '11px' }}>({a.sub})</span>
                      </span>
                    </label>
                  ))}
                </div>
                {selectedGroupAppIds.length > 0 && (
                  <div style={{ fontSize: '11.5px', color: '#a855f7', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    ✓ Đã chọn: {selectedGroupAppIds.map((id, i) => <span key={i} style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '6px', padding: '1px 7px' }}>{getAppName(id)}</span>)}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label>{lang === 'vi' ? 'Chọn App Catalog (*):' : 'Select App (*):'}</label>
                <select className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" ref={appIdSelectRef} value={selectedAppId} onChange={e => setSelectedAppId(e.target.value)}>
                  {apps.map(a => <option key={a.id} value={a.id}>{a.name} ({a.sub})</option>)}
                </select>
              </div>
            )}

            {/* Preset selector */}
            <div className="flex flex-col gap-2" style={{ background: 'rgba(99, 102, 241, 0.12)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.4)', marginBottom: '14px' }}>
              <label style={{ color: '#a5b4fc', fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '6px' }}>💎 {lang === 'vi' ? 'Chọn Gói Giá Có Sẵn (*):' : 'Select Pre-set Package (*):'}</label>
              <select value={selectedPresetId} onChange={e => handleSelectPreset(e.target.value)} style={{ fontWeight: 800, color: '#38bdf8', background: '#0f172a', border: '1px solid #38bdf8', padding: '9px 12px', borderRadius: '8px', width: '100%', fontSize: '13.5px' }}>
                {presets.map(p => <option key={p.id} value={p.id}>{p.name} — {p.durationDays} Ngày — {p.price.toLocaleString()} VNĐ</option>)}
                <option value="custom">✏️ {lang === 'vi' ? 'Tự nhập ngày & giá thủ công...' : 'Enter custom days & price...'}</option>
              </select>
              {selectedPresetId !== 'custom' && (
                <div style={{ display: 'flex', gap: '14px', marginTop: '10px', padding: '8px 12px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)', fontSize: '12.5px' }}>
                  <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>⏱️ {lang === 'vi' ? 'Hạn dùng:' : 'Duration:'} {durationDays} {lang === 'vi' ? 'Ngày' : 'Days'}</span>
                  <span style={{ color: '#4ade80', fontWeight: 'bold' }}>💰 {lang === 'vi' ? 'Giá bán:' : 'Price:'} {price.toLocaleString()} đ</span>
                </div>
              )}
            </div>

            {/* Custom days/price inputs */}
            {selectedPresetId === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label>{lang === 'vi' ? 'Số Ngày Thời Hạn (Ngày):' : 'Duration (Days):'}</label>
                  <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" type="number" min="1" value={durationDays || ''} onChange={e => setDurationDays(e.target.value === '' ? 0 : parseInt(e.target.value.replace(/^0+/, ''), 10) || 0)} />
                </div>
                <div className="flex flex-col gap-2">
                  <label>{lang === 'vi' ? 'Giá Bán Gói (VNĐ - Tối thiểu 2,000đ):' : 'Price (VND - Min 2,000):'}</label>
                  <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" type="number" min="2000" step="1000" value={price || ''} onChange={e => setPrice(e.target.value === '' ? 0 : parseInt(e.target.value.replace(/^0+/, ''), 10) || 0)} />
                </div>
              </div>
            )}

            {/* Status (edit only) */}
            {editingKey && (
              <div className="flex flex-col gap-2">
                <label>{lang === 'vi' ? 'Trạng Thái Key:' : 'Key Status:'}</label>
                <select className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" value={editingStatus} onChange={e => setEditingStatus(e.target.value as 'AVAILABLE' | 'SOLD')}>
                  <option value="AVAILABLE">● CÒN HÀNG (AVAILABLE)</option>
                  <option value="SOLD">✓ ĐÃ BÁN (SOLD)</option>
                </select>
              </div>
            )}

            {/* Key code input */}
            <div className="flex flex-col gap-2">
              <label>{editingKey ? (lang === 'vi' ? 'Mã Key Code:' : 'Key Code:') : (lang === 'vi' ? 'Danh sách Mã Key (Mỗi mã 1 dòng để nạp hàng loạt):' : 'Key Codes (One per line for bulk import):')}</label>
              {editingKey ? (
                <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" type="text" ref={keyCodeInputRef} value={keyCodeStr} onChange={e => setKeyCodeStr(e.target.value)} />
              ) : (
                <textarea className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" rows={5} ref={keyCodeTextareaRef} value={keyCodeStr} onChange={e => setKeyCodeStr(e.target.value)} />
              )}
            </div>

            <div className="flex justify-end gap-3 mt-3.5 pt-3.5 border-t border-white/10 shrink-0">
              <button type="button" className="px-5 py-3 rounded-xl border border-[#334155] bg-[#1e293b] text-[#e2e8f0] font-bold cursor-pointer transition-all duration-200 hover:bg-[#334155]" onClick={onClose}>{lang === 'vi' ? 'Hủy' : 'Cancel'}</button>
              <button type="submit" className="px-6 py-3 rounded-xl border-0 bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white font-heading font-extrabold text-sm cursor-pointer transition-all duration-250 shadow-[0_4px_14px_rgba(56,189,248,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(56,189,248,0.5)]">
                {editingKey ? (lang === 'vi' ? '💾 Lưu Thay Đổi' : '💾 Save Changes') : (lang === 'vi' ? '💾 Nạp Vào Kho' : '💾 Import Keys')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
