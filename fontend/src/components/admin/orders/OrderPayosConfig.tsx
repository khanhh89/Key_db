import React from 'react';
import type { Language } from '../../../types';
import { API_BASE_URL } from '../../../services/api';

interface OrderPayosConfigProps {
  lang: Language;
  payosEnabled: boolean;
  setPayosEnabled: (val: boolean) => void;
  payosClientId: string;
  setPayosClientId: (val: string) => void;
  payosApiKey: string;
  setPayosApiKey: (val: string) => void;
  payosChecksumKey: string;
  setPayosChecksumKey: (val: string) => void;
  isSaving: boolean;
  handleSaveConfig: (e?: React.FormEvent) => Promise<void>;
  showToast: (msg: string) => void;
}

export function OrderPayosConfig({
  lang,
  payosEnabled, setPayosEnabled,
  payosClientId, setPayosClientId,
  payosApiKey, setPayosApiKey,
  payosChecksumKey, setPayosChecksumKey,
  isSaving, handleSaveConfig, showToast
}: OrderPayosConfigProps) {
  return (
    <div className="bg-[#111827]/70 border border-[#E5E7EB] rounded-[18px] p-5 mb-2.5">
      <h4 className="m-0 mb-4 font-heading text-[#2563EB] text-[20px] font-extrabold">⚡ {lang === 'vi' ? 'Tích Hợp Cổng Thanh Toán Tự Động PayOS' : 'PayOS Automated Gateway Setup'}</h4>
      <p className="text-[#64748B] text-[13px] mt-[-10px] mb-5">
        {lang === 'vi'
          ? 'PayOS giúp tự động kiểm tra chuyển khoản và nhả Key ngay lập tức khi khách hàng quét VietQR.'
          : 'PayOS automatically verifies bank transfers and pushes keys in real-time.'}
      </p>

      <form onSubmit={handleSaveConfig} className="flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-170px)] pr-1">
        <div className="bg-[#2563EB]/[0.08] border border-[#2563EB] p-[16px_20px] rounded-[14px]">
          <label className="flex items-center gap-3 cursor-pointer">
            <input className="px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F5F7FB] text-[#1F2937] font-inherit text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-[3px] focus:ring-[#2563EB]/20"
              type="checkbox"
              checked={payosEnabled}
              onChange={(e) => {
                setPayosEnabled(e.target.checked);
                showToast(e.target.checked ? '⚡ Đã bật PayOS Gateway' : '🚫 Đã tắt PayOS Gateway');
              }}
            />
            <strong>{lang === 'vi' ? 'Bật Cổng Thanh Toán Tự Động PayOS' : 'Enable PayOS Automated Gateway'}</strong>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[#64748B]">Client ID (Mã Client ID từ PayOS Dashboard):</label>
            <input className="px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F5F7FB] text-[#1F2937] font-inherit text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-[3px] focus:ring-[#2563EB]/20"
              type="text"
              value={payosClientId}
              onChange={(e) => setPayosClientId(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[#64748B]">API Key (Mã API Key từ PayOS Dashboard):</label>
            <input className="px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F5F7FB] text-[#1F2937] font-inherit text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-[3px] focus:ring-[#2563EB]/20"
              type="password"
              value={payosApiKey}
              onChange={(e) => setPayosApiKey(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[#64748B]">Checksum Key (Mã Checksum Signature):</label>
            <input className="px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F5F7FB] text-[#1F2937] font-inherit text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-[3px] focus:ring-[#2563EB]/20"
              type="password"
              value={payosChecksumKey}
              onChange={(e) => setPayosChecksumKey(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#2563EB] mt-2">
          <h5 className="m-0 mb-2 text-[#2563EB] text-sm">🔗 Webhook URL (Copy và dán vào Kênh Webhook trên PayOS Dashboard):</h5>
          <code className="bg-white text-[#2563EB] p-2 rounded-lg font-mono text-[13px] block">{API_BASE_URL}/payos/webhook</code>
        </div>

        <button
          type="button"
          className="px-6 py-3 rounded-xl border-0 bg-[#2563EB] text-[#1F2937] font-heading font-extrabold text-sm cursor-pointer transition-all duration-250 shadow-[0_4px_14px_rgba(56,189,248,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(56,189,248,0.5)] mt-2 w-fit"
          disabled={isSaving}
          onClick={() => handleSaveConfig()}
        >
          {isSaving
            ? (lang === 'vi' ? '⏳ ĐANG LƯU...' : '⏳ SAVING...')
            : (lang === 'vi' ? '💾 Lưu Cấu Hình PayOS' : '💾 Save PayOS Config')}
        </button>
      </form>
    </div>
  );
}
