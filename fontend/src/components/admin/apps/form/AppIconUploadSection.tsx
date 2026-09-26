import type { ChangeEvent } from 'react';
import type { Language, SystemConfig } from '../../../../types';
import { uploadToCloudinary } from '../../../../services/cloudinary';

interface AppIconUploadSectionProps {
  lang: Language;
  config?: SystemConfig;
  appIcon: string;
  setAppIcon: (url: string) => void;
  isUploadingIcon: boolean;
  setIsUploadingIcon: (loading: boolean) => void;
  showToast: (msg: string) => void;
}

export function AppIconUploadSection({
  lang,
  config,
  appIcon,
  setAppIcon,
  isUploadingIcon,
  setIsUploadingIcon,
  showToast,
}: AppIconUploadSectionProps) {
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingIcon(true);
    showToast(lang === 'vi' ? '☁ Đang tải ảnh lên Cloudinary CDN...' : 'Uploading image to Cloudinary CDN...');
    try {
      const url = await uploadToCloudinary(file);
      if (url) {
        setAppIcon(url);
        showToast(lang === 'vi' ? '🎉 Đã tải ảnh lên Cloudinary thành công!' : '🎉 Uploaded image to Cloudinary!');
      } else {
        showToast(lang === 'vi' ? '❌ Lỗi tải ảnh!' : '❌ Upload failed!');
      }
    } catch {
      showToast(lang === 'vi' ? '❌ Không thể tải ảnh lên Cloudinary!' : '❌ Failed to upload!');
    } finally {
      setIsUploadingIcon(false);
      e.target.value = '';
    }
  };

  const hasValidIconUrl =
    appIcon && (appIcon.startsWith('http') || appIcon.startsWith('data:image/') || appIcon.startsWith('/'));

  return (
    <div className="flex flex-col gap-2">
      <label className="flex justify-between items-center flex-wrap gap-2 text-xs font-bold text-[#94a3b8]">
        <span>{lang === 'vi' ? 'Icon App (Tải Ảnh Lên Cloudinary):' : 'App Icon (Upload to Cloudinary):'}</span>
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded border border-white/10"
          style={{
            color: config?.cloudinaryCloudName ? '#10b981' : '#f59e0b',
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          {config?.cloudinaryCloudName ? `☁ CDN: 🟢 ${config.cloudinaryCloudName}` : '☁ CDN: 🟡 Demo Default'}
        </span>
      </label>

      <label
        className="upload-btn-cloud flex items-center justify-center p-3.5 rounded-xl border border-[#38bdf8]/40 bg-[#080c14] text-[#38bdf8] font-bold text-sm cursor-pointer hover:bg-[#38bdf8]/10 transition-all text-center"
      >
        {isUploadingIcon
          ? (lang === 'vi' ? '⏳ Đang tải ảnh lên Cloudinary...' : '⏳ Uploading icon...')
          : (lang === 'vi' ? '☁ Chọn Tệp Ảnh Up Cloudinary' : '☁ Select Image File to Upload')}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={isUploadingIcon}
          onChange={handleFileUpload}
        />
      </label>

      {hasValidIconUrl ? (
        <div className="mt-3 p-4 bg-black/50 rounded-2xl border border-[#00f2fe]/35 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <img
              src={appIcon}
              alt="Preview"
              className="w-[90px] h-[90px] rounded-[16px] object-cover border-2 border-[#00f2fe] shadow-[0_0_16px_rgba(0,242,254,0.4)] shrink-0"
            />
            <div className="min-w-0 flex flex-col gap-1.5">
              <span className="text-sm text-[#10b981] font-bold">
                ✓ {lang === 'vi' ? 'Đã tải ảnh lên CDN thành công' : 'Uploaded to CDN successfully'}
              </span>
              <small className="text-xs text-white/80 break-all bg-black/30 p-1.5 rounded-lg border border-white/10 block">
                {appIcon.startsWith('data:image/') ? '🖼️ Tệp ảnh Base64' : appIcon}
              </small>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAppIcon('')}
            className="bg-red-500/15 text-red-400 border border-red-500/40 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-red-500/25 transition-all shrink-0"
          >
            🗑 {lang === 'vi' ? 'Xóa ảnh' : 'Remove'}
          </button>
        </div>
      ) : appIcon ? (
        <div className="mt-2 text-xs text-[#94a3b8]">
          {lang === 'vi' ? 'Ký tự đại diện icon:' : 'Icon fallback text:'}{' '}
          <strong className="text-[#38bdf8]">{appIcon}</strong>
        </div>
      ) : null}
    </div>
  );
}
