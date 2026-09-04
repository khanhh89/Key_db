import { useState, useRef } from 'react';
import type { AppItem, SystemConfig, Language } from '../../types';
import { saveAppToBackend, deleteAppFromBackend, fetchAppsFromBackend } from '../../services/api';
import { uploadToCloudinary } from '../../services/cloudinary';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { ModalPortal } from '../../components/common/ModalPortal';
import { LazyImage } from '../../components/common/LazyImage';

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
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const appNameInputRef = useRef<HTMLInputElement>(null);

  // Confirm delete state
  const [deletingApp, setDeletingApp] = useState<{ id: string; name: string } | null>(null);

  // App form fields
  const [appName, setAppName] = useState('');
  const [appSub, setAppSub] = useState('');
  const [appIcon, setAppIcon] = useState('');
  const [appCls, setAppCls] = useState('');
  const [appNote, setAppNote] = useState('');
  const [appShotsStr, setAppShotsStr] = useState('');
  const [appDownloadUrl, setAppDownloadUrl] = useState('');
  const [appIpaUrl, setAppIpaUrl] = useState('');
  const [appPlatform, setAppPlatform] = useState<'android' | 'ios' | 'both'>('both');
  const [appFreeKey, setAppFreeKey] = useState('');
  const [appAllowSellKey, setAppAllowSellKey] = useState(true);
  const [appAllowFreeKey, setAppAllowFreeKey] = useState(true);
  const [appTagsStr, setAppTagsStr] = useState('');

  const [isUploadingShots, setIsUploadingShots] = useState(false);
  const [shotsUploadProgress, setShotsUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [isDraggingShots, setIsDraggingShots] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingIcon(true);
    showToast(lang === 'vi' ? '☁ Đang tải ảnh lên Cloudinary CDN...' : 'Uploading image to Cloudinary CDN...');

    try {
      const cloudinaryUrl = await uploadToCloudinary(file);
      if (cloudinaryUrl) {
        setAppIcon(cloudinaryUrl);
        showToast(lang === 'vi' ? '🎉 Đã tải ảnh lên Cloudinary thành công!' : '🎉 Uploaded image to Cloudinary!');
      } else {
        showToast(lang === 'vi' ? '❌ Lỗi tải ảnh!' : '❌ Upload failed!');
      }
    } catch (err) {
      showToast(lang === 'vi' ? '❌ Không thể tải ảnh lên Cloudinary!' : '❌ Failed to upload!');
    } finally {
      setIsUploadingIcon(false);
      e.target.value = '';
    }
  };

  const processShotsFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      showToast(lang === 'vi' ? '⚠️ Vui lòng chọn tệp định dạng hình ảnh (PNG, JPG, WEBP)!' : '⚠️ Please select image files!');
      return;
    }

    setIsUploadingShots(true);
    setShotsUploadProgress({ current: 0, total: fileArray.length });
    showToast(lang === 'vi' ? `☁ Đang tải ${fileArray.length} ảnh Menu Preview lên Cloudinary CDN...` : `Uploading ${fileArray.length} screenshots...`);

    const uploadedUrls: string[] = [];
    for (let i = 0; i < fileArray.length; i++) {
      setShotsUploadProgress({ current: i + 1, total: fileArray.length });
      try {
        const url = await uploadToCloudinary(fileArray[i]);
        if (url) uploadedUrls.push(url);
      } catch (err) {
        console.error('Failed to upload screenshot file:', fileArray[i].name);
      }
    }

    if (uploadedUrls.length > 0) {
      const existingShots = appShotsStr ? appShotsStr.split(',').map((s) => s.trim()).filter(Boolean) : [];
      const newShots = [...existingShots, ...uploadedUrls];
      setAppShotsStr(newShots.join(', '));
      showToast(lang === 'vi' ? `🎉 Đã tải lên ${uploadedUrls.length} ảnh Menu thành công!` : `🎉 Uploaded ${uploadedUrls.length} screenshots!`);
    } else {
      showToast(lang === 'vi' ? '❌ Lỗi tải ảnh Menu lên Cloudinary!' : '❌ Failed to upload screenshots!');
    }
    setIsUploadingShots(false);
    setShotsUploadProgress(null);
  };

  const handleShotsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processShotsFiles(e.target.files);
      e.target.value = '';
    }
  };

  const moveShotImage = (index: number, direction: 'left' | 'right') => {
    const shotsList = appShotsStr.split(',').map((s) => s.trim()).filter(Boolean);
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= shotsList.length) return;

    const temp = shotsList[index];
    shotsList[index] = shotsList[targetIndex];
    shotsList[targetIndex] = temp;
    setAppShotsStr(shotsList.join(', '));
  };

  const removeShotImage = (indexToRemove: number) => {
    const shotsList = appShotsStr.split(',').map(s => s.trim()).filter(Boolean);
    const updated = shotsList.filter((_, idx) => idx !== indexToRemove);
    setAppShotsStr(updated.join(', '));
  };


  const openNewAppModal = () => {
    setEditingApp(null);
    setAppName('');
    setAppSub('');
    setAppIcon('');
    setAppCls('');
    setAppNote('');
    setAppShotsStr('');
    setAppDownloadUrl('');
    setAppIpaUrl('');
    setAppPlatform('both');
    setAppFreeKey('');
    setAppTagsStr('');
    setAppAllowSellKey(true);
    setAppAllowFreeKey(true);
    setIsModalOpen(true);
  };

  const openEditAppModal = (app: AppItem) => {
    setEditingApp(app);
    setAppName(app.name);
    setAppSub(app.sub);
    setAppIcon(app.icon);
    setAppCls(app.cls);
    setAppNote(app.note);
    setAppShotsStr(app.shots ? app.shots.join(', ') : '');
    setAppDownloadUrl(app.downloadUrl || '');
    setAppIpaUrl(app.ipaUrl || '');
    setAppPlatform((app.platform as 'android' | 'ios' | 'both') || 'both');
    setAppFreeKey(app.freeKey || '');
    setAppTagsStr(app.tags ? app.tags.join(', ') : '');
    setAppAllowSellKey(app.allowSellKey !== false);
    setAppAllowFreeKey(app.allowFreeKey !== false);
    setIsModalOpen(true);
  };

  const handleSaveApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) {
      showToast(lang === 'vi' ? '⚠️ Tên App không được để trống!' : '⚠️ App Name cannot be empty!');
      appNameInputRef.current?.focus();
      return;
    }

    const shotsArray = appShotsStr.trim()
      ? appShotsStr.split(',').map((s) => s.trim()).filter(Boolean)
      : null;

    const tagsArray = appTagsStr.trim()
      ? appTagsStr.split(',').map((t) => t.trim()).filter(Boolean)
      : undefined;

    const isEdit = Boolean(editingApp);
    const appPayload: AppItem = {
      id: editingApp ? editingApp.id : '',
      name: appName,
      sub: appSub,
      icon: appIcon || appName.slice(0, 2).toUpperCase(),
      cls: appCls,
      note: appNote,
      shots: shotsArray,
      downloadUrl: appDownloadUrl,
      ipaUrl: appIpaUrl,
      platform: appPlatform,
      freeKey: appFreeKey,
      tags: tagsArray,
      allowSellKey: appAllowSellKey,
      allowFreeKey: appAllowFreeKey,
      updatedAt: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };

    // Synchronize directly with MySQL DB via Backend API
    await saveAppToBackend(appPayload, isEdit);

    // Refetch fresh DB data to ensure 100% synchronization
    const freshApps = await fetchAppsFromBackend();
    setApps(freshApps);

    showToast(
      lang === 'vi'
        ? isEdit ? `Đã cập nhật ứng dụng ${appName}` : `Đã thêm ứng dụng ${appName}`
        : isEdit ? `Updated app ${appName}` : `Added app ${appName}`
    );

    setIsModalOpen(false);
  };

  const confirmDeleteApp = async () => {
    if (!deletingApp) return;
    await deleteAppFromBackend(deletingApp.id);
    const freshApps = await fetchAppsFromBackend();
    setApps(freshApps);
    showToast(
      lang === 'vi'
        ? `Đã xóa ứng dụng ${deletingApp.name}!`
        : `Deleted app ${deletingApp.name}!`
    );
    setDeletingApp(null);
  };

  const toggleSellKeyStatus = async (targetApp: AppItem) => {
    const nextStatus = targetApp.allowSellKey === false ? true : false;
    const updatedApp = { ...targetApp, allowSellKey: nextStatus };
    await saveAppToBackend(updatedApp, true);
    const freshApps = await fetchAppsFromBackend();
    setApps(freshApps);
    showToast(
      lang === 'vi'
        ? nextStatus ? `🛒 Đã BẬT bán Key VIP cho ${targetApp.name}` : `🔴 Đã TẮT bán Key VIP cho ${targetApp.name}`
        : nextStatus ? `Enabled VIP Key sales for ${targetApp.name}` : `Disabled VIP Key sales for ${targetApp.name}`
    );
  };

  const toggleFreeKeyStatus = async (targetApp: AppItem) => {
    const nextStatus = targetApp.allowFreeKey === false ? true : false;
    const updatedApp = { ...targetApp, allowFreeKey: nextStatus };
    await saveAppToBackend(updatedApp, true);
    const freshApps = await fetchAppsFromBackend();
    setApps(freshApps);
    showToast(
      lang === 'vi'
        ? nextStatus ? `🔑 Đã BẬT cấp Key Free cho ${targetApp.name}` : `🔴 Đã TẮT cấp Key Free cho ${targetApp.name}`
        : nextStatus ? `Enabled Free Key for ${targetApp.name}` : `Disabled Free Key for ${targetApp.name}`
    );
  };

  return (
    <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[24px] p-7 flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2>📱 {lang === 'vi' ? 'Quản Lý Apps Catalog' : 'Apps Catalog Manager'}</h2>
        <button className="bg-gradient-to-r from-[#38bdf8] to-[#6366f1] border-0 text-white px-5 py-3 rounded-[14px] font-heading font-extrabold text-sm cursor-pointer transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(56,189,248,0.4)]" onClick={openNewAppModal}>
          + {lang === 'vi' ? 'Thêm App Mới' : 'Add New App'}
        </button>
      </div>

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
            {apps.map((app) => (
              <tr key={app.id}>
                <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                  <div className={`w-[46px] h-[46px] shrink-0 flex items-center justify-center rounded-xl bg-[#1e293b] border border-[#334155] overflow-hidden ${app.cls || ''}`}>
                    {app.icon && (app.icon.startsWith('http://') || app.icon.startsWith('https://') || app.icon.startsWith('data:image/') || app.icon.startsWith('/')) ? (
                      <LazyImage src={app.icon} alt={app.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">{app.icon}</span>
                    )}
                  </div>
                </td>
                <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                  <strong>{app.name}</strong>
                </td>
                <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">{app.sub}</td>
                <td className="note-cell">{app.note}</td>
                <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                  <button
                    type="button"
                    onClick={() => toggleSellKeyStatus(app)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    title={lang === 'vi' ? 'Bấm để Bật/Tắt bán Key VIP' : 'Click to toggle VIP Key sales'}
                  >
                    {app.allowSellKey !== false ? (
                      <span className="inline-block px-[10px] py-1 rounded-lg bg-[#6366f1]/15 text-[#818cf8] border border-[#6366f1]/30 font-bold text-[11px]" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        🟢 {lang === 'vi' ? 'Bật Bán' : 'Enabled'}
                      </span>
                    ) : (
                      <span className="inline-block px-[10px] py-1 rounded-lg bg-[#6366f1]/15 text-[#818cf8] border border-[#6366f1]/30 font-bold text-[11px]" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        🔴 {lang === 'vi' ? 'Tắt Bán' : 'Disabled'}
                      </span>
                    )}
                  </button>
                </td>
                <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                  <button
                    type="button"
                    onClick={() => toggleFreeKeyStatus(app)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    title={lang === 'vi' ? 'Bấm để Bật/Tắt cấp Key Free' : 'Click to toggle Free Key'}
                  >
                    {app.allowFreeKey !== false ? (
                      <span className="inline-block px-[10px] py-1 rounded-lg bg-[#6366f1]/15 text-[#818cf8] border border-[#6366f1]/30 font-bold text-[11px]" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                        🟢 {lang === 'vi' ? 'Bật Free' : 'Enabled'}
                      </span>
                    ) : (
                      <span className="inline-block px-[10px] py-1 rounded-lg bg-[#6366f1]/15 text-[#818cf8] border border-[#6366f1]/30 font-bold text-[11px]" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        🔴 {lang === 'vi' ? 'Tắt Free' : 'Disabled'}
                      </span>
                    )}
                  </button>
                </td>
                <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                  {app.shots && app.shots.length > 0 ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {app.shots.map((s, idx) => {
                        const isImg = s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:image/') || s.startsWith('/');
                        return isImg ? (
                          <img
                            key={idx}
                            src={s}
                            alt={`Preview ${idx + 1}`}
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '10px',
                              objectFit: 'cover',
                              border: '1px solid rgba(0, 242, 254, 0.4)',
                              boxShadow: '0 0 8px rgba(0, 242, 254, 0.25)',
                              cursor: 'pointer'
                            }}
                            title={`Menu Preview ${idx + 1}`}
                            onClick={() => window.open(s, '_blank')}
                          />
                        ) : (
                          <span key={idx} className="inline-block px-[10px] py-1 rounded-lg bg-[#6366f1]/15 text-[#818cf8] border border-[#6366f1]/30 font-bold text-[11px]">
                            {s}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <small className="text-[#64748b]">-</small>
                  )}
                </td>
                <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                  <div className="flex items-center gap-2">
                    <button
                      className="bg-[#38bdf8]/12 text-[#38bdf8] border border-[#38bdf8]/30 px-4 py-2 rounded-[10px] font-inherit font-bold text-[13px] cursor-pointer transition-all duration-200 inline-flex items-center gap-[6px] whitespace-nowrap hover:bg-[#38bdf8] hover:text-[#080c14] hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(56,189,248,0.35)]"
                      onClick={() => openEditAppModal(app)}
                    >
                      ✎ {lang === 'vi' ? 'Sửa' : 'Edit'}
                    </button>
                    <button
                      className="bg-[#ef4444]/12 text-[#f87171] border border-[#ef4444]/30 px-4 py-2 rounded-[10px] font-inherit font-bold text-[13px] cursor-pointer transition-all duration-200 inline-flex items-center gap-[6px] whitespace-nowrap hover:bg-[#ef4444] hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(239,68,68,0.35)]"
                      onClick={() => setDeletingApp({ id: app.id, name: app.name })}
                    >
                      🗑 {lang === 'vi' ? 'Xóa' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modern Custom Confirmation Modal for Delete Action */}
      <ConfirmModal
        isOpen={Boolean(deletingApp)}
        title={lang === 'vi' ? 'Xác Nhận Xóa Ứng Dụng?' : 'Confirm Delete Application?'}
        message={
          lang === 'vi'
            ? `Bạn có chắc chắn muốn xóa ứng dụng "${deletingApp?.name}" không? Hành động này không thể hoàn tác.`
            : `Are you sure you want to delete "${deletingApp?.name}"? This action cannot be undone.`
        }
        lang={lang}
        onConfirm={confirmDeleteApp}
        onCancel={() => setDeletingApp(null)}
      />

      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/85 backdrop-blur-[14px] flex justify-center items-start z-[999999] p-[20px_16px] overflow-y-auto animate-[fadeIn_0.25s_ease-out]" onClick={() => setIsModalOpen(false)}>
          <div className="w-[min(720px,100%)] max-h-[90vh] overflow-y-auto bg-[#0f172a]/95 border border-[#38bdf8]/35 rounded-[28px] p-8 backdrop-blur-[24px] shadow-[0_30px_70px_rgba(0,0,0,0.85),0_0_30px_rgba(56,189,248,0.15)] flex flex-col gap-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-2">
              <h4>
                📱 {editingApp
                  ? lang === 'vi' ? 'Chỉnh Sửa Ứng Dụng Catalog' : 'Edit App Catalog'
                  : lang === 'vi' ? 'Thêm Ứng Dụng Mới Vừa Catalog' : 'Add New App to Catalog'}
              </h4>
              <button type="button" className="bg-white/10 border border-white/15 text-[#94a3b8] w-9 h-9 rounded-full text-xl grid place-items-center cursor-pointer transition-all duration-200 hover:bg-[#ef4444] hover:text-white hover:border-[#ef4444]" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSaveApp} className="flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-170px)] pr-1">
              {/* SECTION 1: BASIC APP INFO */}
              <div className="bg-[#1e293b]/40 border border-white/10 rounded-[18px] p-5 flex flex-col gap-4">
                <div className="app-section-title">
                  📌 {lang === 'vi' ? '1. Thông Tin Cơ Bản App' : '1. Basic App Information'}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label>{lang === 'vi' ? 'Tên App (*):' : 'App Name (*):'}</label>
                    <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                      type="text"
                      ref={appNameInputRef}
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label>{lang === 'vi' ? 'Tên Game / Subtitle (*):' : 'Sub Title (*):'}</label>
                    <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                      type="text"
                      value={appSub}
                      onChange={(e) => setAppSub(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2" style={{ marginTop: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                    <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                      type="checkbox"
                      checked={appAllowSellKey}
                      onChange={(e) => setAppAllowSellKey(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#00f2fe', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 'bold', color: appAllowSellKey ? '#00f2fe' : '#ef4444' }}>
                      🛒 {lang === 'vi' ? 'Cho Phép Bán Key VIP (Hiển thị nút Mua Key trên trang chủ)' : 'Enable VIP Key Sales (Show Buy Key button on home page)'}
                    </span>
                  </label>
                </div>

                <div className="flex flex-col gap-2" style={{ marginTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                    <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                      type="checkbox"
                      checked={appAllowFreeKey}
                      onChange={(e) => setAppAllowFreeKey(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#22c55e', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 'bold', color: appAllowFreeKey ? '#22c55e' : '#ef4444' }}>
                      🔑 {lang === 'vi' ? 'Cho Phép Cấp Key Free (Hiển thị nút Lấy Key Free trên trang chủ)' : 'Enable Free Key (Show Get Free Key button on home page)'}
                    </span>
                  </label>
                </div>
              </div>

              {/* SECTION 2: ICON IMAGE & FILE DOWNLOAD LINKS */}
              <div className="bg-[#1e293b]/40 border border-white/10 rounded-[18px] p-5 flex flex-col gap-4">
                <div className="app-section-title">
                  ☁ {lang === 'vi' ? '2. Tải Ảnh Icon App Lên Cloudinary & Tệp Tin Tải Về' : '2. App Icon Cloud Upload & Download Links'}
                </div>
                
                <div className="flex flex-col gap-2">
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                    <span>
                      {lang === 'vi'
                        ? 'Icon App (Tải Ảnh Lên Cloudinary):'
                        : 'App Icon (Upload to Cloudinary):'}
                    </span>
                    <span style={{ fontSize: '11px', color: config?.cloudinaryCloudName ? '#10b981' : '#f59e0b', fontWeight: 'bold', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {config?.cloudinaryCloudName ? `☁ CDN: 🟢 ${config.cloudinaryCloudName}` : '☁ CDN: 🟡 Demo Default'}
                    </span>
                  </label>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <label className="upload-btn-cloud" style={{ margin: 0, padding: '14px 20px', flex: 1, justifyContent: 'center', cursor: 'pointer', textAlign: 'center', fontSize: '14px' }}>
                      {isUploadingIcon ? '⏳ Đang tải ảnh lên Cloudinary...' : '☁ Chọn Tệp Ảnh Up Cloudinary'}
                      <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        disabled={isUploadingIcon}
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>

                  {appIcon && (appIcon.startsWith('http://') || appIcon.startsWith('https://') || appIcon.startsWith('data:image/') || appIcon.startsWith('/')) ? (
                    <div style={{ marginTop: '14px', padding: '16px 20px', background: 'rgba(0,0,0,0.5)', borderRadius: '20px', border: '1px solid rgba(0,242,254,0.35)', display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: 0 }}>
                        <img
                          src={appIcon}
                          alt="Preview"
                          className="w-[110px] h-[110px] rounded-[18px] object-cover border-2 border-[#00f2fe] shadow-[0_0_20px_rgba(0,242,254,0.5)] shrink-0"
                        />
                        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '14px', color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ✓ Đã tải ảnh lên Cloudinary CDN thành công
                          </span>
                          <small style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', wordBreak: 'break-all', display: 'block', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            {appIcon.startsWith('data:image/')
                              ? '🖼️ Tệp ảnh vừa tải lên (Base64 Image Data)'
                              : appIcon}
                          </small>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAppIcon('')}
                        style={{ background: 'rgba(239,68,68,0.18)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', flexShrink: 0, transition: 'all 0.2s ease' }}
                      >
                        🗑 Xóa ảnh
                      </button>
                    </div>
                  ) : appIcon ? (
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#94a3b8' }}>
                      Ký tự đại diện icon: <strong style={{ color: '#38bdf8' }}>{appIcon}</strong>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2" style={{ marginTop: '14px' }}>
                  <label>{lang === 'vi' ? '🏷️ Thẻ Nhãn Nổi Bật Cho Ứng Dụng (Custom Badges / Tags):' : '🏷️ Custom App Badges / Tags:'}</label>
                  <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                    type="text"
                    value={appTagsStr}
                    placeholder={lang === 'vi' ? 'VD: Hack Map Liên Quân, 🎮 Delta Roblox, 🍎 Mod iOS IPA, 🤖 Mod Android APK' : 'e.g. Hack Map Liên Quân, 🎮 Delta Roblox'}
                    onChange={(e) => setAppTagsStr(e.target.value)}
                  />
                  <small style={{ fontSize: '11.5px', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                    💡 Bấm vào các thẻ gợi ý bên dưới để bật/tắt nhanh hoặc nhập thủ công cách nhau bằng dấu phẩy (,):
                  </small>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {['Hack Map Liên Quân', '🎮 Delta Roblox', '🍎 Mod iOS IPA', '🤖 Mod Android APK', '⚡ AUTO KEY 24/7', '🛡 ANTI-BAN'].map((tag) => {
                      const tagsList = appTagsStr ? appTagsStr.split(',').map((t) => t.trim()).filter(Boolean) : [];
                      const isSelected = tagsList.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setAppTagsStr(tagsList.filter((t) => t !== tag).join(', '));
                            } else {
                              setAppTagsStr([...tagsList, tag].join(', '));
                            }
                          }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '99px',
                            border: isSelected ? '1px solid #00f2fe' : '1px solid rgba(255,255,255,0.15)',
                            background: isSelected ? 'rgba(0, 242, 254, 0.2)' : 'rgba(15,23,42,0.6)',
                            color: isSelected ? '#00f2fe' : '#94a3b8',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {isSelected ? '✓ ' : '+ '}{tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label>Direct Download Link (.apk/Direct Link):</label>
                    <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                      type="text"
                      value={appDownloadUrl}
                      onChange={(e) => setAppDownloadUrl(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label>🖥️ {lang === 'vi' ? 'Nền tảng hỗ trợ (Hiển thị nút tải sau khi mua key):' : 'Platform (Download button after key purchase):'}</label>
                    <select
                      className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                      value={appPlatform}
                      onChange={(e) => setAppPlatform(e.target.value as 'android' | 'ios' | 'both')}
                    >
                      <option value="both">🌐 Cả Android + iOS (Hiện cả 2 nút)</option>
                      <option value="android">🤖 Android only (Chỉ hiện nút APK)</option>
                      <option value="ios">🍎 iOS only (Chỉ hiện nút IPA)</option>
                    </select>
                    <small style={{ fontSize: '11.5px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                      💡 {lang === 'vi' ? 'Chọn Android: chỉ hiện nút tải APK. Chọn iOS: chỉ hiện nút tải IPA. Chọn Cả hai: hiện cả 2 nút.' : 'Controls which download button shows after user buys a key.'}
                    </small>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label>{lang === 'vi' ? 'Link Vượt Lấy Key (Link Rút Gọn / Link Vượt):' : 'Bypass Key Link:'}</label>
                    <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                      type="text"
                      value={appIpaUrl}
                      placeholder={lang === 'vi' ? 'Bỏ trống = Tự động cấp Modal Key Free không cần vượt' : 'Leave empty for Direct Free Key Modal'}
                      onChange={(e) => setAppIpaUrl(e.target.value)}
                    />
                    <small style={{ fontSize: '11.5px', color: '#00f2fe', display: 'block', marginTop: '4px' }}>
                      💡 {lang === 'vi'
                        ? 'Nếu CÓ điền URL: Nút "Lấy Key Free" sẽ mở link vượt. Nếu BỎ TRỐNG: Nút "Lấy Key Free" sẽ mở ngay Modal Key Free trực tiếp!'
                        : 'If URL filled: opens bypass link. If EMPTY: opens direct Free Key Modal!'}
                    </small>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label>{lang === 'vi' ? 'Mã Key Free (Cấu hình hệ thống):' : 'Free Key Code:'}</label>
                    <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                      type="text"
                      value={appFreeKey}
                      placeholder={lang === 'vi' ? 'Nhập mã Key Free do Admin cài đặt...' : 'Enter Free Key code set by Admin...'}
                      onChange={(e) => setAppFreeKey(e.target.value)}
                    />
                    <small style={{ fontSize: '11.5px', color: '#10b981', display: 'block', marginTop: '4px' }}>
                      ⚡ {lang === 'vi'
                        ? 'Mã Key Free này được cài đặt trực tiếp để cấp cho người dùng khi bấm Lấy Key Free.'
                        : 'This Free Key code is provided directly to users.'}
                    </small>
                  </div>
                </div>
              </div>

              {/* SECTION 3: NOTES & MENU PREVIEW SCREENSHOTS */}
              <div className="bg-[#1e293b]/40 border border-white/10 rounded-[18px] p-5 flex flex-col gap-4">
                <div className="app-section-title">
                  📸 {lang === 'vi' ? '3. Ghi Chú & Tải Ảnh Menu Preview' : '3. Notice & Menu Preview Screenshots'}
                </div>

                <div className="flex flex-col gap-2">
                  <label>{lang === 'vi' ? 'Ghi chú / Lưu ý khi tải (Nhảy link vượt cấp):' : 'Notice / Download Note:'}</label>
                  <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                    type="text"
                    value={appNote}
                    onChange={(e) => setAppNote(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                    <span>
                      {lang === 'vi'
                        ? 'Ảnh Giao Diện Menu Preview (Up Ảnh Lên Cloudinary):'
                        : 'Menu Preview Screenshots (Upload to Cloudinary CDN):'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>
                      ☁ Cloud CDN Multi-Upload
                    </span>
                  </label>

                  <div
                    style={{
                      border: isDraggingShots ? '2px dashed #00f2fe' : '2px dashed rgba(0, 242, 254, 0.35)',
                      borderRadius: '16px',
                      padding: '18px 14px',
                      textAlign: 'center',
                      background: isDraggingShots ? 'rgba(0, 242, 254, 0.12)' : 'rgba(15, 23, 42, 0.6)',
                      transition: 'all 0.2s ease',
                      marginBottom: '14px'
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingShots(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDraggingShots(false);
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      setIsDraggingShots(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        await processShotsFiles(e.dataTransfer.files);
                      }
                    }}
                  >
                    <label style={{ cursor: 'pointer', display: 'block', margin: 0 }}>
                      <div style={{ fontSize: '32px', marginBottom: '6px' }}>🖼️</div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#00f2fe' }}>
                        {isUploadingShots
                          ? `⏳ Đang tải ${shotsUploadProgress?.current}/${shotsUploadProgress?.total} ảnh lên Cloudinary...`
                          : lang === 'vi'
                          ? 'Kéo & thả tệp ảnh Menu vào đây hoặc BẤM ĐỂ CHỌN NHIỀU TỆP'
                          : 'Drag & drop menu images here or CLICK TO SELECT FILES'}
                      </div>
                      <small style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                        {lang === 'vi'
                          ? 'Hỗ trợ tải lên cùng lúc nhiều ảnh Menu (PNG, JPG, WEBP)'
                          : 'Supports batch upload (PNG, JPG, WEBP)'}
                      </small>
                      <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        disabled={isUploadingShots}
                        onChange={handleShotsUpload}
                      />
                    </label>
                  </div>

                  {/* SCREENSHOTS GRID GALLERY PREVIEW & REORDERING CONTROLS */}
                  {appShotsStr && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#10b981' }}>
                          📸 {lang === 'vi'
                            ? `Danh Sách Ảnh Menu (${appShotsStr.split(',').map((s) => s.trim()).filter(Boolean).length} ảnh):`
                            : `Menu Screenshots (${appShotsStr.split(',').map((s) => s.trim()).filter(Boolean).length}):`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAppShotsStr('')}
                          style={{
                            background: 'rgba(239, 68, 68, 0.18)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          🗑 {lang === 'vi' ? 'Xóa tất cả ảnh' : 'Clear all'}
                        </button>
                      </div>

                      <div className="grid grid-cols-[repeat(auto-fill,minmax(115px,1fr))] gap-3">
                        {appShotsStr.split(',').map((s) => s.trim()).filter(Boolean).map((shotItem, idx, arr) => {
                          const isImg = shotItem.startsWith('http://') || shotItem.startsWith('https://') || shotItem.startsWith('data:image/') || shotItem.startsWith('/');
                          return (
                            <div key={idx} className="relative bg-[#0f172a]/80 border border-[#00f2fe]/35 rounded-[14px] p-1.5 flex flex-col items-center gap-1.5">
                              {isImg ? (
                                <img
                                  src={shotItem}
                                  alt={`Shot ${idx + 1}`}
                                  className="w-full h-[90px] object-cover rounded-[10px] border border-white/10 cursor-pointer"
                                  onClick={() => window.open(shotItem, '_blank')}
                                  title={lang === 'vi' ? 'Bấm để mở xem ảnh phóng to' : 'Click to open full image'}
                                />
                              ) : (
                                <div style={{ width: '100%', height: '90px', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', borderRadius: '10px', display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: '12px', padding: '4px', textAlign: 'center' }}>
                                  🏷️ {shotItem}
                                </div>
                              )}

                              {/* Action controls: Left, Delete, Right */}
                              <div style={{ display: 'flex', gap: '4px', width: '100%', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveShotImage(idx, 'left')}
                                  style={{
                                    background: 'rgba(255,255,255,0.12)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '2px 8px',
                                    fontSize: '11px',
                                    cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                    opacity: idx === 0 ? 0.3 : 1
                                  }}
                                  title="Đổi vị trí sang trái"
                                >
                                  ←
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeShotImage(idx)}
                                  style={{
                                    background: 'rgba(239,68,68,0.25)',
                                    color: '#f87171',
                                    border: '1px solid rgba(239,68,68,0.4)',
                                    borderRadius: '6px',
                                    padding: '2px 8px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                  }}
                                  title="Xóa ảnh này"
                                >
                                  ✕
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === arr.length - 1}
                                  onClick={() => moveShotImage(idx, 'right')}
                                  style={{
                                    background: 'rgba(255,255,255,0.12)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '2px 8px',
                                    fontSize: '11px',
                                    cursor: idx === arr.length - 1 ? 'not-allowed' : 'pointer',
                                    opacity: idx === arr.length - 1 ? 0.3 : 1
                                  }}
                                  title="Đổi vị trí sang phải"
                                >
                                  →
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Raw URL list editor */}
                      <details style={{ marginTop: '12px' }}>
                        <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#38bdf8', fontWeight: 'bold' }}>
                          ✏️ {lang === 'vi' ? 'Xem hoặc sửa trực tiếp danh sách Link ảnh (phân cách bằng dấu phẩy)' : 'Edit raw URL string'}
                        </summary>
                        <textarea className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                          rows={2}
                          value={appShotsStr}
                          onChange={(e) => setAppShotsStr(e.target.value)}
                          placeholder="Dán các link ảnh cách nhau bằng dấu phẩy..."
                          style={{
                            width: '100%',
                            marginTop: '6px',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            background: 'rgba(0,0,0,0.5)',
                            color: '#fff',
                            border: '1px solid rgba(255,255,255,0.15)',
                            fontSize: '12px',
                            fontFamily: 'monospace'
                          }}
                        />
                      </details>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-3.5 pt-3.5 border-t border-white/10 shrink-0">
                <button
                  type="button"
                  className="px-5 py-3 rounded-xl border border-[#334155] bg-[#1e293b] text-[#e2e8f0] font-bold cursor-pointer transition-all duration-200 hover:bg-[#334155]"
                  onClick={() => setIsModalOpen(false)}
                >
                  {lang === 'vi' ? 'Hủy Bỏ' : 'Cancel'}
                </button>
                <button type="submit" className="px-6 py-3 rounded-xl border-0 bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white font-heading font-extrabold text-sm cursor-pointer transition-all duration-250 shadow-[0_4px_14px_rgba(56,189,248,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(56,189,248,0.5)]">
                  {lang === 'vi' ? '💾 Lưu Ứng Dụng' : '💾 Save Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
