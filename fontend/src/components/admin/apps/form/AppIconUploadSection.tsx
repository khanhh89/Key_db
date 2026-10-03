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
      <label className="flex justify-between items-center flex-wrap gap-2 text-xs font-bold text-[#64748B]">
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

      <div className="flex items-stretch gap-2 mt-1">
        <input
          className="flex-1 px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-[#F5F7FB] text-[#1F2937] font-inherit text-[13px] outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-[2px] focus:ring-[#2563EB]/20"
          type="text"
          placeholder={lang === 'vi' ? 'Nhập link ảnh hoặc Emoji (VD: 🚀, 💎)...' : 'Enter image link or Emoji...'}
          value={appIcon}
          onChange={(e) => setAppIcon(e.target.value)}
        />
        <label
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-all shrink-0 ${
            isUploadingIcon
              ? 'bg-white text-[#64748B] border border-[#E5E7EB] cursor-not-allowed'
              : 'bg-[#2563EB] border border-[#2563EB] text-[#1F2937] shadow-[0_4px_12px_rgba(14,165,233,0.3)] hover:scale-[1.02]'
          }`}
        >
          {isUploadingIcon
            ? (lang === 'vi' ? '⏳ Đang tải...' : '⏳ Uploading...')
            : (lang === 'vi' ? '☁ Chọn Tệp' : '☁ Upload')}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={isUploadingIcon}
            onChange={handleFileUpload}
          />
        </label>
      </div>

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
              <small className="text-xs text-[#1F2937]/80 break-all bg-black/30 p-1.5 rounded-lg border border-white/10 block">
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
        <div className="mt-2 text-xs text-[#64748B]">
          {lang === 'vi' ? 'Ký tự đại diện icon:' : 'Icon fallback text:'}{' '}
          <strong className="text-[#2563EB]">{appIcon}</strong>
        </div>
      ) : null}
    </div>
  );
}
