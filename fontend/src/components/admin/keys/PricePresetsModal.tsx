import { useState, useRef } from 'react';
import type { KeyPricePreset, Language } from '../../../types';
import { ModalPortal } from '../../common/ModalPortal';
import { savePricePresetToBackend, deletePricePresetFromBackend } from '../../../services/api';
import { saveStoredPresets } from '../../../pages/admin/KeysPage';

interface PricePresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: KeyPricePreset[];
  setPresets: (p: KeyPricePreset[]) => void;
  lang: Language;
  showToast: (msg: string) => void;
  onPresetsChanged: () => Promise<void>;
}

export function PricePresetsModal({
  isOpen, onClose, presets, setPresets, lang, showToast, onPresetsChanged
}: PricePresetsModalProps) {
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDays, setNewPresetDays] = useState(7);
  const [newPresetPrice, setNewPresetPrice] = useState(35000);
  const [editingPreset, setEditingPreset] = useState<KeyPricePreset | null>(null);
  const newPresetNameInputRef = useRef<HTMLInputElement>(null);

  const handleAddPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim() || newPresetDays <= 0 || newPresetPrice < 2000) {
      showToast(lang === 'vi' ? '⚠️ Vui lòng điền Tên gói, Số ngày > 0 và Giá >= 2,000đ!' : 'Please enter valid preset details!');
      newPresetNameInputRef.current?.focus();
      return;
    }
    const saved = await savePricePresetToBackend({ name: newPresetName.trim(), durationDays: newPresetDays, price: newPresetPrice });
    if (saved) {
      const updated = [...presets.filter(p => p.id !== saved.id), saved];
      setPresets(updated);
      saveStoredPresets(updated);
      setNewPresetName('');
      showToast(lang === 'vi' ? `🎉 Đã lưu gói giá mẫu: ${saved.name}!` : `Saved price preset ${saved.name}!`);
    } else {
      showToast(lang === 'vi' ? '❌ Lỗi khi lưu gói giá.' : 'Failed to save preset.');
    }
  };

  const handleUpdatePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPreset) return;
    if (!newPresetName.trim() || newPresetDays <= 0 || newPresetPrice < 2000) {
      showToast(lang === 'vi' ? '⚠️ Vui lòng điền đủ thông tin!' : 'Please enter valid preset details!');
      return;
    }
    const saved = await savePricePresetToBackend({ id: editingPreset.id, name: newPresetName.trim(), durationDays: newPresetDays, price: newPresetPrice });
    if (saved) {
      const updated = presets.map(p => p.id === saved.id ? saved : p);
      setPresets(updated);
      saveStoredPresets(updated);
      setEditingPreset(null);
      setNewPresetName('');
      setNewPresetDays(7);
      setNewPresetPrice(35000);
      showToast(lang === 'vi' ? `✅ Đã cập nhật gói: ${saved.name}! Đang đồng bộ giá key...` : `Updated preset: ${saved.name}! Syncing key prices...`);
      await onPresetsChanged();
    } else {
      showToast(lang === 'vi' ? '❌ Lỗi khi cập nhật gói giá.' : 'Failed to update preset.');
    }
  };

  const handleDeletePreset = async (presetId: string) => {
    const result = await deletePricePresetFromBackend(presetId);
    if (!result.success) { showToast(result.message ?? '❌ Không thể xóa gói giá này.'); return; }
    const updated = presets.filter(p => p.id !== presetId);
    setPresets(updated);
    saveStoredPresets(updated);
    if (editingPreset?.id === presetId) { setEditingPreset(null); setNewPresetName(''); setNewPresetDays(7); setNewPresetPrice(35000); }
    showToast(lang === 'vi' ? '🗑 Đã xóa gói giá mẫu!' : 'Deleted price preset!');
  };

  const handleEditPresetClick = (p: KeyPricePreset) => {
    setEditingPreset(p); setNewPresetName(p.name); setNewPresetDays(p.durationDays); setNewPresetPrice(p.price);
    newPresetNameInputRef.current?.focus();
  };

  const handleCancelEdit = () => { setEditingPreset(null); setNewPresetName(''); setNewPresetDays(7); setNewPresetPrice(35000); };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/85 backdrop-blur-[14px] flex justify-center items-start z-[999999] p-[20px_16px] overflow-y-auto animate-[fadeIn_0.25s_ease-out]" onClick={onClose}>
        <div className="w-[min(640px,94vw)] h-auto max-h-[calc(100vh-40px)] m-auto flex flex-col bg-[#0f172a] border border-[#38bdf8]/30 rounded-[28px] p-7 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(56,189,248,0.15)] relative overflow-hidden" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
          <button className="absolute top-5 right-[22px] bg-transparent border-none text-[#94a3b8] text-2xl cursor-pointer z-10 transition-colors duration-200 hover:text-[#f87171]" onClick={onClose}>×</button>
          <h4 style={{ color: '#a855f7', display: 'flex', alignItems: 'center', gap: '8px' }}>⚙️ {lang === 'vi' ? 'Cấu Hình Bảng Giá Key Mẫu' : 'Configure Key Price Presets'}</h4>
          <p style={{ color: '#94a3b8', fontSize: '12.5px', marginBottom: '16px' }}>{lang === 'vi' ? 'Tạo các gói giá & ngày cố định để khi nạp key mới chỉ cần chọn từ danh sách mà không cần nhập lại nhiều lần.' : 'Manage pricing presets for faster key importation.'}</p>

          {/* Add/Edit Form */}
          <form onSubmit={editingPreset ? handleUpdatePreset : handleAddPreset} style={{ background: editingPreset ? 'rgba(56,189,248,0.07)' : 'rgba(30, 41, 59, 0.8)', padding: '16px', borderRadius: '16px', border: editingPreset ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(168, 85, 247, 0.3)', marginBottom: '20px', transition: 'all 0.2s ease' }}>
            <strong style={{ color: editingPreset ? '#38bdf8' : '#e9d5ff', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              {editingPreset ? (lang === 'vi' ? '✏️ Đang Sửa Gói:' : '✏️ Editing Preset:') : ('+ ' + (lang === 'vi' ? 'Thêm Gói Mẫu Mới:' : 'Add New Preset:'))}
              {editingPreset && <span style={{ color: '#fbbf24' }}>{editingPreset.name}</span>}
            </strong>
            <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1.2fr_auto] gap-3 items-end">
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>{lang === 'vi' ? 'Tên Gói:' : 'Name:'}</label>
                <input ref={newPresetNameInputRef} className="w-full px-3 py-2.5 rounded-lg border border-[#334155] bg-[#0f172a] text-white font-inherit text-[13px] outline-none transition-all duration-200 focus:border-[#a855f7] focus:ring-[2px] focus:ring-[#a855f7]/20" type="text" placeholder="VD: Gói 7 Ngày" value={newPresetName} onChange={e => setNewPresetName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>{lang === 'vi' ? 'Số Ngày:' : 'Days:'}</label>
                <input className="w-full px-3 py-2.5 rounded-lg border border-[#334155] bg-[#0f172a] text-white font-inherit text-[13px] outline-none transition-all duration-200 focus:border-[#a855f7] focus:ring-[2px] focus:ring-[#a855f7]/20" type="number" min="1" value={newPresetDays || ''} onChange={e => setNewPresetDays(e.target.value === '' ? 0 : parseInt(e.target.value.replace(/^0+/, ''), 10) || 0)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>{lang === 'vi' ? 'Giá (VNĐ):' : 'Price:'}</label>
                <input className="w-full px-3 py-2.5 rounded-lg border border-[#334155] bg-[#0f172a] text-white font-inherit text-[13px] outline-none transition-all duration-200 focus:border-[#a855f7] focus:ring-[2px] focus:ring-[#a855f7]/20" type="number" min="2000" step="1000" value={newPresetPrice || ''} onChange={e => setNewPresetPrice(e.target.value === '' ? 0 : parseInt(e.target.value.replace(/^0+/, ''), 10) || 0)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <button type="submit" className="h-[42px] px-4 rounded-lg font-bold text-[13px] text-white cursor-pointer transition-all duration-200 hover:-translate-y-0.5" style={{ background: editingPreset ? 'linear-gradient(135deg, #38bdf8, #0ea5e9)' : 'linear-gradient(135deg, #a855f7, #7e22ce)', border: 'none', boxShadow: editingPreset ? '0 4px 12px rgba(56,189,248,0.4)' : '0 4px 12px rgba(168,85,247,0.4)' }}>
                  {editingPreset ? (lang === 'vi' ? '💾 Cập Nhật' : '💾 Update') : ('+ ' + (lang === 'vi' ? 'Lưu' : 'Add'))}
                </button>
                {editingPreset && (
                  <button type="button" onClick={handleCancelEdit} className="h-[42px] px-3 rounded-lg font-bold text-[12px] cursor-pointer transition-all duration-200 hover:-translate-y-0.5" style={{ background: 'rgba(100,116,139,0.2)', border: '1px solid #475569', color: '#94a3b8' }}>
                    {lang === 'vi' ? 'Hủy' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Preset list */}
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            <table className="w-full border-collapse text-left text-sm" style={{ width: '100%', fontSize: '12.5px' }}>
              <thead>
                <tr className="hover:bg-[#38bdf8]/[0.04] transition-colors group">
                  <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">{lang === 'vi' ? 'Tên Gói' : 'Name'}</th>
                  <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">{lang === 'vi' ? 'Thời Hạn' : 'Duration'}</th>
                  <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">{lang === 'vi' ? 'Giá Bán (VNĐ)' : 'Price'}</th>
                  <th style={{ textAlign: 'center', minWidth: '120px' }}>{lang === 'vi' ? 'Thao tác' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {presets.map(p => (
                  <tr key={p.id}>
                    <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]"><strong>{p.name}</strong></td>
                    <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">{p.durationDays} {lang === 'vi' ? 'Ngày' : 'Days'}</td>
                    <td style={{ color: '#10b981', fontWeight: 'bold' }}>{p.price.toLocaleString()} đ</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button onClick={() => editingPreset?.id === p.id ? handleCancelEdit() : handleEditPresetClick(p)} style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 'bold', borderRadius: '8px', background: editingPreset?.id === p.id ? 'rgba(56,189,248,0.2)' : 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', cursor: 'pointer' }}>
                          ✏️ {editingPreset?.id === p.id ? (lang === 'vi' ? 'Hủy' : 'Cancel') : (lang === 'vi' ? 'Sửa' : 'Edit')}
                        </button>
                        <button onClick={() => handleDeletePreset(p.id)} style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 'bold', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer' }}>
                          🗑 {lang === 'vi' ? 'Xóa' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
