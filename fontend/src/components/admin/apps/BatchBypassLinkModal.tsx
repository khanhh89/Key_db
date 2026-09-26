import { useState, useEffect } from 'react';
import type { AppItem, Language } from '../../../types';
import { ModalPortal } from '../../common/ModalPortal';
import {
  batchSetBypassLink,
  fetchAppsFromBackend,
  fetchBypassRotationStatus,
  saveBypassRotationConfig,
  forceRotateBypassNow,
  type BypassRotationStatus,
} from '../../../services/appsApi';
import { BypassAutoRotationTab } from './bypass/BypassAutoRotationTab';
import { BypassSingleLinkTab } from './bypass/BypassSingleLinkTab';
import { BypassAppSelector } from './bypass/BypassAppSelector';

interface BatchBypassLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  apps: AppItem[];
  lang: Language;
  showToast: (msg: string) => void;
  onSuccess: (freshApps: AppItem[]) => void;
}

export function BatchBypassLinkModal({
  isOpen,
  onClose,
  apps,
  lang,
  showToast,
  onSuccess,
}: BatchBypassLinkModalProps) {
  const [activeTab, setActiveTab] = useState<'AUTO_ROTATION' | 'SINGLE_LINK'>('AUTO_ROTATION');

  // Auto Rotation state
  const [linkPoolText, setLinkPoolText] = useState('');
  const [rotationMode, setRotationMode] = useState<'DAILY_SEQUENTIAL' | 'DAILY_RANDOM'>('DAILY_SEQUENTIAL');
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(true);
  const [rotationStatus, setRotationStatus] = useState<BypassRotationStatus | null>(null);
  const [isRotatingNow, setIsRotatingNow] = useState(false);

  // Single Link state
  const [bypassLinkUrl, setBypassLinkUrl] = useState(() => localStorage.getItem('lastSyncBypassLink') || '');

  // App Selection state
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load rotation status on open
  useEffect(() => {
    if (isOpen) {
      fetchBypassRotationStatus().then((status) => {
        if (status) {
          setRotationStatus(status);
          if (status.poolRaw) {
            setLinkPoolText(status.poolRaw);
          } else if (status.pool && status.pool.length > 0) {
            setLinkPoolText(status.pool.join('\n'));
          }
          if (status.rotationMode) {
            setRotationMode(status.rotationMode);
          }
          if (status.autoRotateEnabled !== undefined) {
            setAutoRotateEnabled(status.autoRotateEnabled);
          }
          if (status.isAllApps || !status.targetAppIds || status.targetAppIds.length === 0) {
            setSelectedAppIds(apps.map((a) => a.id));
          } else {
            setSelectedAppIds(status.targetAppIds);
          }
        } else {
          setSelectedAppIds(apps.map((a) => a.id));
        }
      });
    }
  }, [isOpen, apps]);

  const parsedPoolCount = linkPoolText
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.startsWith('http://') || s.startsWith('https://') || s.startsWith('//')).length;

  // Handle Save Auto Rotation
  const handleSaveAutoRotation = async () => {
    if (parsedPoolCount === 0) {
      showToast(
        lang === 'vi'
          ? '⚠️ Vui lòng dán ít nhất 1-3 link hợp lệ (bắt đầu bằng http:// hoặc https://)!'
          : '⚠️ Please enter at least 1-3 valid URLs!'
      );
      return;
    }

    if (selectedAppIds.length === 0) {
      showToast(lang === 'vi' ? '⚠️ Vui lòng chọn ít nhất 1 App để áp dụng!' : '⚠️ Please select at least 1 app!');
      return;
    }

    setIsSyncing(true);
    const res = await saveBypassRotationConfig({
      linkPool: linkPoolText,
      rotationMode,
      targetAppIds: selectedAppIds.length === apps.length ? [] : selectedAppIds,
      autoRotateEnabled,
    });
    setIsSyncing(false);

    if (res.success) {
      const freshApps = await fetchAppsFromBackend();
      onSuccess(freshApps);
      showToast(lang === 'vi' ? `✅ ${res.message || 'Đã lưu cấu hình tự xoay link vượt!'}` : `✅ Saved Auto Rotation configuration!`);
      onClose();
    } else {
      showToast(`❌ ${res.message || 'Lỗi khi lưu cấu hình'}`);
    }
  };

  // Handle Force Rotate Immediately
  const handleForceRotateNow = async () => {
    setIsRotatingNow(true);
    const res = await forceRotateBypassNow();
    setIsRotatingNow(false);
    if (res.success && res.data) {
      setRotationStatus(res.data);
      const freshApps = await fetchAppsFromBackend();
      onSuccess(freshApps);
      showToast(lang === 'vi' ? `⚡ ${res.message || 'Đã chuyển sang link kế tiếp!'}` : `⚡ Switched to next link!`);
    } else {
      showToast(`❌ ${res.message || 'Lỗi chuyển link'}`);
    }
  };

  // Handle Single Link Sync
  const handleSyncSingleLink = async () => {
    if (!bypassLinkUrl.trim()) {
      showToast(lang === 'vi' ? '⚠️ Vui lòng nhập URL Link Vượt!' : '⚠️ Please enter Bypass Link URL!');
      return;
    }

    setIsSyncing(true);
    const appsToClear = apps.filter((a) => a.ipaUrl === bypassLinkUrl && !selectedAppIds.includes(a.id)).map((a) => a.id);

    let hasError = false;
    let errMsg = '';

    if (selectedAppIds.length > 0) {
      const res = await batchSetBypassLink(selectedAppIds, bypassLinkUrl);
      if (!res.success) {
        hasError = true;
        errMsg = res.message || '';
      }
    }

    if (appsToClear.length > 0 && !hasError) {
      const res = await batchSetBypassLink(appsToClear, '');
      if (!res.success) {
        hasError = true;
        errMsg = res.message || '';
      }
    }

    setIsSyncing(false);

    if (!hasError) {
      const freshApps = await fetchAppsFromBackend();
      onSuccess(freshApps);
      localStorage.setItem('lastSyncBypassLink', bypassLinkUrl);
      showToast(lang === 'vi' ? `✅ Đã lưu cấu hình Link Vượt!` : `✅ Saved Bypass Link configuration!`);
      onClose();
    } else {
      showToast(`❌ ${errMsg}`);
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
          className="w-[min(640px,94vw)] margin-auto bg-[#0f172a] border border-[#38bdf8]/35 rounded-[24px] p-7 backdrop-blur-[24px] shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(56,189,248,0.15)] relative flex flex-col gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center">
            <h3 className="m-0 text-[#38bdf8] text-lg font-heading font-extrabold flex items-center gap-2">
              🔗 {lang === 'vi' ? 'Cấu Hình Link Vượt (Bypass Link)' : 'Bypass Link Configuration'}
            </h3>
            <button
              type="button"
              className="bg-transparent border-0 text-[#94a3b8] text-2xl cursor-pointer hover:text-white transition-colors"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          <p className="text-[#94a3b8] text-xs m-0">
            {lang === 'vi'
              ? 'Dán 2-3 link vượt để hệ thống tự động đổi link mới mỗi ngày, hoặc dán 1 link cố định.'
              : 'Paste 2-3 bypass links for daily auto-rotation, or set a single static link.'}
          </p>

          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-[#080c14] p-1 rounded-xl border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setActiveTab('AUTO_ROTATION')}
              className="py-2.5 px-3 rounded-lg border-0 font-extrabold text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
              style={{
                background: activeTab === 'AUTO_ROTATION' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
                color: activeTab === 'AUTO_ROTATION' ? '#fff' : '#94a3b8',
              }}
            >
              🔄 {lang === 'vi' ? 'Tự Xoay 2-3 Link Mỗi Ngày' : 'Auto Daily Rotate (2-3 Links)'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SINGLE_LINK')}
              className="py-2.5 px-3 rounded-lg border-0 font-extrabold text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
              style={{
                background: activeTab === 'SINGLE_LINK' ? 'linear-gradient(135deg, #334155 0%, #1e293b 100%)' : 'transparent',
                color: activeTab === 'SINGLE_LINK' ? '#fff' : '#94a3b8',
              }}
            >
              📌 {lang === 'vi' ? 'Dán 1 Link Cố Định' : 'Single Static Link'}
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'AUTO_ROTATION' ? (
            <BypassAutoRotationTab
              lang={lang}
              linkPoolText={linkPoolText}
              setLinkPoolText={setLinkPoolText}
              rotationMode={rotationMode}
              setRotationMode={setRotationMode}
              autoRotateEnabled={autoRotateEnabled}
              setAutoRotateEnabled={setAutoRotateEnabled}
              rotationStatus={rotationStatus}
              isRotatingNow={isRotatingNow}
              onForceRotateNow={handleForceRotateNow}
            />
          ) : (
            <BypassSingleLinkTab
              lang={lang}
              bypassLinkUrl={bypassLinkUrl}
              setBypassLinkUrl={setBypassLinkUrl}
            />
          )}

          {/* App Selector Component */}
          <BypassAppSelector
            lang={lang}
            apps={apps}
            selectedAppIds={selectedAppIds}
            setSelectedAppIds={setSelectedAppIds}
          />

          {/* Action Buttons */}
          <div className="flex gap-2.5 justify-end pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#334155] bg-[#1e293b] text-[#e2e8f0] font-bold text-xs cursor-pointer hover:bg-[#334155] transition-all"
            >
              {lang === 'vi' ? 'Hủy' : 'Cancel'}
            </button>

            {activeTab === 'AUTO_ROTATION' ? (
              <button
                type="button"
                onClick={handleSaveAutoRotation}
                disabled={isSyncing || parsedPoolCount === 0}
                className="px-6 py-2.5 rounded-xl border-0 bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white font-extrabold text-xs cursor-pointer shadow-[0_4px_14px_rgba(56,189,248,0.3)] transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSyncing ? (lang === 'vi' ? '⏳ Đang lưu...' : '⏳ Saving...') : `💾 ${lang === 'vi' ? 'Lưu & Bật Tự Động Xoay Link' : 'Save & Enable Auto Rotation'}`}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSyncSingleLink}
                disabled={isSyncing || !bypassLinkUrl.trim()}
                className="px-6 py-2.5 rounded-xl border-0 bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white font-extrabold text-xs cursor-pointer shadow-[0_4px_14px_rgba(56,189,248,0.3)] transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSyncing ? (lang === 'vi' ? '⏳ Đang lưu...' : '⏳ Saving...') : `✅ ${lang === 'vi' ? 'Lưu Link Cố Định' : 'Save Static Link'}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
