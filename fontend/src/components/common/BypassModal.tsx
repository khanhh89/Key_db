import { useState } from 'react';
import type { AppItem, Language } from '../../types';
import { ModalPortal } from './ModalPortal';
import { createBypassSession } from '../../services/gatewayApi';

interface BypassModalProps {
  isOpen: boolean;
  onClose: () => void;
  app: AppItem | null;
  lang: Language;
  showToast: (msg: string) => void;
}

export function BypassModal({ isOpen, onClose, app, lang, showToast }: BypassModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen || !app) return null;

  const handleStartBypass = async () => {
    setIsGenerating(true);
    let deviceId = localStorage.getItem('modlienquan_device_id');
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 12);
      localStorage.setItem('modlienquan_device_id', deviceId);
    }

    try {
      const res = await createBypassSession(deviceId, app.id);
      setIsGenerating(false);

      if (res.success && res.shortenedUrl) {
        showToast(lang === 'vi' ? '🚀 Đang chuyển hướng đến trang vượt link...' : '🚀 Redirecting to shortlink page...');
        window.open(res.shortenedUrl, '_blank');
        onClose();
      } else if (res.alreadyEntitled) {
        showToast(lang === 'vi' ? '🎉 Thiết bị của bạn đã được mở khóa 24h!' : '🎉 Your device is already unlocked!');
        onClose();
      } else {
        showToast(`❌ ${res.message || 'Lỗi tạo link vượt'}`);
      }
    } catch (err: any) {
      setIsGenerating(false);
      showToast(`❌ ${err.message || 'Lỗi kết nối máy chủ'}`);
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-[14px] flex justify-center items-center z-[999999] p-4 animate-[fadeIn_0.25s_ease-out]"
        onClick={onClose}
      >
        <div
          className="w-[min(480px,94vw)] bg-[#0f172a] border border-[#38bdf8]/35 rounded-[26px] p-7 backdrop-blur-[24px] shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(56,189,248,0.2)] relative flex flex-col items-center text-center gap-5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 bg-transparent border-0 text-[#94a3b8] text-2xl cursor-pointer hover:text-white"
          >
            ×
          </button>

          {/* App Header */}
          <div className="flex flex-col items-center gap-2 mt-1">
            {app.icon && (app.icon.startsWith('http') || app.icon.startsWith('data:image/') || app.icon.startsWith('/')) ? (
              <img src={app.icon} alt={app.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-[#38bdf8] shadow-[0_0_20px_rgba(56,189,248,0.35)]" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#38bdf8]/20 flex items-center justify-center text-3xl border border-[#38bdf8]/30">📱</div>
            )}
            <h3 className="text-xl font-heading font-extrabold text-white m-0">
              {app.name}
            </h3>
            <span className="text-[11px] bg-[#38bdf8]/20 text-[#7dd3fc] px-2.5 py-0.5 rounded-full font-bold">
              🔑 {lang === 'vi' ? 'Mở Khóa Free Key 24 Giờ' : 'Unlock 24h Free Key'}
            </span>
          </div>

          {/* Step list */}
          <div className="w-full bg-[#080c14] border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5 text-left text-xs text-[#cbd5e1]">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#38bdf8]/20 text-[#38bdf8] font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
              <span>{lang === 'vi' ? 'Bấm nút "Bắt đầu vượt link" bên dưới' : 'Click "Start Bypass" button below'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#38bdf8]/20 text-[#38bdf8] font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
              <span>{lang === 'vi' ? 'Hoàn thành quảng cáo / captcha trên trang rút gọn' : 'Complete ads / captcha on shortlink page'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#22c55e]/20 text-[#22c55e] font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
              <span className="text-[#22c55e] font-bold">{lang === 'vi' ? 'Tự động mở khóa Key và tải ứng dụng 24H' : 'Auto-unlock key & downloads for 24h'}</span>
            </div>
          </div>

          {/* Action button */}
          <button
            type="button"
            onClick={handleStartBypass}
            disabled={isGenerating}
            className="w-full py-3.5 px-6 rounded-xl border-0 bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white font-heading font-extrabold text-sm cursor-pointer shadow-[0_4px_16px_rgba(14,165,233,0.4)] hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <span>⏳ {lang === 'vi' ? 'Đang tạo link an toàn...' : 'Generating secure link...'}</span>
            ) : (
              <span>🚀 {lang === 'vi' ? 'BẮT ĐẦU VƯỢT LINK NGAY' : 'START BYPASS NOW'}</span>
            )}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
