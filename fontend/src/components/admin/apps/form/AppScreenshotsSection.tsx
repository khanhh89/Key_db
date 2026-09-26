import { useState } from 'react';
import type { Language } from '../../../../types';
import { uploadToCloudinary } from '../../../../services/cloudinary';

interface AppScreenshotsSectionProps {
  lang: Language;
  appShotsStr: string;
  setAppShotsStr: (val: string) => void;
  showToast: (msg: string) => void;
}

export function AppScreenshotsSection({
  lang,
  appShotsStr,
  setAppShotsStr,
  showToast,
}: AppScreenshotsSectionProps) {
  const [isUploadingShots, setIsUploadingShots] = useState(false);
  const [shotsUploadProgress, setShotsUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [isDraggingShots, setIsDraggingShots] = useState(false);

  const shotsList = appShotsStr ? appShotsStr.split(',').map((s) => s.trim()).filter(Boolean) : [];

  const processShotsFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      showToast(lang === 'vi' ? '⚠️ Vui lòng chọn tệp định dạng hình ảnh!' : '⚠️ Please select image files!');
      return;
    }

    setIsUploadingShots(true);
    setShotsUploadProgress({ current: 0, total: fileArray.length });
    showToast(lang === 'vi' ? `☁ Đang tải ${fileArray.length} ảnh lên Cloudinary...` : `Uploading ${fileArray.length} screenshots...`);

    const uploaded: string[] = [];
    for (let i = 0; i < fileArray.length; i++) {
      setShotsUploadProgress({ current: i + 1, total: fileArray.length });
      try {
        const url = await uploadToCloudinary(fileArray[i]);
        if (url) uploaded.push(url);
      } catch (err) {
        console.warn('Screenshot upload error:', err);
      }
    }

    if (uploaded.length > 0) {
      setAppShotsStr([...shotsList, ...uploaded].join(', '));
      showToast(lang === 'vi' ? `🎉 Đã tải lên ${uploaded.length} ảnh Menu thành công!` : `🎉 Uploaded ${uploaded.length} screenshots!`);
    } else {
      showToast(lang === 'vi' ? '❌ Lỗi tải ảnh Menu lên Cloudinary!' : '❌ Failed to upload screenshots!');
    }

    setIsUploadingShots(false);
    setShotsUploadProgress(null);
  };

  const moveShotImage = (index: number, direction: 'left' | 'right') => {
    const list = [...shotsList];
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    [list[index], list[targetIdx]] = [list[targetIdx], list[index]];
    setAppShotsStr(list.join(', '));
  };

  const removeShotImage = (idx: number) => {
    const list = shotsList.filter((_, i) => i !== idx);
    setAppShotsStr(list.join(', '));
  };

  return (
    <div className="bg-[#1e293b]/40 border border-white/10 rounded-[18px] p-5 flex flex-col gap-4">
      <div className="text-[#38bdf8] font-heading font-bold text-sm tracking-wide flex items-center gap-2">
        📸 {lang === 'vi' ? '3. Ảnh Menu Preview Ứng Dụng' : '3. Menu Preview Screenshots'}
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex justify-between items-center text-xs font-bold text-[#94a3b8]">
          <span>{lang === 'vi' ? 'Ảnh Menu Preview (Up Cloudinary):' : 'Menu Screenshots (Upload to Cloudinary):'}</span>
          <span className="text-[11px] text-[#10b981] font-bold">☁ Cloud CDN Multi-Upload</span>
        </label>

        {/* Drag & Drop Zone */}
        <div
          className="rounded-[16px] p-5 text-center transition-all cursor-pointer"
          style={{
            border: isDraggingShots ? '2px dashed #00f2fe' : '2px dashed rgba(0,242,254,0.35)',
            background: isDraggingShots ? 'rgba(0,242,254,0.12)' : 'rgba(15,23,42,0.6)',
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
            if (e.dataTransfer.files?.length > 0) {
              await processShotsFiles(e.dataTransfer.files);
            }
          }}
        >
          <label className="cursor-pointer block m-0">
            <div className="text-3xl mb-1.5">🖼️</div>
            <div className="text-sm font-bold text-[#00f2fe]">
              {isUploadingShots
                ? `⏳ Đang tải ${shotsUploadProgress?.current}/${shotsUploadProgress?.total} ảnh...`
                : lang === 'vi'
                ? 'Kéo & thả tệp ảnh Menu vào đây hoặc BẤM ĐỂ CHỌN NHIỀU TỆP'
                : 'Drag & drop menu images here or CLICK TO SELECT FILES'}
            </div>
            <small className="text-xs text-white/60 block mt-1">
              {lang === 'vi' ? 'Hỗ trợ tải lên cùng lúc nhiều ảnh (PNG, JPG, WEBP)' : 'Supports batch upload (PNG, JPG, WEBP)'}
            </small>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={isUploadingShots}
              onChange={async (e) => {
                if (e.target.files?.length) {
                  await processShotsFiles(e.target.files);
                  e.target.value = '';
                }
              }}
            />
          </label>
        </div>

        {/* Screenshots Gallery */}
        {shotsList.length > 0 && (
          <div className="mt-3">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-xs font-bold text-[#10b981]">
                📸 {lang === 'vi' ? `Danh Sách Ảnh Menu (${shotsList.length} ảnh):` : `Menu Screenshots (${shotsList.length}):`}
              </span>
              <button
                type="button"
                onClick={() => setAppShotsStr('')}
                className="bg-red-500/20 text-red-400 border border-red-500/35 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer hover:bg-red-500/30 transition-all"
              >
                🗑 {lang === 'vi' ? 'Xóa tất cả' : 'Clear all'}
              </button>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2.5">
              {shotsList.map((s, idx, arr) => {
                const isImg = s.startsWith('http') || s.startsWith('data:image/') || s.startsWith('/');
                return (
                  <div
                    key={idx}
                    className="relative bg-[#0f172a]/80 border border-[#00f2fe]/35 rounded-[14px] p-1.5 flex flex-col items-center gap-1.5"
                  >
                    {isImg ? (
                      <img
                        src={s}
                        alt={`Shot ${idx + 1}`}
                        className="w-full h-[85px] object-cover rounded-[10px] border border-white/10 cursor-pointer"
                        onClick={() => window.open(s, '_blank')}
                      />
                    ) : (
                      <div className="w-full h-[85px] bg-[#38bdf8]/15 text-[#38bdf8] rounded-[10px] grid place-items-center font-bold text-xs p-1 text-center">
                        🏷️ {s}
                      </div>
                    )}
                    <div className="flex gap-1 w-full justify-center">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveShotImage(idx, 'left')}
                        className="bg-white/10 text-white border-0 rounded px-2 py-0.5 text-[11px] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => removeShotImage(idx)}
                        className="bg-red-500/25 text-red-400 border border-red-500/40 rounded px-2 py-0.5 text-[11px] font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                      <button
                        type="button"
                        disabled={idx === arr.length - 1}
                        onClick={() => moveShotImage(idx, 'right')}
                        className="bg-white/10 text-white border-0 rounded px-2 py-0.5 text-[11px] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-[#38bdf8] font-bold">
                ✏️ {lang === 'vi' ? 'Xem hoặc sửa trực tiếp danh sách link ảnh' : 'Edit raw URL string'}
              </summary>
              <textarea
                rows={2}
                value={appShotsStr}
                onChange={(e) => setAppShotsStr(e.target.value)}
                placeholder="https://..., https://..."
                className="w-full mt-1.5 p-2 rounded-lg bg-black/50 text-white border border-white/15 text-xs font-mono outline-none"
              />
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
