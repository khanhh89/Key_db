import { useState } from 'react';
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
    setAppFreeKey(app.freeKey || '');
    setAppTagsStr(app.tags ? app.tags.join(', ') : '');
    setAppAllowSellKey(app.allowSellKey !== false);
    setAppAllowFreeKey(app.allowFreeKey !== false);
    setIsModalOpen(true);
  };

  const handleSaveApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) return;

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
    <div className="manager-panel">
      <div className="panel-header">
        <h2>📱 {lang === 'vi' ? 'Quản Lý Apps Catalog' : 'Apps Catalog Manager'}</h2>
        <button className="add-btn" onClick={openNewAppModal}>
          + {lang === 'vi' ? 'Thêm App Mới' : 'Add New App'}
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Icon</th>
              <th>{lang === 'vi' ? 'Tên App' : 'App Name'}</th>
              <th>{lang === 'vi' ? 'Tên Game' : 'Sub Title'}</th>
              <th>{lang === 'vi' ? 'Lưu ý' : 'Note'}</th>
              <th>{lang === 'vi' ? 'Bán Key VIP' : 'Sell Key'}</th>
              <th>{lang === 'vi' ? 'Cấp Key Free' : 'Free Key'}</th>
              <th>{lang === 'vi' ? 'Menu Preview' : 'Shots'}</th>
              <th>{lang === 'vi' ? 'Thao tác' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((app) => (
              <tr key={app.id}>
                <td>
                  <div className={`table-icon ${app.cls}`}>
                    {app.icon && (app.icon.startsWith('http://') || app.icon.startsWith('https://') || app.icon.startsWith('data:image/') || app.icon.startsWith('/')) ? (
                      <LazyImage src={app.icon} alt={app.name} style={{ borderRadius: 'inherit' }} />
                    ) : (
                      app.icon
                    )}
                  </div>
                </td>
                <td>
                  <strong>{app.name}</strong>
                </td>
                <td>{app.sub}</td>
                <td className="note-cell">{app.note}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => toggleSellKeyStatus(app)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    title={lang === 'vi' ? 'Bấm để Bật/Tắt bán Key VIP' : 'Click to toggle VIP Key sales'}
                  >
                    {app.allowSellKey !== false ? (
                      <span className="tag-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        🟢 {lang === 'vi' ? 'Bật Bán' : 'Enabled'}
                      </span>
                    ) : (
                      <span className="tag-badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        🔴 {lang === 'vi' ? 'Tắt Bán' : 'Disabled'}
                      </span>
                    )}
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => toggleFreeKeyStatus(app)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    title={lang === 'vi' ? 'Bấm để Bật/Tắt cấp Key Free' : 'Click to toggle Free Key'}
                  >
                    {app.allowFreeKey !== false ? (
                      <span className="tag-badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                        🟢 {lang === 'vi' ? 'Bật Free' : 'Enabled'}
                      </span>
                    ) : (
                      <span className="tag-badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        🔴 {lang === 'vi' ? 'Tắt Free' : 'Disabled'}
                      </span>
                    )}
                  </button>
                </td>
                <td>
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
                          <span key={idx} className="tag-badge">
                            {s}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <small className="muted">-</small>
                  )}
                </td>
                <td>
                  <div className="btn-group">
                    <button
                      className="edit-btn"
                      onClick={() => openEditAppModal(app)}
                    >
                      ✎ {lang === 'vi' ? 'Sửa' : 'Edit'}
                    </button>
                    <button
                      className="delete-btn"
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
          <div className="sub-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="app-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="app-modal-header">
              <h4>
                📱 {editingApp
                  ? lang === 'vi' ? 'Chỉnh Sửa Ứng Dụng Catalog' : 'Edit App Catalog'
                  : lang === 'vi' ? 'Thêm Ứng Dụng Mới Vừa Catalog' : 'Add New App to Catalog'}
              </h4>
              <button type="button" className="app-modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSaveApp} className="modal-form">
              {/* SECTION 1: BASIC APP INFO */}
              <div className="app-form-section">
                <div className="app-section-title">
                  📌 {lang === 'vi' ? '1. Thông Tin Cơ Bản App' : '1. Basic App Information'}
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>{lang === 'vi' ? 'Tên App (*):' : 'App Name (*):'}</label>
                    <input
                      type="text"
                      required
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>{lang === 'vi' ? 'Tên Game / Subtitle (*):' : 'Sub Title (*):'}</label>
                    <input
                      type="text"
                      value={appSub}
                      onChange={(e) => setAppSub(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                    <input
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

                <div className="form-group" style={{ marginTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                    <input
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
              <div className="app-form-section">
                <div className="app-section-title">
                  ☁ {lang === 'vi' ? '2. Tải Ảnh Icon App Lên Cloudinary & Tệp Tin Tải Về' : '2. App Icon Cloud Upload & Download Links'}
                </div>
                
                <div className="form-group">
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
                      <input
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
                          style={{ width: '110px', height: '110px', borderRadius: '18px', objectFit: 'cover', border: '2px solid #00f2fe', boxShadow: '0 0 20px rgba(0,242,254,0.5)', flexShrink: 0 }}
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

                <div className="form-group" style={{ marginTop: '14px' }}>
                  <label>{lang === 'vi' ? '🏷️ Thẻ Nhãn Nổi Bật Cho Ứng Dụng (Custom Badges / Tags):' : '🏷️ Custom App Badges / Tags:'}</label>
                  <input
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

                <div className="form-grid">
                  <div className="form-group">
                    <label>Direct Download Link (.apk/Direct Link):</label>
                    <input
                      type="text"
                      value={appDownloadUrl}
                      onChange={(e) => setAppDownloadUrl(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>{lang === 'vi' ? 'Link Vượt Lấy Key (Link Rút Gọn / Link Vượt):' : 'Bypass Key Link:'}</label>
                    <input
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
                  <div className="form-group">
                    <label>{lang === 'vi' ? 'Mã Key Free (Cấu hình hệ thống):' : 'Free Key Code:'}</label>
                    <input
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
              <div className="app-form-section">
                <div className="app-section-title">
                  📸 {lang === 'vi' ? '3. Ghi Chú & Tải Ảnh Menu Preview' : '3. Notice & Menu Preview Screenshots'}
                </div>

                <div className="form-group">
                  <label>{lang === 'vi' ? 'Ghi chú / Lưu ý khi tải (Nhảy link vượt cấp):' : 'Notice / Download Note:'}</label>
                  <input
                    type="text"
                    value={appNote}
                    onChange={(e) => setAppNote(e.target.value)}
                  />
                </div>

                <div className="form-group">
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
                      <input
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

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))', gap: '12px' }}>
                        {appShotsStr.split(',').map((s) => s.trim()).filter(Boolean).map((shotItem, idx, arr) => {
                          const isImg = shotItem.startsWith('http://') || shotItem.startsWith('https://') || shotItem.startsWith('data:image/') || shotItem.startsWith('/');
                          return (
                            <div key={idx} style={{ position: 'relative', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(0,242,254,0.35)', borderRadius: '14px', padding: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                              {isImg ? (
                                <img
                                  src={shotItem}
                                  alt={`Shot ${idx + 1}`}
                                  style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
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
                        <textarea
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

              <div className="modal-btn-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setIsModalOpen(false)}
                >
                  {lang === 'vi' ? 'Hủy Bỏ' : 'Cancel'}
                </button>
                <button type="submit" className="save-btn">
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
