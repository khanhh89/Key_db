import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { Language, SystemConfig } from '../types';
import { verifyBypassSession, type VerifyBypassSessionResponse } from '../services/gatewayApi';
import { copyTextToClipboard } from '../utils/clipboard';

interface VerifyBypassPageProps {
  lang: Language;
  config: SystemConfig;
  showToast: (msg: string) => void;
}

export function VerifyBypassPage({ lang, showToast }: VerifyBypassPageProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session') || '';

  const [isLoading, setIsLoading] = useState(true);
  const [scanStep, setScanStep] = useState(1);
  const [result, setResult] = useState<VerifyBypassSessionResponse | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      setResult({
        success: false,
        status: 'MISSING_SESSION',
        message: lang === 'vi' ? 'Không tìm thấy mã phiên xác thực.' : 'Missing session token.'
      });
      return;
    }

    let deviceId = localStorage.getItem('modlienquan_device_id');
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 12);
      localStorage.setItem('modlienquan_device_id', deviceId);
    }

    // Visual scanning animation sequence
    const t1 = setTimeout(() => setScanStep(2), 600);
    const t2 = setTimeout(() => setScanStep(3), 1400);

    const t3 = setTimeout(async () => {
      const res = await verifyBypassSession(sessionId, deviceId!);
      setResult(res);
      setIsLoading(false);
      if (res.success) {
        showToast(lang === 'vi' ? '🎉 Mở khóa thành công 24h!' : '🎉 Unlocked successfully for 24h!');
      }
    }, 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [sessionId, lang, showToast]);

  const handleCopyKey = () => {
    if (!result?.freeKey) return;
    copyTextToClipboard(result.freeKey);
    setIsCopied(true);
    showToast(lang === 'vi' ? '📋 Đã sao chép mã Key!' : '📋 Copied key to clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-[min(540px,94vw)] bg-[#0f172a]/90 border border-[#38bdf8]/35 rounded-[28px] p-8 backdrop-blur-[24px] shadow-[0_30px_70px_rgba(0,0,0,0.85),0_0_35px_rgba(56,189,248,0.2)] flex flex-col items-center text-center relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#38bdf8]/15 rounded-full blur-3xl pointer-events-none" />

        {/* LOADING STATE */}
        {isLoading ? (
          <div className="flex flex-col items-center gap-5 my-6">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-[#38bdf8]/20 border-t-[#38bdf8] animate-spin" />
              <div className="text-3xl">🛡️</div>
            </div>

            <div>
              <h3 className="text-xl font-heading font-extrabold text-[#38bdf8] m-0 mb-2">
                {lang === 'vi' ? 'Đang Xác Thực Phiên Vượt Link' : 'Verifying Bypass Session'}
              </h3>
              <p className="text-xs text-[#94a3b8] m-0 max-w-[340px]">
                {scanStep === 1 && (lang === 'vi' ? '1. Đang kết nối máy chủ bảo mật...' : '1. Connecting to security gateway...')}
                {scanStep === 2 && (lang === 'vi' ? '2. Đang kiểm tra mã Token & Anti-Bot...' : '2. Checking session token & anti-bot...')}
                {scanStep === 3 && (lang === 'vi' ? '3. Đang tạo quyền mở khóa Key 24h...' : '3. Generating 24h access entitlement...')}
              </p>
            </div>

            <div className="w-48 h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-[#38bdf8] to-[#6366f1] transition-all duration-700 ease-out"
                style={{ width: scanStep === 1 ? '35%' : scanStep === 2 ? '70%' : '100%' }}
              />
            </div>
          </div>
        ) : result?.success ? (
          /* SUCCESS STATE */
          <div className="flex flex-col items-center gap-5 my-2 w-full animate-[fadeIn_0.3s_ease-out]">
            <div className="w-16 h-16 rounded-full bg-[#22c55e]/20 border-2 border-[#22c55e] flex items-center justify-center text-3xl shadow-[0_0_25px_rgba(34,197,94,0.4)]">
              ✓
            </div>

            <div>
              <span className="inline-block text-[11px] font-extrabold bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40 px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                {lang === 'vi' ? '🟢 Xác Thực Thành Công' : '🟢 Verified Successfully'}
              </span>
              <h2 className="text-2xl font-heading font-extrabold text-white m-0">
                {lang === 'vi' ? 'Đã Mở Khóa Quyền Sử Dụng 24H' : '24-Hour Access Unlocked!'}
              </h2>
              {result.targetAppName && (
                <p className="text-xs text-[#38bdf8] mt-1 font-bold">
                  📱 {result.targetAppName}
                </p>
              )}
            </div>

            {/* Free Key Box */}
            {result.freeKey ? (
              <div className="w-full bg-[#080c14] border border-[#38bdf8]/40 rounded-2xl p-4 flex flex-col gap-2">
                <div className="text-xs text-[#94a3b8] font-bold text-left">
                  🔑 {lang === 'vi' ? 'MÃ KEY CỦA BẠN (HẠN DÙNG 24 GIỜ):' : 'YOUR FREE KEY (24H ACCESS):'}
                </div>
                <div className="flex items-center justify-between gap-2 bg-black/60 p-2.5 rounded-xl border border-white/10">
                  <span className="text-sm font-mono font-extrabold text-[#00f2fe] tracking-wider truncate">
                    {result.freeKey}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="px-3 py-1.5 rounded-lg border-0 bg-[#38bdf8]/20 text-[#38bdf8] hover:bg-[#38bdf8]/30 font-bold text-xs cursor-pointer transition-all shrink-0"
                  >
                    {isCopied ? (lang === 'vi' ? '✓ Đã chép' : '✓ Copied') : (lang === 'vi' ? '📋 Sao chép' : '📋 Copy')}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
              {result.downloadUrl && (
                <a
                  href={result.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 px-5 rounded-xl font-heading font-extrabold text-xs text-white bg-gradient-to-r from-[#10b981] to-[#059669] shadow-[0_4px_14px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 hover:brightness-110 transition-all text-center no-underline"
                >
                  🚀 {lang === 'vi' ? 'Tải Ứng Dụng Ngay' : 'Download App Now'}
                </a>
              )}
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 py-3 px-5 rounded-xl font-heading font-extrabold text-xs text-white bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] shadow-[0_4px_14px_rgba(14,165,233,0.35)] flex items-center justify-center gap-2 hover:brightness-110 transition-all cursor-pointer border-0"
              >
                🏠 {lang === 'vi' ? 'Về Trang Chủ' : 'Go to Homepage'}
              </button>
            </div>
          </div>
        ) : (
          /* ERROR / BLOCKED / EXPIRED STATE */
          <div className="flex flex-col items-center gap-4 my-3 w-full animate-[fadeIn_0.3s_ease-out]">
            <div className="w-16 h-16 rounded-full bg-[#ef4444]/20 border-2 border-[#ef4444] flex items-center justify-center text-3xl shadow-[0_0_25px_rgba(239,68,68,0.4)]">
              ✕
            </div>

            <div>
              <span className="inline-block text-[11px] font-extrabold bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40 px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                {result?.status === 'BLOCKED' ? (lang === 'vi' ? '🛡️ BỊ TỪ CHỐI (ANTI-BOT)' : '🛡️ BLOCKED (ANTI-BOT)') : (lang === 'vi' ? '⚠️ XÁC THỰC THẤT BẠI' : '⚠️ VERIFICATION FAILED')}
              </span>
              <h3 className="text-xl font-heading font-extrabold text-white m-0">
                {result?.status === 'BLOCKED'
                  ? lang === 'vi'
                    ? 'Phát hiện hành vi vượt link bất thường'
                    : 'Unusual bypass behavior detected'
                  : lang === 'vi'
                  ? 'Không thể xác nhận phiên vượt link'
                  : 'Could not verify session'}
              </h3>
              <p className="text-xs text-[#94a3b8] mt-2 max-w-[380px] leading-relaxed">
                {result?.message || (lang === 'vi' ? 'Phiên vượt link không hợp lệ hoặc đã hết hạn.' : 'Invalid or expired session.')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-2 py-3 px-6 rounded-xl font-heading font-extrabold text-xs text-white bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] shadow-[0_4px_14px_rgba(14,165,233,0.35)] flex items-center justify-center gap-2 hover:brightness-110 transition-all cursor-pointer border-0"
            >
              🔄 {lang === 'vi' ? 'Quay Lại Lấy Link Mới' : 'Back to Get New Link'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
