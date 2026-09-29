import { useState } from 'react';
import type { AppItem, SystemConfig, Language } from '../../types';
import { saveAppToBackend, deleteAppFromBackend, fetchAppsFromBackend } from '../../services/api';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { LazyImage } from '../../components/common/LazyImage';
import { AppFormModal } from '../../components/admin/apps/AppFormModal';
import { BatchFreeKeyModal } from '../../components/admin/apps/BatchFreeKeyModal';

interface AppsPageProps {
  lang: Language;
  apps: AppItem[];
  setApps: React.Dispatch<React.SetStateAction<AppItem[]>>;
  config?: SystemConfig;
  showToast: (msg: string) => void;
}

export function AppsPage({ lang, apps, setApps, config, showToast }: AppsPageProps) {
  const [editingApp, setEditingApp] = useState<AppItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingApp, setDeletingApp] = useState<{ id: string; name: string } | null>(null);
  const [isBatchFreeKeyOpen, setIsBatchFreeKeyOpen] = useState(false);

  const openNewAppModal = () => { setEditingApp(null); setIsModalOpen(true); };
  const openEditAppModal = (app: AppItem) => { setEditingApp(app); setIsModalOpen(true); };

  const handleSaveApp = async (payload: AppItem) => {
    const isEdit = Boolean(editingApp);
    await saveAppToBackend(payload, isEdit);
    const freshApps = await fetchAppsFromBackend();
    setApps(freshApps);
    showToast(lang === 'vi' ? (isEdit ? `Đã cập nhật ứng dụng ${payload.name}` : `Đã thêm ứng dụng ${payload.name}`) : (isEdit ? `Updated app ${payload.name}` : `Added app ${payload.name}`));
    setIsModalOpen(false);
  };

  const confirmDeleteApp = async () => {
    if (!deletingApp) return;
    const result = await deleteAppFromBackend(deletingApp.id);
    if (!result.success) { showToast(result.message ?? '❌ Không thể xóa app này.'); setDeletingApp(null); return; }
    const freshApps = await fetchAppsFromBackend();
    setApps(freshApps);
    showToast(lang === 'vi' ? `Đã xóa ứng dụng ${deletingApp.name}!` : `Deleted app ${deletingApp.name}!`);
    setDeletingApp(null);
  };

  const toggleSellKeyStatus = async (targetApp: AppItem) => {
    const nextStatus = targetApp.allowSellKey === false ? true : false;
    await saveAppToBackend({ ...targetApp, allowSellKey: nextStatus }, true);
    const freshApps = await fetchAppsFromBackend();
    setApps(freshApps);
    showToast(lang === 'vi' ? (nextStatus ? `🛒 Đã BẬT bán Key VIP cho ${targetApp.name}` : `🔴 Đã TẮT bán Key VIP cho ${targetApp.name}`) : (nextStatus ? `Enabled VIP Key sales for ${targetApp.name}` : `Disabled VIP Key sales for ${targetApp.name}`));
  };

  const toggleFreeKeyStatus = async (targetApp: AppItem) => {
    const nextStatus = targetApp.allowFreeKey === false ? true : false;
    await saveAppToBackend({ ...targetApp, allowFreeKey: nextStatus }, true);
    const freshApps = await fetchAppsFromBackend();
    setApps(freshApps);
    showToast(lang === 'vi' ? (nextStatus ? `🔑 Đã BẬT cấp Key Free cho ${targetApp.name}` : `🔴 Đã TẮT cấp Key Free cho ${targetApp.name}`) : (nextStatus ? `Enabled Free Key for ${targetApp.name}` : `Disabled Free Key for ${targetApp.name}`));
  };

  return (
    <>
      <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[24px] p-7 flex flex-col gap-6">
        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2>📱 {lang === 'vi' ? 'Quản Lý Apps Catalog' : 'Apps Catalog Manager'}</h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', color: '#fff', padding: '10px 18px', borderRadius: '14px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', transition: 'all 0.2s ease', boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}
              onClick={() => setIsBatchFreeKeyOpen(true)}>
              🔑 {lang === 'vi' ? 'Sync Key Free' : 'Sync Free Key'}
            </button>
            <button className="bg-gradient-to-r from-[#38bdf8] to-[#6366f1] border-0 text-white px-5 py-3 rounded-[14px] font-heading font-extrabold text-sm cursor-pointer transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(56,189,248,0.4)]" onClick={openNewAppModal}>
              + {lang === 'vi' ? 'Thêm App Mới' : 'Add New App'}
            </button>
          </div>
        </div>

        {/* Apps Table */}
        <div className="w-full overflow-x-auto rounded-2xl border border-[#1e293b] bg-[#0f172a]/50 backdrop-blur-[10px]">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="hover:bg-[#38bdf8]/[0.04] transition-colors group">
                <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">Icon</th>
                <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">{lang === 'vi' ? 'Tên App' : 'App Name'}</th>
                <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">{lang === 'vi' ? 'Tên Game' : 'Sub Title'}</th>
                <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">{lang === 'vi' ? 'Lưu ý' : 'Note'}</th>
                <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">{lang === 'vi' ? 'Bán Key VIP' : 'Sell Key'}</th>
                <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">{lang === 'vi' ? 'Cấp Key Free' : 'Free Key'}</th>
                <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">{lang === 'vi' ? 'Menu Preview' : 'Shots'}</th>
                <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">{lang === 'vi' ? 'Thao tác' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(app => (
                <tr key={app.id}>
                  <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                    <div className={`w-[46px] h-[46px] shrink-0 flex items-center justify-center rounded-xl bg-[#1e293b] border border-[#334155] overflow-hidden ${app.cls || ''}`}>
                      {app.icon && (app.icon.startsWith('http://') || app.icon.startsWith('https://') || app.icon.startsWith('data:image/') || app.icon.startsWith('/')) ? (
                        <LazyImage src={app.icon} alt={app.name} className="w-full h-full object-cover" />
                      ) : <span className="text-xl">{app.icon}</span>}
                    </div>
                  </td>
                  <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]"><strong>{app.name}</strong></td>
                  <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">{app.sub}</td>
                  <td className="note-cell">{app.note}</td>
                  <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                    <button type="button" onClick={() => toggleSellKeyStatus(app)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                      {app.allowSellKey !== false ? (
                        <span className="inline-block px-[10px] py-1 rounded-lg font-bold text-[11px]" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>🟢 {lang === 'vi' ? 'Bật Bán' : 'Enabled'}</span>
                      ) : (
                        <span className="inline-block px-[10px] py-1 rounded-lg font-bold text-[11px]" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>🔴 {lang === 'vi' ? 'Tắt Bán' : 'Disabled'}</span>
                      )}
                    </button>
                  </td>
                  <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                    <button type="button" onClick={() => toggleFreeKeyStatus(app)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                      {app.allowFreeKey !== false ? (
                        <span className="inline-block px-[10px] py-1 rounded-lg font-bold text-[11px]" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)' }}>🟢 {lang === 'vi' ? 'Bật Free' : 'Enabled'}</span>
                      ) : (
                        <span className="inline-block px-[10px] py-1 rounded-lg font-bold text-[11px]" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>🔴 {lang === 'vi' ? 'Tắt Free' : 'Disabled'}</span>
                      )}
                    </button>
                  </td>
                  <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                    {app.shots && app.shots.length > 0 ? (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {app.shots.map((s, idx) => {
                          const isImg = s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:image/') || s.startsWith('/');
                          return isImg ? (
                            <img key={idx} src={s} alt={`Preview ${idx + 1}`} style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(0,242,254,0.4)', boxShadow: '0 0 8px rgba(0,242,254,0.25)', cursor: 'pointer' }} onClick={() => window.open(s, '_blank')} />
                          ) : (
                            <span key={idx} className="inline-block px-[10px] py-1 rounded-lg bg-[#6366f1]/15 text-[#818cf8] border border-[#6366f1]/30 font-bold text-[11px]">{s}</span>
                          );
                        })}
                      </div>
                    ) : <small className="text-[#64748b]">-</small>}
                  </td>
                  <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                    <div className="flex items-center gap-2">
                      <button className="bg-[#38bdf8]/12 text-[#38bdf8] border border-[#38bdf8]/30 px-4 py-2 rounded-[10px] font-inherit font-bold text-[13px] cursor-pointer transition-all duration-200 inline-flex items-center gap-[6px] whitespace-nowrap hover:bg-[#38bdf8] hover:text-[#080c14] hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(56,189,248,0.35)]" onClick={() => openEditAppModal(app)}>✎ {lang === 'vi' ? 'Sửa' : 'Edit'}</button>
                      <button className="bg-[#ef4444]/12 text-[#f87171] border border-[#ef4444]/30 px-4 py-2 rounded-[10px] font-inherit font-bold text-[13px] cursor-pointer transition-all duration-200 inline-flex items-center gap-[6px] whitespace-nowrap hover:bg-[#ef4444] hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(239,68,68,0.35)]" onClick={() => setDeletingApp({ id: app.id, name: app.name })}>🗑 {lang === 'vi' ? 'Xóa' : 'Delete'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ConfirmModal isOpen={Boolean(deletingApp)} title={lang === 'vi' ? 'Xác Nhận Xóa Ứng Dụng?' : 'Confirm Delete Application?'} message={lang === 'vi' ? `Bạn có chắc chắn muốn xóa ứng dụng "${deletingApp?.name}" không? Hành động này không thể hoàn tác.` : `Are you sure you want to delete "${deletingApp?.name}"? This action cannot be undone.`} lang={lang} onConfirm={confirmDeleteApp} onCancel={() => setDeletingApp(null)} />
      </div>

      <AppFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editingApp={editingApp} lang={lang} config={config} showToast={showToast} onSave={handleSaveApp} />

      <BatchFreeKeyModal isOpen={isBatchFreeKeyOpen} onClose={() => setIsBatchFreeKeyOpen(false)} apps={apps} lang={lang} showToast={showToast} onSuccess={setApps} />
    </>
  );
}
