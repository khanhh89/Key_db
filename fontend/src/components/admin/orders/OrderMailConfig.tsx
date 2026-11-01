import React, { useState } from 'react';
import type { Language } from '../../../types';
import { testSendEmailInBackend } from '../../../services/api';

interface OrderMailConfigProps {
  lang: Language;
  mailEnabled: boolean;
  setMailEnabled: (val: boolean) => void;
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
  mailUsername, setMailUsername,
  mailPassword, setMailPassword,
  mailSenderName, setMailSenderName,
  mailHost, setMailHost,
  mailPort, setMailPort,
  isSaving, handleSaveConfig, showToast
}: OrderMailConfigProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleTestMail = async () => {
    if (!testEmail || !testEmail.includes('@') || !testEmail.includes('.')) {
      showToast(lang === 'vi' ? '⚠️ Vui lòng nhập địa chỉ email nhận thư test hợp lệ!' : '⚠️ Please enter a valid test email address!');
      return;
    }
    setIsTesting(true);
    showToast(lang === 'vi' ? '⚡ Đang gửi thử email qua Gmail SMTP...' : 'Sending test email via SMTP...');
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
      <h4 className="m-0 mb-4 font-heading text-[#2563EB] text-[20px] font-extrabold flex items-center gap-2">
        <span>📧</span>
        <span>{lang === 'vi' ? 'Cấu Hình Tài Khoản Gmail Gửi Key Tự Động (SMTP)' : 'Automated VIP Key Gmail SMTP Setup'}</span>
      </h4>
      <p className="text-[#64748B] text-[13px] mt-[-10px] mb-5">
        {lang === 'vi'
          ? 'Gắn tài khoản Gmail tại đây để hệ thống tự động gửi mã Key VIP và hóa đơn về hòm thư khách hàng ngay khi thanh toán VietQR thành công.'
          : 'Configure your Gmail account here to automatically send VIP License Keys and receipts upon payment.'}
      </p>

      <form onSubmit={handleSaveConfig} className="flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-170px)] pr-1">
        {/* ENABLE / DISABLE TOGGLE */}
        <div className="bg-[#2563EB]/[0.08] border border-[#2563EB] p-[16px_20px] rounded-[14px]">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              className="px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F5F7FB] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-[3px] focus:ring-[#2563EB]/20"
              type="checkbox"
              checked={mailEnabled}
              onChange={(e) => {
                setMailEnabled(e.target.checked);
                showToast(e.target.checked ? '⚡ Đã bật gửi Gmail tự động' : '🚫 Đã tắt gửi Gmail tự động');
              }}
            />
            <strong>{lang === 'vi' ? 'Bật Tự Động Gửi Key Qua Gmail Khi Mua Thành Công' : 'Enable Automated Key Delivery via Gmail'}</strong>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* GMAIL USERNAME */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[#64748B]">
              {lang === 'vi' ? 'Địa Chỉ Gmail Gửi Đi (Username):' : 'Sender Gmail Address:'}
            </label>
            <input
              className="px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F5F7FB] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-[3px] focus:ring-[#2563EB]/20"
              type="email"
              placeholder="vidu@gmail.com"
              value={mailUsername}
              onChange={(e) => setMailUsername(e.target.value)}
            />
            <small className="text-[11px] text-[#64748B]">
              {lang === 'vi' ? 'Hộp thư Gmail dùng để gửi thư đến người mua' : 'Your Gmail account used to send emails'}
            </small>
          </div>

          {/* GMAIL APP PASSWORD */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-[#64748B]">
                {lang === 'vi' ? 'Mật Khẩu Ứng Dụng Google (16 ký tự):' : 'Google App Password (16 chars):'}
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-[#2563EB] bg-transparent border-0 cursor-pointer font-bold"
              >
                {showPassword ? '🙈 Ẩn' : '👁️ Hiện'}
              </button>
            </div>
            <input
              className="px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F5F7FB] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-[3px] focus:ring-[#2563EB]/20 font-mono tracking-wider"
              type={showPassword ? 'text' : 'password'}
              placeholder="xxxx xxxx xxxx xxxx"
              value={mailPassword}
              onChange={(e) => setMailPassword(e.target.value)}
            />
            <small className="text-[11px] text-[#64748B]">
              {lang === 'vi' ? 'Không phải mật khẩu đăng nhập bình thường, mà là Mật khẩu ứng dụng 16 ký tự' : 'Google 16-character App Password (not your login password)'}
            </small>
          </div>
        </div>

        {/* SENDER NAME */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-[#64748B]">
            {lang === 'vi' ? 'Tên Người Gửi Hiển Thị Trong Hộp Thư:' : 'Sender Display Name:'}
          </label>
          <input
            className="px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F5F7FB] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-[3px] focus:ring-[#2563EB]/20"
            type="text"
            placeholder="MOD VIP STORE"
            value={mailSenderName}
            onChange={(e) => setMailSenderName(e.target.value)}
          />
        </div>

        {/* STEP-BY-STEP INSTRUCTION BOX */}
        <div className="bg-[#2563EB]/[0.05] border border-[#2563EB]/20 rounded-xl p-4 text-[12.5px] text-white leading-relaxed">
          <strong className="text-[#2563EB] flex items-center gap-1.5 mb-2 font-bold text-sm">
            <span>💡</span>
            <span>{lang === 'vi' ? 'Cách lấy Mật khẩu ứng dụng Google 16 ký tự trong 30 giây:' : 'How to get a Google App Password:'}</span>
          </strong>
          <ol className="m-0 pl-5 text-[#64748B] flex flex-col gap-1">
            <li>Bật <strong>Xác minh 2 bước</strong> (2-Step Verification) cho tài khoản Google của bạn nếu chưa bật.</li>
            <li>
              Truy cập trang tạo mật khẩu ứng dụng của Google:{' '}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="text-[#2563EB] font-bold underline"
              >
                myaccount.google.com/apppasswords ↗
              </a>
            </li>
            <li>Nhập tên ứng dụng bất kỳ (ví dụ: <code>MOD STORE</code>) rồi bấm <strong>Tạo (Create)</strong>.</li>
            <li>Sao chép chuỗi 16 chữ cái màu vàng (ví dụ: <code>abcd efgh ijkl mnop</code>) và dán vào ô <em>Mật Khẩu Ứng Dụng</em> bên trên.</li>
          </ol>
        </div>

        {/* ADVANCED SMTP SETTINGS TOGGLE */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[12px] font-bold text-[#64748B] bg-transparent border-0 cursor-pointer flex items-center gap-1 hover:text-[#2563EB]"
          >
            <span>{showAdvanced ? '▲ Thu gọn Cài đặt SMTP nâng cao' : '▼ Cài đặt SMTP nâng cao (Host & Port)'}</span>
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-2 gap-4 mt-3 bg-white p-4 rounded-xl border border-[#E5E7EB]">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#64748B]">SMTP Host:</label>
                <input
                  className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-[#F5F7FB] text-white font-inherit text-sm outline-none"
                  type="text"
                  value={mailHost}
                  onChange={(e) => setMailHost(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#64748B]">SMTP Port (TLS):</label>
                <input
                  className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-[#F5F7FB] text-white font-inherit text-sm outline-none"
                  type="number"
                  value={mailPort}
                  onChange={(e) => setMailPort(Number(e.target.value) || 587)}
                />
              </div>
            </div>
          )}
        </div>

        {/* ACTION BUTTONS & TEST SECTION */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#E5E7EB]">
          <button
            type="button"
            className="px-6 py-3 rounded-xl border-0 bg-[#2563EB] text-[#ffffff] font-heading font-extrabold text-sm cursor-pointer transition-all duration-200 shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(37,99,235,0.5)]"
            disabled={isSaving}
            onClick={() => handleSaveConfig()}
          >
            {isSaving
              ? (lang === 'vi' ? '⏳ ĐANG LƯU...' : '⏳ SAVING...')
              : (lang === 'vi' ? '💾 Lưu Cấu Hình Gmail' : '💾 Save Gmail Config')}
          </button>

          {/* TEST EMAIL FORM */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-[#E5E7EB] flex-1 max-w-[420px]">
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
              {isTesting ? '⏳ ...' : '⚡ ' + (lang === 'vi' ? 'Gửi Thử Test' : 'Send Test')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
