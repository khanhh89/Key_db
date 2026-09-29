import { useState, useRef, useEffect } from 'react';
import type { AppItem, Language, SystemConfig } from '../../../types';
import { ModalPortal } from '../../common/ModalPortal';
import { AppBasicInfoSection } from './form/AppBasicInfoSection';
import { AppIconUploadSection } from './form/AppIconUploadSection';
import { AppTagsSelectorSection } from './form/AppTagsSelectorSection';
import { AppLinksSection } from './form/AppLinksSection';
import { AppScreenshotsSection } from './form/AppScreenshotsSection';

interface AppFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingApp: AppItem | null;
  lang: Language;
  config?: SystemConfig;
  showToast: (msg: string) => void;
  onSave: (payload: AppItem) => Promise<void>;
}

export function AppFormModal({
  isOpen,
  onClose,
  editingApp,
  lang,
  config,
  showToast,
  onSave,
}: AppFormModalProps) {
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
  const [appRequireBypass, setAppRequireBypass] = useState(true);
  const [appHidden, setAppHidden] = useState(false);
  const [appTagsStr, setAppTagsStr] = useState('');
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const appNameInputRef = useRef<HTMLInputElement>(null);

  // Sync form state when modal opens or editingApp changes
  useEffect(() => {
    if (isOpen) {
      if (editingApp) {
        setAppName(editingApp.name);
        setAppSub(editingApp.sub);
        setAppIcon(editingApp.icon);
        setAppCls(editingApp.cls);
        setAppNote(editingApp.note);
        setAppShotsStr(editingApp.shots ? editingApp.shots.join(', ') : '');
        setAppDownloadUrl(editingApp.downloadUrl || '');
        setAppIpaUrl(editingApp.ipaUrl || '');
        setAppPlatform((editingApp.platform as 'android' | 'ios' | 'both') || 'both');
        setAppFreeKey(editingApp.freeKey || '');
        setAppTagsStr(editingApp.tags ? editingApp.tags.join(', ') : '');
        setAppAllowSellKey(editingApp.allowSellKey !== false);
        setAppAllowFreeKey(editingApp.allowFreeKey !== false);
        setAppRequireBypass(editingApp.requireBypass !== false);
        setAppHidden(Boolean(editingApp.hidden));
      } else {
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
        setAppRequireBypass(true);
        setAppHidden(false);
      }
    }
  }, [isOpen, editingApp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) {
      showToast(lang === 'vi' ? '⚠️ Tên App không được để trống!' : '⚠️ App Name cannot be empty!');
      appNameInputRef.current?.focus();
      return;
    }

    const shotsArray = appShotsStr.trim() ? appShotsStr.split(',').map((s) => s.trim()).filter(Boolean) : null;
    const tagsArray = appTagsStr.trim() ? appTagsStr.split(',').map((t) => t.trim()).filter(Boolean) : undefined;

    const payload: AppItem = {
      id: editingApp ? editingApp.id : '',
      name: appName.trim(),
      sub: appSub.trim(),
      icon: appIcon || appName.slice(0, 2).toUpperCase(),
      cls: appCls,
      note: appNote,
      shots: shotsArray,
      downloadUrl: appDownloadUrl.trim(),
      ipaUrl: appIpaUrl.trim(),
      platform: appPlatform,
      freeKey: appFreeKey,
      tags: tagsArray,
      allowSellKey: appAllowSellKey,
      allowFreeKey: appAllowFreeKey,
      requireBypass: appRequireBypass,
      hidden: appHidden,
      updatedAt: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    };

    setIsSaving(true);
    try {
      await onSave(payload);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-[14px] flex justify-center items-start z-[999999] p-[20px_16px] overflow-y-auto animate-[fadeIn_0.25s_ease-out]"
        onClick={onClose}
      >
        <div
          className="w-[min(740px,100%)] max-h-[92vh] overflow-y-auto bg-[#0f172a]/95 border border-[#38bdf8]/35 rounded-[28px] p-8 backdrop-blur-[24px] shadow-[0_30px_70px_rgba(0,0,0,0.85),0_0_30px_rgba(56,189,248,0.15)] flex flex-col gap-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <h4 className="text-lg font-heading font-extrabold text-[#38bdf8] m-0 flex items-center gap-2">
              📱{' '}
              {editingApp
                ? lang === 'vi'
                  ? 'Chỉnh Sửa Ứng Dụng Catalog'
                  : 'Edit App Catalog'
                : lang === 'vi'
                ? 'Thêm Ứng Dụng Mới Vào Catalog'
                : 'Add New App to Catalog'}
            </h4>
            <button
              type="button"
              className="bg-white/10 border border-white/15 text-[#94a3b8] w-9 h-9 rounded-full text-xl grid place-items-center cursor-pointer transition-all duration-200 hover:bg-[#ef4444] hover:text-white hover:border-[#ef4444]"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Section 1: Basic Info & Toggles */}
            <AppBasicInfoSection
              lang={lang}
              appName={appName}
              setAppName={setAppName}
              appSub={appSub}
              setAppSub={setAppSub}
              appAllowSellKey={appAllowSellKey}
              setAppAllowSellKey={setAppAllowSellKey}
              appAllowFreeKey={appAllowFreeKey}
              setAppAllowFreeKey={setAppAllowFreeKey}
              appRequireBypass={appRequireBypass}
              setAppRequireBypass={setAppRequireBypass}
              appHidden={appHidden}
              setAppHidden={setAppHidden}
              appNameInputRef={appNameInputRef}
            />

            {/* Section 2: Icon CDN, Badges, Links & Platform */}
            <div className="bg-[#1e293b]/40 border border-white/10 rounded-[18px] p-5 flex flex-col gap-4">
              <div className="text-[#38bdf8] font-heading font-bold text-sm tracking-wide flex items-center gap-2">
                ☁ {lang === 'vi' ? '2. Media, Nhãn & Đường Dẫn Tải' : '2. Media, Badges & Download Links'}
              </div>

              <AppIconUploadSection
                lang={lang}
                config={config}
                appIcon={appIcon}
                setAppIcon={setAppIcon}
                isUploadingIcon={isUploadingIcon}
                setIsUploadingIcon={setIsUploadingIcon}
                showToast={showToast}
              />

              <AppTagsSelectorSection
                lang={lang}
                appTagsStr={appTagsStr}
                setAppTagsStr={setAppTagsStr}
              />

              <AppLinksSection
                lang={lang}
                appDownloadUrl={appDownloadUrl}
                setAppDownloadUrl={setAppDownloadUrl}
                appPlatform={appPlatform}
                setAppPlatform={setAppPlatform}
                appNote={appNote}
                setAppNote={setAppNote}
              />
            </div>

            {/* Section 3: Menu Screenshots */}
            <AppScreenshotsSection
              lang={lang}
              appShotsStr={appShotsStr}
              setAppShotsStr={setAppShotsStr}
              showToast={showToast}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                className="px-5 py-3 rounded-xl border border-[#334155] bg-[#1e293b] text-[#e2e8f0] font-bold cursor-pointer transition-all duration-200 hover:bg-[#334155]"
                onClick={onClose}
              >
                {lang === 'vi' ? 'Hủy Bỏ' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 rounded-xl border-0 bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white font-heading font-extrabold text-sm cursor-pointer transition-all duration-250 shadow-[0_4px_14px_rgba(56,189,248,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(56,189,248,0.5)] disabled:opacity-50"
              >
                {isSaving ? (lang === 'vi' ? '⏳ Đang lưu...' : '⏳ Saving...') : `💾 ${lang === 'vi' ? 'Lưu Ứng Dụng' : 'Save Application'}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
