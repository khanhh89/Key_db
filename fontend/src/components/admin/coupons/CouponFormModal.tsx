import { useState, useRef } from 'react';
import type { CouponItem, AppItem, Language } from '../../../types';
import { ModalPortal } from '../../common/ModalPortal';
import { saveCouponToBackend } from '../../../services/api';

interface CouponFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCoupon: CouponItem | null;
  apps: AppItem[];
  lang: Language;
  showToast: (msg: string) => void;
  onSaved: () => Promise<void>;
}

export function CouponFormModal({ isOpen, onClose, editingCoupon, apps, lang, showToast, onSaved }: CouponFormModalProps) {
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(0);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<number>(0);
  const [maxUses, setMaxUses] = useState<number>(0);
  const [appId, setAppId] = useState<string>('ALL');
  const [active, setActive] = useState<boolean>(true);
  const [validUntilDate, setValidUntilDate] = useState<string>('');

  const codeInputRef = useRef<HTMLInputElement>(null);
  const discountValueInputRef = useRef<HTMLInputElement>(null);

  // Populate form when open state changes
  const prevOpenRef = useRef(false);
  if (isOpen !== prevOpenRef.current) {
    prevOpenRef.current = isOpen;
    if (isOpen) {
      if (editingCoupon) {
        setCode(editingCoupon.code);
        setDiscountType(editingCoupon.discountType);
        setDiscountValue(editingCoupon.discountValue);
        setMinOrderAmount(editingCoupon.minOrderAmount || 0);
        setMaxDiscountAmount(editingCoupon.maxDiscountAmount || 0);
        setMaxUses(editingCoupon.maxUses || 0);
        setAppId(editingCoupon.appId || 'ALL');
        setActive(editingCoupon.active !== false);
        setValidUntilDate(editingCoupon.validUntil ? editingCoupon.validUntil.split('T')[0] : '');
      } else {
        setCode(''); setDiscountType('PERCENTAGE'); setDiscountValue(10);
        setMinOrderAmount(0); setMaxDiscountAmount(0); setMaxUses(0);
        setAppId('ALL'); setActive(true); setValidUntilDate('');
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      showToast(lang === 'vi' ? '⚠️ Mã giảm giá không được để trống!' : '⚠️ Coupon code cannot be empty!');
      codeInputRef.current?.focus(); return;
    }
    if (!discountValue || discountValue <= 0) {
      showToast(lang === 'vi' ? '⚠️ Mức giảm giá phải lớn hơn 0!' : '⚠️ Discount value must be greater than 0!');
      discountValueInputRef.current?.focus(); return;
    }
    const payload: Partial<CouponItem> = {
      id: editingCoupon ? editingCoupon.id : undefined,
      code: code.trim().toUpperCase(), discountType, discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount), maxDiscountAmount: Number(maxDiscountAmount),
      maxUses: Number(maxUses), appId, active,
      validUntil: validUntilDate ? `${validUntilDate}T23:59:59` : undefined
    };
    const res = await saveCouponToBackend(payload, Boolean(editingCoupon));
    if (res) {
      showToast(lang === 'vi' ? `🎉 Đã lưu mã giảm giá [${res.code}] thành công!` : `Saved coupon [${res.code}]!`);
      await onSaved();
      onClose();
    } else {
      showToast(lang === 'vi' ? '❌ Lưu mã giảm giá thất bại!' : 'Failed to save coupon!');
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/85 backdrop-blur-[14px] flex justify-center items-start z-[999999] p-[20px_16px] overflow-y-auto animate-[fadeIn_0.25s_ease-out]" onClick={onClose}>
        <div className="w-[min(640px,94vw)] h-auto max-h-[calc(100vh-40px)] m-auto flex flex-col bg-[#0f172a] border border-[#38bdf8]/30 rounded-[28px] p-7 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(56,189,248,0.15)] relative overflow-hidden" onClick={e => e.stopPropagation()}>
          <button className="absolute top-5 right-[22px] bg-transparent border-none text-[#94a3b8] text-2xl cursor-pointer z-10 transition-colors duration-200 hover:text-[#f87171]" onClick={onClose} aria-label="Close modal">×</button>
          <h4 className="font-heading text-[20px] font-extrabold m-0 mb-4 text-[#38bdf8] shrink-0 pr-[30px]">🎁 {editingCoupon ? 'Chỉnh Sửa Mã Giảm Giá' : 'Tạo Mã Giảm Giá Mới'}</h4>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-170px)] pr-1">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#cbd5e1]">Mã Giảm Giá (Code Promo - Viết hoa, VD: MODVIP10):</label>
              <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" type="text" ref={codeInputRef} placeholder="VD: MODVIP10, KHANH89" value={code} onChange={e => setCode(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#cbd5e1]">Loại Giảm Giá:</label>
                <select className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" value={discountType} onChange={e => setDiscountType(e.target.value as any)}>
                  <option value="PERCENTAGE">% Theo Phần Trăm</option>
                  <option value="FIXED_AMOUNT">💵 Số Tiền Cố Định (VNĐ)</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#cbd5e1]">{discountType === 'PERCENTAGE' ? 'Số Phần Trăm Giảm (%):' : 'Số Tiền Giảm (VNĐ):'}</label>
                <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" type="number" min="1" ref={discountValueInputRef} value={discountValue || ''} onChange={e => setDiscountValue(e.target.value === '' ? 0 : parseInt(e.target.value.replace(/^0+/, ''), 10) || 0)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#cbd5e1]">Đơn Hàng Tối Thiểu (VNĐ - 0 = Không áp dụng):</label>
                <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" type="number" min="0" value={minOrderAmount || ''} onChange={e => setMinOrderAmount(e.target.value === '' ? 0 : parseInt(e.target.value.replace(/^0+/, ''), 10) || 0)} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#cbd5e1]">Số Tiền Giảm Tối Đa (% - 0 = Không giới hạn):</label>
                <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" type="number" min="0" value={maxDiscountAmount || ''} onChange={e => setMaxDiscountAmount(e.target.value === '' ? 0 : parseInt(e.target.value.replace(/^0+/, ''), 10) || 0)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#cbd5e1]">Giới Hạn Lượt Dùng (0 = Không giới hạn):</label>
                <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" type="number" min="0" value={maxUses || ''} onChange={e => setMaxUses(e.target.value === '' ? 0 : parseInt(e.target.value.replace(/^0+/, ''), 10) || 0)} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#cbd5e1]">Áp Dụng Cho App Catalog:</label>
                <select className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" value={appId} onChange={e => setAppId(e.target.value)}>
                  <option value="ALL">Tất Cả Các App Catalog</option>
                  {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#cbd5e1]">Ngày Hết Hạn (Để trống nếu vĩnh viễn):</label>
                <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" type="date" value={validUntilDate} onChange={e => setValidUntilDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#cbd5e1]">Trạng Thái Mã:</label>
                <select className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15" value={active ? 'true' : 'false'} onChange={e => setActive(e.target.value === 'true')}>
                  <option value="true">🟢 Bật Mã (Active)</option>
                  <option value="false">🔴 Khóa Mã (Disabled)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-3.5 pt-3.5 border-t border-white/10 shrink-0">
              <button type="button" className="px-5 py-3 rounded-xl border border-[#334155] bg-[#1e293b] text-[#e2e8f0] font-bold cursor-pointer transition-all duration-200 hover:bg-[#334155]" onClick={onClose}>Hủy</button>
              <button type="submit" className="px-6 py-3 rounded-xl border-0 bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white font-heading font-extrabold text-sm cursor-pointer transition-all duration-250 shadow-[0_4px_14px_rgba(56,189,248,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(56,189,248,0.5)]">
                💾 {editingCoupon ? 'Cập Nhật Mã' : 'Tạo Mã Ngay'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
