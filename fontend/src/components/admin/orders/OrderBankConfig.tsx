import React from 'react';
import type { Language } from '../../../types';

interface OrderBankConfigProps {
  lang: Language;
  bankId: string;
  setBankId: (val: string) => void;
  accNo: string;
  setAccNo: (val: string) => void;
  accName: string;
  setAccName: (val: string) => void;
  enableStaticQr: boolean;
  setEnableStaticQr: (val: boolean) => void;
  isSaving: boolean;
  handleSaveConfig: (e?: React.FormEvent) => Promise<void>;
  showToast: (msg: string) => void;
  sampleQrUrl: string;
  POPULAR_BANKS: { id: string; name: string }[];
}

export function OrderBankConfig({
  lang,
  bankId, setBankId,
  accNo, setAccNo,
  accName, setAccName,
  enableStaticQr, setEnableStaticQr,
  isSaving, handleSaveConfig, showToast,
  sampleQrUrl, POPULAR_BANKS
}: OrderBankConfigProps) {
  return (
    <div className="bg-[#111827]/70 border border-[#1e293b] rounded-[18px] p-5 mb-2.5">
      <h4 className="m-0 mb-4 font-heading text-[#38bdf8] text-[20px] font-extrabold">🏦 {lang === 'vi' ? 'Cấu Hình Tài Khoản Nhận Tiền VietQR' : 'VietQR Bank Account Config'}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <form onSubmit={handleSaveConfig} className="flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-170px)] pr-1">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[#cbd5e1]">{lang === 'vi' ? 'Chọn Ngân Hàng Thụ Hưởng:' : 'Select Destination Bank:'}</label>
            <select className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" value={bankId} onChange={(e) => setBankId(e.target.value)}>
              {POPULAR_BANKS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[#cbd5e1]">{lang === 'vi' ? 'Số Tài Khoản Ngân Hàng:' : 'Bank Account Number:'}</label>
            <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
              type="text"
              value={accNo}
              onChange={(e) => setAccNo(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[#cbd5e1]">{lang === 'vi' ? 'Tên Chủ Tài Khoản (In Hoa Không Dấu):' : 'Account Owner Name:'}</label>
            <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
              type="text"
              value={accName}
              onChange={(e) => setAccName(e.target.value.toUpperCase())}
            />
          </div>

          <div className="flex flex-col gap-2" style={{ margin: '12px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
              <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                type="checkbox"
                checked={enableStaticQr}
                onChange={(e) => {
                  setEnableStaticQr(e.target.checked);
                  showToast(e.target.checked ? '📷 Đã bật VietQR tĩnh' : '🚫 Đã tắt VietQR tĩnh');
                }}
                style={{ width: '18px', height: '18px', accentColor: '#00f2fe', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 'bold', color: enableStaticQr ? '#00f2fe' : '#ef4444' }}>
                {lang === 'vi' ? 'Hiển thị Mã VietQR tĩnh dự phòng (khi tắt PayOS hoặc khi tạo PayOS thất bại)' : 'Enable Static VietQR fallback'}
              </span>
            </label>
          </div>

          <button
            type="button"
            className="px-6 py-3 rounded-xl border-0 bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white font-heading font-extrabold text-sm cursor-pointer transition-all duration-250 shadow-[0_4px_14px_rgba(56,189,248,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(56,189,248,0.5)] mt-2 w-fit"
            disabled={isSaving}
            onClick={() => handleSaveConfig()}
          >
            {isSaving
              ? (lang === 'vi' ? '⏳ ĐANG LƯU...' : '⏳ SAVING...')
              : (lang === 'vi' ? '💾 Lưu Thông Tin Ngân Hàng' : 'Save Bank Details')}
          </button>
        </form>

        <div className="flex flex-col items-center gap-3 p-5 bg-[#0f172a]/50 rounded-[18px] border border-[#1e293b]">
          <h5 className="m-0 mb-2 text-[#38bdf8] text-sm">📱 {lang === 'vi' ? 'Xem Trước Mã VietQR Tự Động:' : 'VietQR Preview:'}</h5>
          <img src={sampleQrUrl} alt="VietQR Preview" className="w-full max-w-[250px] rounded-xl shadow-lg border-4 border-white/10" />
          <div className="text-center flex flex-col text-[13px] text-white">
            <span className="text-[11px] font-bold text-[#94a3b8]">{bankId} - {accNo}</span>
            <strong>{accName}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
