import React, { useState } from 'react';
import type { Language } from '../../../types';
import { testSendEmailInBackend } from '../../../services/api';

interface OrderMailConfigProps {
  lang: Language;
  mailEnabled: boolean;
  setMailEnabled: (val: boolean) => void;
  mailProvider: 'SMTP' | 'RESEND' | 'BREVO';
  setMailProvider: (val: 'SMTP' | 'RESEND' | 'BREVO') => void;
  mailApiKey: string;
  setMailApiKey: (val: string) => void;
  mailUsername: string;
  setMailUsername: (val: string) => void;
  mailPassword: string;
  setMailPassword: (val: string) => void;
  mailSenderName: string;
  setMailSenderName: (val: string) => void;
  mailHost: string;
  setMailHost: (val: string) => void;
  mailPort: number;
  setMailPort: (val: number) => void;
  isSaving: boolean;
  handleSaveConfig: (e?: React.FormEvent) => Promise<void>;
  showToast: (msg: string) => void;
}

export function OrderMailConfig({
  lang,
  mailEnabled, setMailEnabled,
  mailProvider, setMailProvider,
  mailApiKey, setMailApiKey,
  mailUsername, setMailUsername,
  mailPassword, setMailPassword,
  mailSenderName, setMailSenderName,
  mailHost, setMailHost,
  mailPort, setMailPort,
  isSaving, handleSaveConfig, showToast
}: OrderMailConfigProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleTestMail = async () => {
    if (!testEmail || !testEmail.includes('@') || !testEmail.includes('.')) {
      showToast(lang === 'vi' ? '⚠️ Vui lòng nhập địa chỉ email nhận thư test hợp lệ!' : '⚠️ Please enter a valid test email address!');
      return;
    }
    setIsTesting(true);
    showToast(lang === 'vi' ? `⚡ Đang gửi thử email qua [${mailProvider}]...` : `Sending test email via [${mailProvider}]...`);
    try {
      const res = await testSendEmailInBackend(testEmail.trim());
      showToast(res.message);
    } catch {
      showToast(lang === 'vi' ? '⚠️ Gửi email thử nghiệm thất bại' : 'Failed to send test email');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-[#111827]/70 border border-[#E5E7EB] rounded-[18px] p-5 mb-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h4 className="m-0 font-heading text-[#2563EB] text-[20px] font-extrabold flex items-center gap-2">
            <span>📧</span>
            <span>{lang === 'vi' ? 'Cấu Hình Email Gửi Key Tự Động (Resend / Brevo / SMTP)' : 'Automated Key Email Delivery Setup'}</span>
          </h4>
          <p className="text-[#64748B] text-[13px] mt-1 mb-0">
            {lang === 'vi'
              ? 'Tự động gửi mã Key VIP và hóa đơn về hòm thư khách hàng ngay khi thanh toán VietQR thành công.'
              : 'Automatically deliver VIP License Keys and receipts upon successful QR payment.'}
          </p>
        </div>

        {/* CLOUD COMPATIBILITY BADGE */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Render & Cloud Ready (Port 443 HTTPS)</span>
        </div>
      </div>

      <form onSubmit={handleSaveConfig} className="flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-170px)] pr-1">
        {/* ENABLE / DISABLE TOGGLE */}
        <div className="bg-[#2563EB]/[0.08] border border-[#2563EB] p-[14px_18px] rounded-[14px]">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              className="w-4 h-4 rounded text-[#2563EB] cursor-pointer"
              type="checkbox"
              checked={mailEnabled}
              onChange={(e) => {
                setMailEnabled(e.target.checked);
                showToast(e.target.checked ? '⚡ Đã bật gửi email tự động' : '🚫 Đã tắt gửi email tự động');
              }}
            />
            <span className="font-bold text-white text-sm">
              {lang === 'vi' ? 'Bật Tự Động Gửi Key Qua Email Khi Mua Thành Công' : 'Enable Automated Key Email Delivery'}
            </span>
          </label>
        </div>

        {/* PROVIDER SELECTION TABS */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-[#64748B]">
            {lang === 'vi' ? 'Phương Thức Gửi Email (Khuyên dùng Resend hoặc Brevo trên Render):' : 'Email Delivery Service:'}
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* RESEND OPTION */}
            <button
              type="button"
              onClick={() => {
                setMailProvider('RESEND');
                showToast(lang === 'vi' ? '🚀 Đã chọn Resend HTTP API (Cổng 443)' : 'Switched to Resend API');
              }}
              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1.5 ${
                mailProvider === 'RESEND'
                  ? 'bg-[#2563EB]/15 border-[#2563EB] shadow-[0_0_15px_rgba(37,99,235,0.25)]'
                  : 'bg-[#1e293b]/50 border-gray-700/60 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                  <span>🚀</span> Resend API
                </span>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300">
                  Khuyên dùng
                </span>
              </div>
              <p className="text-[11px] text-[#94a3b8] m-0">
                Gửi qua HTTPS Cổng 443. 3.000 mail/tháng miễn phí. Chạy 100% trên Render Free.
              </p>
            </button>

            {/* BREVO OPTION */}
            <button
              type="button"
              onClick={() => {
                setMailProvider('BREVO');
                showToast(lang === 'vi' ? '⚡ Đã chọn Brevo API (Không cần tên miền riêng)' : 'Switched to Brevo API');
              }}
              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1.5 ${
                mailProvider === 'BREVO'
                  ? 'bg-emerald-500/15 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                  : 'bg-[#1e293b]/50 border-gray-700/60 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                  <span>⚡</span> Brevo API
                </span>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
                  Dễ dùng nhất
                </span>
              </div>
              <p className="text-[11px] text-[#94a3b8] m-0">
                300 mail/ngày miễn phí. Không cần tên miền riêng, chỉ cần verify 1 Gmail cá nhân!
              </p>
            </button>

            {/* GMAIL SMTP OPTION */}
            <button
              type="button"
              onClick={() => {
                setMailProvider('SMTP');
                showToast(lang === 'vi' ? '📧 Đã chọn Gmail SMTP (Cổng 587/465)' : 'Switched to Gmail SMTP');
              }}
              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1.5 ${
                mailProvider === 'SMTP'
                  ? 'bg-amber-500/15 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                  : 'bg-[#1e293b]/50 border-gray-700/60 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                  <span>📧</span> Gmail SMTP
                </span>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300">
                  Local / VPS
                </span>
              </div>
              <p className="text-[11px] text-[#94a3b8] m-0">
                Gửi qua cổng 587/465. (Lưu ý: Render Free chặn cổng này, chỉ dùng trên máy riêng).
              </p>
            </button>
          </div>
        </div>

        {/* ---------------- SECTION 1: RESEND CONFIGURATION ---------------- */}
        {mailProvider === 'RESEND' && (
          <div className="flex flex-col gap-4 bg-[#1e293b]/40 p-4 rounded-xl border border-blue-500/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* RESEND API KEY */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-blue-400">
                    Resend API Key (Bắt đầu bằng re_):
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-[11px] text-blue-400 bg-transparent border-0 cursor-pointer font-bold"
                  >
                    {showApiKey ? '🙈 Ẩn' : '👁️ Hiện'}
                  </button>
                </div>
                <input
                  className="px-4 py-3 rounded-xl border border-gray-700 bg-[#0f172a] text-white font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="re_123456789_abcdef..."
                  value={mailApiKey}
                  onChange={(e) => setMailApiKey(e.target.value)}
                />
                <small className="text-[11px] text-[#94a3b8]">
                  Tạo key miễn phí tại resend.com/api-keys
                </small>
              </div>

              {/* SENDER ADDRESS */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <span>Email Người Gửi (From):</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">🛡️ Ẩn Gmail Cá Nhân</span>
                </label>
                <input
                  className="px-4 py-3 rounded-xl border border-gray-700 bg-[#0f172a] text-white font-inherit text-sm outline-none focus:border-blue-500"
                  type="text"
                  placeholder="onboarding@resend.dev (hoặc noreply@domain-cua-ban.com)"
                  value={mailUsername}
                  onChange={(e) => setMailUsername(e.target.value)}
                />
                <small className="text-[11px] text-[#94a3b8]">
                  Hệ thống mặc định dùng <code>onboarding@resend.dev</code>. <strong>Email cá nhân của bạn được ẩn 100%, khách hàng tuyệt đối không nhìn thấy!</strong>
                </small>
              </div>
            </div>

            {/* RESEND QUICK GUIDE */}
            <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-3.5 text-xs text-blue-200 leading-relaxed">
              <strong className="text-blue-300 flex items-center gap-1.5 mb-1.5 font-bold">
                <span>💡</span> Hướng dẫn lấy Resend API Key trong 1 phút:
              </strong>
              <ol className="m-0 pl-5 flex flex-col gap-1 text-[#94a3b8]">
                <li>Truy cập <a href="https://resend.com" target="_blank" rel="noreferrer" className="text-blue-400 font-bold underline">resend.com ↗</a> và đăng ký tài khoản miễn phí.</li>
                <li>Vào mục <strong>API Keys</strong> &gt; Bấm <strong>Create API Key</strong>.</li>
                <li>Sao chép mã bắt đầu bằng <code>re_...</code> và dán vào ô bên trên.</li>
                <li><em>(Tùy chọn)</em>: Thêm tên miền của bạn vào mục <strong>Domains</strong> trên Resend để gửi từ email thương hiệu riêng đến mọi khách hàng.</li>
              </ol>
            </div>
          </div>
        )}

        {/* ---------------- SECTION 2: BREVO CONFIGURATION ---------------- */}
        {mailProvider === 'BREVO' && (
          <div className="flex flex-col gap-4 bg-[#1e293b]/40 p-4 rounded-xl border border-emerald-500/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* BREVO API KEY */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-emerald-400">
                    Brevo API Key (Bắt đầu bằng xkeysib-):
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-[11px] text-emerald-400 bg-transparent border-0 cursor-pointer font-bold"
                  >
                    {showApiKey ? '🙈 Ẩn' : '👁️ Hiện'}
                  </button>
                </div>
                <input
                  className="px-4 py-3 rounded-xl border border-gray-700 bg-[#0f172a] text-white font-mono text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="xkeysib-xxxxxxxxxxxx..."
                  value={mailApiKey}
                  onChange={(e) => setMailApiKey(e.target.value)}
                />
                <small className="text-[11px] text-[#94a3b8]">
                  Tạo API key tại brevo.com &gt; SMTP & API &gt; API Keys
                </small>
              </div>

              {/* SENDER GMAIL */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-emerald-400">
                  Địa Chỉ Gmail Đã Xác Minh Trên Brevo:
                </label>
                <input
                  className="px-4 py-3 rounded-xl border border-gray-700 bg-[#0f172a] text-white font-inherit text-sm outline-none focus:border-emerald-500"
                  type="email"
                  placeholder="your-gmail@gmail.com"
                  value={mailUsername}
                  onChange={(e) => setMailUsername(e.target.value)}
                />
                <small className="text-[11px] text-[#94a3b8]">
                  Nhập đúng Gmail mà bạn đã Add Sender trong trang quản trị Brevo
                </small>
              </div>
            </div>

            {/* BREVO QUICK GUIDE */}
            <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3.5 text-xs text-emerald-200 leading-relaxed">
              <strong className="text-emerald-300 flex items-center gap-1.5 mb-1.5 font-bold">
                <span>💡</span> Hướng dẫn thiết lập Brevo không cần mua tên miền:
              </strong>
              <ol className="m-0 pl-5 flex flex-col gap-1 text-[#94a3b8]">
                <li>Đăng ký tài khoản miễn phí tại <a href="https://brevo.com" target="_blank" rel="noreferrer" className="text-emerald-400 font-bold underline">brevo.com ↗</a>.</li>
                <li>Vào <strong>Senders & Domains</strong> &gt; <strong>Senders</strong> &gt; Bấm <strong>Add a sender</strong> &gt; Nhập tên & Gmail của bạn &gt; Nhập mã 6 số từ Gmail để xác minh.</li>
                <li>Vào <strong>SMTP & API</strong> &gt; Tab <strong>API Keys</strong> &gt; Bấm <strong>Generate a new API key</strong>.</li>
                <li>Dán key <code>xkeysib-...</code> vào ô trên và lưu cấu hình là xong!</li>
              </ol>
            </div>
          </div>
        )}

        {/* ---------------- SECTION 3: GMAIL SMTP CONFIGURATION ---------------- */}
        {mailProvider === 'SMTP' && (
          <div className="flex flex-col gap-4 bg-[#1e293b]/40 p-4 rounded-xl border border-amber-500/30">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
              ⚠️ <strong>Cảnh báo Render:</strong> Gói Render Free chặn cổng SMTP 587 & 465. Nếu bạn deploy trên Render, vui lòng chọn <strong>Resend API</strong> hoặc <strong>Brevo API</strong> ở trên để không bị lỗi timeout.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-amber-400">
                  {lang === 'vi' ? 'Địa Chỉ Gmail Gửi Đi:' : 'Sender Gmail Address:'}
                </label>
                <input
                  className="px-4 py-3 rounded-xl border border-gray-700 bg-[#0f172a] text-white font-inherit text-sm outline-none focus:border-amber-500"
                  type="email"
                  placeholder="vidu@gmail.com"
                  value={mailUsername}
                  onChange={(e) => setMailUsername(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-amber-400">
                    {lang === 'vi' ? 'Mật Khẩu Ứng Dụng Google (16 ký tự):' : 'Google App Password:'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-amber-400 bg-transparent border-0 cursor-pointer font-bold"
                  >
                    {showPassword ? '🙈 Ẩn' : '👁️ Hiện'}
                  </button>
                </div>
                <input
                  className="px-4 py-3 rounded-xl border border-gray-700 bg-[#0f172a] text-white font-mono text-sm outline-none focus:border-amber-500 tracking-wider"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={mailPassword}
                  onChange={(e) => setMailPassword(e.target.value)}
                />
              </div>
            </div>

            {/* ADVANCED SMTP SETTINGS TOGGLE */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[12px] font-bold text-amber-400 bg-transparent border-0 cursor-pointer flex items-center gap-1 hover:underline"
              >
                <span>{showAdvanced ? '▲ Thu gọn Cài đặt Host & Port' : '▼ Cài đặt SMTP Host & Port (587 TLS / 465 SSL)'}</span>
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-2 gap-4 mt-3 bg-[#0f172a] p-3 rounded-xl border border-gray-700">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#94a3b8]">SMTP Host:</label>
                    <input
                      className="px-3 py-2 rounded-lg border border-gray-700 bg-[#1e293b] text-white text-xs outline-none"
                      type="text"
                      value={mailHost}
                      onChange={(e) => setMailHost(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#94a3b8]">SMTP Port (465 SSL hoặc 587 TLS):</label>
                    <input
                      className="px-3 py-2 rounded-lg border border-gray-700 bg-[#1e293b] text-white text-xs outline-none"
                      type="number"
                      value={mailPort}
                      onChange={(e) => setMailPort(Number(e.target.value) || 587)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SENDER DISPLAY NAME (COMMON TO ALL PROVIDERS) */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-[#64748B]">
            {lang === 'vi' ? 'Tên Thương Hiệu Người Gửi (Sender Name):' : 'Sender Display Name:'}
          </label>
          <input
            className="px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F5F7FB] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-[3px] focus:ring-[#2563EB]/20"
            type="text"
            placeholder="MOD VIP STORE"
            value={mailSenderName}
            onChange={(e) => setMailSenderName(e.target.value)}
          />
        </div>

        {/* ACTION BUTTONS & TEST SECTION */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#E5E7EB]">
          <button
            type="button"
            className="px-6 py-3 rounded-xl border-0 bg-[#2563EB] text-[#ffffff] font-heading font-extrabold text-sm cursor-pointer transition-all duration-200 shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(37,99,235,0.5)]"
            disabled={isSaving}
            onClick={() => handleSaveConfig()}
          >
            {isSaving
              ? (lang === 'vi' ? '⏳ ĐANG LƯU...' : '⏳ SAVING...')
              : (lang === 'vi' ? '💾 Lưu Cấu Hình Email' : '💾 Save Email Config')}
          </button>

          {/* TEST EMAIL FORM */}
          <div className="flex items-center gap-2 bg-[#1e293b] p-1.5 rounded-xl border border-gray-700 flex-1 max-w-[440px]">
            <input
              type="email"
              placeholder={lang === 'vi' ? 'Nhập email nhận thư test...' : 'Test receiver email...'}
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="px-3 py-2 rounded-lg border-0 bg-transparent text-white text-xs outline-none flex-1"
            />
            <button
              type="button"
              disabled={isTesting || !testEmail.trim()}
              onClick={handleTestMail}
              className="px-4 py-2 rounded-lg border-0 bg-[#10b981] text-[#ffffff] font-bold text-xs cursor-pointer transition-all hover:bg-[#059669] whitespace-nowrap shadow-[0_2px_8px_rgba(16,185,129,0.3)] disabled:opacity-50"
            >
              {isTesting ? '⏳ Đang gửi...' : '⚡ ' + (lang === 'vi' ? 'Gửi Thử Test' : 'Send Test')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
