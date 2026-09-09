import { useState, useRef } from 'react';
import type { AppItem, Language } from '../../../types';
import { ModalPortal } from '../../common/ModalPortal';
import { uploadToCloudinary } from '../../../services/cloudinary';
import type { SystemConfig } from '../../../types';

interface AppFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingApp: AppItem | null;
  lang: Language;
  config?: SystemConfig;
  showToast: (msg: string) => void;
  onSave: (payload: AppItem) => Promise<void>;
}

export function AppFormModal({ isOpen, onClose, editingApp, lang, config, showToast, onSave }: AppFormModalProps) {
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
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isUploadingShots, setIsUploadingShots] = useState(false);
  const [shotsUploadProgress, setShotsUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [isDraggingShots, setIsDraggingShots] = useState(false);

  const appNameInputRef = useRef<HTMLInputElement>(null);

  // Populate form when modal opens
  const prevOpenRef = useRef(false);
  if (isOpen !== prevOpenRef.current) {
    prevOpenRef.current = isOpen;
    if (isOpen) {
      if (editingApp) {
        setAppName(editingApp.name); setAppSub(editingApp.sub); setAppIcon(editingApp.icon);
        setAppCls(editingApp.cls); setAppNote(editingApp.note);
        setAppShotsStr(editingApp.shots ? editingApp.shots.join(', ') : '');
        setAppDownloadUrl(editingApp.downloadUrl || ''); setAppIpaUrl(editingApp.ipaUrl || '');
        setAppPlatform((editingApp.platform as 'android' | 'ios' | 'both') || 'both');
        setAppFreeKey(editingApp.freeKey || '');
        setAppTagsStr(editingApp.tags ? editingApp.tags.join(', ') : '');
        setAppAllowSellKey(editingApp.allowSellKey !== false);
        setAppAllowFreeKey(editingApp.allowFreeKey !== false);
      } else {
        setAppName(''); setAppSub(''); setAppIcon(''); setAppCls(''); setAppNote('');
        setAppShotsStr(''); setAppDownloadUrl(''); setAppIpaUrl(''); setAppPlatform('both');
        setAppFreeKey(''); setAppTagsStr(''); setAppAllowSellKey(true); setAppAllowFreeKey(true);
      }
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploadingIcon(true);
    showToast(lang === 'vi' ? '☁ Đang tải ảnh lên Cloudinary CDN...' : 'Uploading image to Cloudinary CDN...');
    try {
      const url = await uploadToCloudinary(file);
      if (url) { setAppIcon(url); showToast(lang === 'vi' ? '🎉 Đã tải ảnh lên Cloudinary thành công!' : '🎉 Uploaded image to Cloudinary!'); }
      else showToast(lang === 'vi' ? '❌ Lỗi tải ảnh!' : '❌ Upload failed!');
    } catch { showToast(lang === 'vi' ? '❌ Không thể tải ảnh lên Cloudinary!' : '❌ Failed to upload!'); }
    finally { setIsUploadingIcon(false); e.target.value = ''; }
  };

  const processShotsFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArray.length === 0) { showToast(lang === 'vi' ? '⚠️ Vui lòng chọn tệp định dạng hình ảnh!' : '⚠️ Please select image files!'); return; }
    setIsUploadingShots(true); setShotsUploadProgress({ current: 0, total: fileArray.length });
    showToast(lang === 'vi' ? `☁ Đang tải ${fileArray.length} ảnh lên Cloudinary...` : `Uploading ${fileArray.length} screenshots...`);
    const uploaded: string[] = [];
    for (let i = 0; i < fileArray.length; i++) {
      setShotsUploadProgress({ current: i + 1, total: fileArray.length });
      try { const url = await uploadToCloudinary(fileArray[i]); if (url) uploaded.push(url); } catch {}
    }
    if (uploaded.length > 0) {
      const existing = appShotsStr ? appShotsStr.split(',').map(s => s.trim()).filter(Boolean) : [];
      setAppShotsStr([...existing, ...uploaded].join(', '));
      showToast(lang === 'vi' ? `🎉 Đã tải lên ${uploaded.length} ảnh Menu thành công!` : `🎉 Uploaded ${uploaded.length} screenshots!`);
    } else showToast(lang === 'vi' ? '❌ Lỗi tải ảnh Menu lên Cloudinary!' : '❌ Failed to upload screenshots!');
    setIsUploadingShots(false); setShotsUploadProgress(null);
  };

  const moveShotImage = (index: number, direction: 'left' | 'right') => {
    const list = appShotsStr.split(',').map(s => s.trim()).filter(Boolean);
    const ti = direction === 'left' ? index - 1 : index + 1;
    if (ti < 0 || ti >= list.length) return;
    [list[index], list[ti]] = [list[ti], list[index]];
    setAppShotsStr(list.join(', '));
  };

  const removeShotImage = (idx: number) => {
    const list = appShotsStr.split(',').map(s => s.trim()).filter(Boolean);
    setAppShotsStr(list.filter((_, i) => i !== idx).join(', '));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) { showToast(lang === 'vi' ? '⚠️ Tên App không được để trống!' : '⚠️ App Name cannot be empty!'); appNameInputRef.current?.focus(); return; }
    const shotsArray = appShotsStr.trim() ? appShotsStr.split(',').map(s => s.trim()).filter(Boolean) : null;
    const tagsArray = appTagsStr.trim() ? appTagsStr.split(',').map(t => t.trim()).filter(Boolean) : undefined;
    const payload: AppItem = {
      id: editingApp ? editingApp.id : '', name: appName, sub: appSub,
      icon: appIcon || appName.slice(0, 2).toUpperCase(), cls: appCls, note: appNote,
      shots: shotsArray, downloadUrl: appDownloadUrl, ipaUrl: appIpaUrl, platform: appPlatform,
      freeKey: appFreeKey, tags: tagsArray, allowSellKey: appAllowSellKey, allowFreeKey: appAllowFreeKey,
      updatedAt: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };
    await onSave(payload);
  };

  if (!isOpen) return null;

  const shotsList = appShotsStr.split(',').map(s => s.trim()).filter(Boolean);
  const tagsList = appTagsStr ? appTagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
  const QUICK_TAGS = ['Hack Map Liên Quân', '🎮 Delta Roblox', '🍎 Mod iOS IPA', '🤖 Mod Android APK', '⚡ AUTO KEY 24/7', '🛡 ANTI-BAN'];

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/85 backdrop-blur-[14px] flex justify-center items-start z-[999999] p-[20px_16px] overflow-y-auto animate-[fadeIn_0.25s_ease-out]" onClick={onClose}>
        <div className="w-[min(720px,100%)] max-h-[90vh] overflow-y-auto bg-[#0f172a]/95 border border-[#38bdf8]/35 rounded-[28px] p-8 backdrop-blur-[24px] shadow-[0_30px_70px_rgba(0,0,0,0.85),0_0_30px_rgba(56,189,248,0.15)] flex flex-col gap-5" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-2">
            <h4>📱 {editingApp ? (lang === 'vi' ? 'Chỉnh Sửa Ứng Dụng Catalog' : 'Edit App Catalog') : (lang === 'vi' ? 'Thêm Ứng Dụng Mới Vào Catalog' : 'Add New App to Catalog')}</h4>
            <button type="button" className="bg-white/10 border border-white/15 text-[#94a3b8] w-9 h-9 rounded-full text-xl grid place-items-center cursor-pointer transition-all duration-200 hover:bg-[#ef4444] hover:text-white hover:border-[#ef4444]" onClick={onClose}>×</button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-170px)] pr-1">

            {/* SECTION 1: BASIC INFO */}
            <div className="bg-[#1e293b]/40 border border-white/10 rounded-[18px] p-5 flex flex-col gap-4">
              <div className="app-section-title">📌 {lang === 'vi' ? '1. Thông Tin Cơ Bản App' : '1. Basic App Information'}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label>{lang === 'vi' ? 'Tên App (*):' : 'App Name (*):'}</label>
                  <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" type="text" ref={appNameInputRef} value={appName} onChange={e => setAppName(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <label>{lang === 'vi' ? 'Tên Game / Subtitle (*):' : 'Sub Title (*):'}</label>
                  <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" type="text" value={appSub} onChange={e => setAppSub(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-2" style={{ marginTop: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={appAllowSellKey} onChange={e => setAppAllowSellKey(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#00f2fe', cursor: 'pointer' }} />
                  <span style={{ fontWeight: 'bold', color: appAllowSellKey ? '#00f2fe' : '#ef4444' }}>🛒 {lang === 'vi' ? 'Cho Phép Bán Key VIP (Hiển thị nút Mua Key trên trang chủ)' : 'Enable VIP Key Sales'}</span>
                </label>
              </div>
              <div className="flex flex-col gap-2" style={{ marginTop: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={appAllowFreeKey} onChange={e => setAppAllowFreeKey(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#22c55e', cursor: 'pointer' }} />
                  <span style={{ fontWeight: 'bold', color: appAllowFreeKey ? '#22c55e' : '#ef4444' }}>🔑 {lang === 'vi' ? 'Cho Phép Cấp Key Free (Hiển thị nút Lấy Key Free trên trang chủ)' : 'Enable Free Key'}</span>
                </label>
              </div>
            </div>

            {/* SECTION 2: ICON, LINKS, TAGS */}
            <div className="bg-[#1e293b]/40 border border-white/10 rounded-[18px] p-5 flex flex-col gap-4">
              <div className="app-section-title">☁ {lang === 'vi' ? '2. Tải Ảnh Icon App Lên Cloudinary & Tệp Tin Tải Về' : '2. App Icon Cloud Upload & Download Links'}</div>
              <div className="flex flex-col gap-2">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                  <span>{lang === 'vi' ? 'Icon App (Tải Ảnh Lên Cloudinary):' : 'App Icon (Upload to Cloudinary):'}</span>
                  <span style={{ fontSize: '11px', color: config?.cloudinaryCloudName ? '#10b981' : '#f59e0b', fontWeight: 'bold', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {config?.cloudinaryCloudName ? `☁ CDN: 🟢 ${config.cloudinaryCloudName}` : '☁ CDN: 🟡 Demo Default'}
                  </span>
                </label>
                <label className="upload-btn-cloud" style={{ margin: 0, padding: '14px 20px', flex: 1, justifyContent: 'center', cursor: 'pointer', textAlign: 'center', fontSize: '14px' }}>
                  {isUploadingIcon ? '⏳ Đang tải ảnh lên Cloudinary...' : '☁ Chọn Tệp Ảnh Up Cloudinary'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={isUploadingIcon} onChange={handleFileUpload} />
                </label>
                {appIcon && (appIcon.startsWith('http') || appIcon.startsWith('data:image/') || appIcon.startsWith('/')) ? (
                  <div style={{ marginTop: '14px', padding: '16px 20px', background: 'rgba(0,0,0,0.5)', borderRadius: '20px', border: '1px solid rgba(0,242,254,0.35)', display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: 0 }}>
                      <img src={appIcon} alt="Preview" className="w-[110px] h-[110px] rounded-[18px] object-cover border-2 border-[#00f2fe] shadow-[0_0_20px_rgba(0,242,254,0.5)] shrink-0" />
                      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '14px', color: '#10b981', fontWeight: 'bold' }}>✓ Đã tải ảnh lên Cloudinary CDN thành công</span>
                        <small style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', wordBreak: 'break-all', display: 'block', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {appIcon.startsWith('data:image/') ? '🖼️ Tệp ảnh vừa tải lên (Base64 Image Data)' : appIcon}
                        </small>
                      </div>
                    </div>
                    <button type="button" onClick={() => setAppIcon('')} style={{ background: 'rgba(239,68,68,0.18)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', flexShrink: 0 }}>🗑 Xóa ảnh</button>
                  </div>
                ) : appIcon ? <div style={{ marginTop: '10px', fontSize: '12px', color: '#94a3b8' }}>Ký tự đại diện icon: <strong style={{ color: '#38bdf8' }}>{appIcon}</strong></div> : null}
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-2" style={{ marginTop: '14px' }}>
                <label>{lang === 'vi' ? '🏷️ Thẻ Nhãn Nổi Bật:' : '🏷️ Custom App Badges / Tags:'}</label>
                <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" type="text" value={appTagsStr} placeholder={lang === 'vi' ? 'VD: Hack Map Liên Quân, 🎮 Delta Roblox' : 'e.g. Hack Map, Delta Roblox'} onChange={e => setAppTagsStr(e.target.value)} />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {QUICK_TAGS.map(tag => {
                    const sel = tagsList.includes(tag);
                    return (
                      <button key={tag} type="button" onClick={() => setAppTagsStr(sel ? tagsList.filter(t => t !== tag).join(', ') : [...tagsList, tag].join(', '))}
                        style={{ padding: '6px 14px', borderRadius: '99px', border: sel ? '1px solid #00f2fe' : '1px solid rgba(255,255,255,0.15)', background: sel ? 'rgba(0,242,254,0.2)' : 'rgba(15,23,42,0.6)', color: sel ? '#00f2fe' : '#94a3b8', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                        {sel ? '✓ ' : '+ '}{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Download links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label>Direct Download Link (.apk/Direct Link):</label>
                  <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" type="text" value={appDownloadUrl} onChange={e => setAppDownloadUrl(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <label>🖥️ {lang === 'vi' ? 'Nền tảng hỗ trợ:' : 'Platform:'}</label>
                  <select className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" value={appPlatform} onChange={e => setAppPlatform(e.target.value as 'android' | 'ios' | 'both')}>
                    <option value="both">🌐 Cả Android + iOS (Hiện cả 2 nút)</option>
                    <option value="android">🤖 Android only (Chỉ hiện nút APK)</option>
                    <option value="ios">🍎 iOS only (Chỉ hiện nút IPA)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 3: NOTE & SCREENSHOTS */}
            <div className="bg-[#1e293b]/40 border border-white/10 rounded-[18px] p-5 flex flex-col gap-4">
              <div className="app-section-title">📸 {lang === 'vi' ? '3. Ghi Chú & Tải Ảnh Menu Preview' : '3. Notice & Menu Preview Screenshots'}</div>
              <div className="flex flex-col gap-2">
                <label>{lang === 'vi' ? 'Ghi chú / Lưu ý khi tải:' : 'Notice / Download Note:'}</label>
                <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" type="text" value={appNote} onChange={e => setAppNote(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{lang === 'vi' ? 'Ảnh Menu Preview (Up Cloudinary):' : 'Menu Screenshots (Upload to Cloudinary):'}</span>
                  <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>☁ Cloud CDN Multi-Upload</span>
                </label>
                <div style={{ border: isDraggingShots ? '2px dashed #00f2fe' : '2px dashed rgba(0,242,254,0.35)', borderRadius: '16px', padding: '18px 14px', textAlign: 'center', background: isDraggingShots ? 'rgba(0,242,254,0.12)' : 'rgba(15,23,42,0.6)', transition: 'all 0.2s ease', marginBottom: '14px' }}
                  onDragOver={e => { e.preventDefault(); setIsDraggingShots(true); }}
                  onDragLeave={e => { e.preventDefault(); setIsDraggingShots(false); }}
                  onDrop={async e => { e.preventDefault(); setIsDraggingShots(false); if (e.dataTransfer.files?.length > 0) await processShotsFiles(e.dataTransfer.files); }}>
                  <label style={{ cursor: 'pointer', display: 'block', margin: 0 }}>
                    <div style={{ fontSize: '32px', marginBottom: '6px' }}>🖼️</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#00f2fe' }}>
                      {isUploadingShots ? `⏳ Đang tải ${shotsUploadProgress?.current}/${shotsUploadProgress?.total} ảnh lên Cloudinary...` : (lang === 'vi' ? 'Kéo & thả tệp ảnh Menu vào đây hoặc BẤM ĐỂ CHỌN NHIỀU TỆP' : 'Drag & drop menu images here or CLICK TO SELECT FILES')}
                    </div>
                    <small style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', display: 'block', marginTop: '4px' }}>{lang === 'vi' ? 'Hỗ trợ tải lên cùng lúc nhiều ảnh Menu (PNG, JPG, WEBP)' : 'Supports batch upload (PNG, JPG, WEBP)'}</small>
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={isUploadingShots} onChange={async e => { if (e.target.files?.length) { await processShotsFiles(e.target.files); e.target.value = ''; } }} />
                  </label>
                </div>

                {/* Screenshots gallery */}
                {appShotsStr && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#10b981' }}>📸 {lang === 'vi' ? `Danh Sách Ảnh Menu (${shotsList.length} ảnh):` : `Menu Screenshots (${shotsList.length}):`}</span>
                      <button type="button" onClick={() => setAppShotsStr('')} style={{ background: 'rgba(239,68,68,0.18)', color: '#f87171', border: '1px solid rgba(239,68,68,0.35)', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>🗑 {lang === 'vi' ? 'Xóa tất cả ảnh' : 'Clear all'}</button>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(115px,1fr))] gap-3">
                      {shotsList.map((s, idx, arr) => {
                        const isImg = s.startsWith('http') || s.startsWith('data:image/') || s.startsWith('/');
                        return (
                          <div key={idx} className="relative bg-[#0f172a]/80 border border-[#00f2fe]/35 rounded-[14px] p-1.5 flex flex-col items-center gap-1.5">
                            {isImg ? <img src={s} alt={`Shot ${idx + 1}`} className="w-full h-[90px] object-cover rounded-[10px] border border-white/10 cursor-pointer" onClick={() => window.open(s, '_blank')} /> : <div style={{ width: '100%', height: '90px', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', borderRadius: '10px', display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: '12px' }}>🏷️ {s}</div>}
                            <div style={{ display: 'flex', gap: '4px', width: '100%', justifyContent: 'center' }}>
                              <button type="button" disabled={idx === 0} onClick={() => moveShotImage(idx, 'left')} style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: 'none', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.3 : 1 }}>←</button>
                              <button type="button" onClick={() => removeShotImage(idx)} style={{ background: 'rgba(239,68,68,0.25)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                              <button type="button" disabled={idx === arr.length - 1} onClick={() => moveShotImage(idx, 'right')} style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: 'none', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', cursor: idx === arr.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === arr.length - 1 ? 0.3 : 1 }}>→</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <details style={{ marginTop: '12px' }}>
                      <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#38bdf8', fontWeight: 'bold' }}>✏️ {lang === 'vi' ? 'Xem hoặc sửa trực tiếp danh sách Link ảnh' : 'Edit raw URL string'}</summary>
                      <textarea rows={2} value={appShotsStr} onChange={e => setAppShotsStr(e.target.value)} placeholder="Dán các link ảnh cách nhau bằng dấu phẩy..." style={{ width: '100%', marginTop: '6px', padding: '8px 12px', borderRadius: '10px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', fontSize: '12px', fontFamily: 'monospace' }} />
                    </details>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-3.5 pt-3.5 border-t border-white/10 shrink-0">
              <button type="button" className="px-5 py-3 rounded-xl border border-[#334155] bg-[#1e293b] text-[#e2e8f0] font-bold cursor-pointer transition-all duration-200 hover:bg-[#334155]" onClick={onClose}>{lang === 'vi' ? 'Hủy Bỏ' : 'Cancel'}</button>
              <button type="submit" className="px-6 py-3 rounded-xl border-0 bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white font-heading font-extrabold text-sm cursor-pointer transition-all duration-250 shadow-[0_4px_14px_rgba(56,189,248,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(56,189,248,0.5)]">{lang === 'vi' ? '💾 Lưu Ứng Dụng' : '💾 Save Application'}</button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
