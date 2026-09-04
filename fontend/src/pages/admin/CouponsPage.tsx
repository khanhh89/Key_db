import { useState, useEffect, useRef } from 'react';
import type { CouponItem, AppItem, Language } from '../../types';
import { fetchCouponsFromBackend, saveCouponToBackend, deleteCouponFromBackend } from '../../services/api';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { ModalPortal } from '../../components/common/ModalPortal';
import { Pagination } from '../../components/common/Pagination';

interface CouponsPageProps {
  lang: Language;
  apps: AppItem[];
  showToast: (msg: string) => void;
}

export function CouponsPage({ lang, apps, showToast }: CouponsPageProps) {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form State
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

  const loadCoupons = async () => {
    const data = await fetchCouponsFromBackend();
    setCoupons(data);
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const openNewModal = () => {
    setEditingCoupon(null);
    setCode('');
    setDiscountType('PERCENTAGE');
    setDiscountValue(10);
    setMinOrderAmount(0);
    setMaxDiscountAmount(0);
    setMaxUses(0);
    setAppId('ALL');
    setActive(true);
    setValidUntilDate('');
    setIsModalOpen(true);
  };

  const openEditModal = (cpn: CouponItem) => {
    setEditingCoupon(cpn);
    setCode(cpn.code);
    setDiscountType(cpn.discountType);
    setDiscountValue(cpn.discountValue);
    setMinOrderAmount(cpn.minOrderAmount || 0);
    setMaxDiscountAmount(cpn.maxDiscountAmount || 0);
    setMaxUses(cpn.maxUses || 0);
    setAppId(cpn.appId || 'ALL');
    setActive(cpn.active !== false);
    setValidUntilDate(cpn.validUntil ? cpn.validUntil.split('T')[0] : '');
    setIsModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      showToast(lang === 'vi' ? '⚠️ Mã giảm giá không được để trống!' : '⚠️ Coupon code cannot be empty!');
      codeInputRef.current?.focus();
      return;
    }
    if (!discountValue || discountValue <= 0) {
      showToast(lang === 'vi' ? '⚠️ Mức giảm giá phải lớn hơn 0!' : '⚠️ Discount value must be greater than 0!');
      discountValueInputRef.current?.focus();
      return;
    }

    const payload: Partial<CouponItem> = {
      id: editingCoupon ? editingCoupon.id : undefined,
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount),
      maxDiscountAmount: Number(maxDiscountAmount),
      maxUses: Number(maxUses),
      appId,
      active,
      validUntil: validUntilDate ? `${validUntilDate}T23:59:59` : undefined
    };

    const res = await saveCouponToBackend(payload, Boolean(editingCoupon));
    if (res) {
      showToast(lang === 'vi' ? `🎉 Đã lưu mã giảm giá [${res.code}] thành công!` : `Saved coupon [${res.code}]!`);
      await loadCoupons();
      setIsModalOpen(false);
    } else {
      showToast(lang === 'vi' ? '❌ Lưu mã giảm giá thất bại!' : 'Failed to save coupon!');
    }
  };

  const toggleActiveStatus = async (cpn: CouponItem) => {
    const nextStatus = !cpn.active;
    await saveCouponToBackend({ id: cpn.id, active: nextStatus }, true);
    await loadCoupons();
    showToast(nextStatus ? `🟢 Đã kích hoạt mã [${cpn.code}]` : `🔴 Đã khóa mã [${cpn.code}]`);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    await deleteCouponFromBackend(deletingId);
    await loadCoupons();
    showToast(lang === 'vi' ? 'Đã xóa mã giảm giá thành công!' : 'Deleted coupon!');
    setDeletingId(null);
  };

  const getAppName = (id?: string) => {
    if (!id || id === 'ALL') return 'Tất Cả Các App';
    const found = apps.find((a) => a.id === id);
    return found ? found.name : id;
  };

  const formatDateDDMMYY = (dateStr?: string) => {
    if (!dateStr) return '∞ Vĩnh viễn';
    try {
      const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const parts = cleanDate.split('-');
      if (parts.length === 3) {
        const yy = parts[0].substring(2);
        const mm = parts[1];
        const dd = parts[2];
        return `${dd}/${mm}/${yy}`;
      }
      const d = new Date(dateStr);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).substring(2);
      return `${dd}/${mm}/${yy}`;
    } catch (e) {
      return dateStr;
    }
  };

  const totalPages = Math.ceil(coupons.length / pageSize) || 1;
  const paginatedCoupons = coupons.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[24px] p-7 flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="m-0 font-heading text-[22px] font-extrabold">🎁 {lang === 'vi' ? 'Quản Lý Mã Giảm Giá (Coupons & Promo)' : 'Discount Coupons Manager'}</h2>
        <button className="bg-gradient-to-r from-[#38bdf8] to-[#6366f1] border-0 text-white px-5 py-3 rounded-[14px] font-heading font-extrabold text-sm cursor-pointer transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(56,189,248,0.4)]" onClick={openNewModal}>
          + {lang === 'vi' ? 'Tạo Mã Giảm Giá Mới' : 'Create New Coupon'}
        </button>
      </div>

      <div className="w-full overflow-x-auto rounded-2xl border border-[#1e293b] bg-[#0f172a]/50 backdrop-blur-[10px]">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="hover:bg-[#38bdf8]/[0.04] transition-colors group">
              <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">Mã Code</th>
              <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">Loại Giảm Giá</th>
              <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">Mức Giảm</th>
              <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">Đơn Tối Thiểu</th>
              <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">Hạn Sử Dụng (dd/mm/yy)</th>
              <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">Lượt Dùng (Đã / Tối đa)</th>
              <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">App Áp Dụng</th>
              <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">Trạng Thái</th>
              <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCoupons.length === 0 ? (
              <tr className="hover:bg-[#38bdf8]/[0.04] transition-colors group">
                <td colSpan={9} className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  Chưa có mã giảm giá nào. Bấm "+ Tạo Mã Giảm Giá Mới" để tạo ngay!
                </td>
              </tr>
            ) : (
              paginatedCoupons.map((cpn) => (
                <tr key={cpn.id} className="hover:bg-[#38bdf8]/[0.04] transition-colors group">
                  <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                    <code style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '4px 10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                      {cpn.code}
                    </code>
                  </td>
                  <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                    {cpn.discountType === 'PERCENTAGE' ? (
                      <span className="inline-block px-[10px] py-1 rounded-lg bg-[#6366f1]/15 text-[#818cf8] border border-[#6366f1]/30 font-bold text-[11px]" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                        % Theo Phần Trăm
                      </span>
                    ) : (
                      <span className="inline-block px-[10px] py-1 rounded-lg bg-[#6366f1]/15 text-[#818cf8] border border-[#6366f1]/30 font-bold text-[11px]" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                        💵 Số Tiền Cố Định
                      </span>
                    )}
                  </td>
                  <td style={{ fontWeight: 'bold', color: '#10b981' }}>
                    {cpn.discountType === 'PERCENTAGE' ? `-${cpn.discountValue}%` : `-${cpn.discountValue.toLocaleString()}đ`}
                  </td>
                  <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">{cpn.minOrderAmount ? `${cpn.minOrderAmount.toLocaleString()}đ` : '0đ (Không áp dụng)'}</td>
                  <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                    <span style={{ fontSize: '13px', fontWeight: 600, color: cpn.validUntil ? '#f59e0b' : '#94a3b8' }}>
                      {formatDateDDMMYY(cpn.validUntil)}
                    </span>
                  </td>
                  <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                    {cpn.usedCount || 0} / {cpn.maxUses && cpn.maxUses > 0 ? cpn.maxUses : '∞ Không giới hạn'}
                  </td>
                  <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                    <small style={{ fontWeight: 600 }}>{getAppName(cpn.appId)}</small>
                  </td>
                  <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                    <button
                      onClick={() => toggleActiveStatus(cpn)}
                      style={{
                        background: cpn.active !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: cpn.active !== false ? '#10b981' : '#ef4444',
                        border: `1px solid ${cpn.active !== false ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      {cpn.active !== false ? '🟢 Đang Bật' : '🔴 Đã Khóa'}
                    </button>
                  </td>
                  <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                    <div className="flex items-center gap-2">
                      <button className="bg-[#38bdf8]/12 text-[#38bdf8] border border-[#38bdf8]/30 px-4 py-2 rounded-[10px] font-inherit font-bold text-[13px] cursor-pointer transition-all duration-200 inline-flex items-center gap-[6px] whitespace-nowrap hover:bg-[#38bdf8] hover:text-[#080c14] hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(56,189,248,0.35)]" onClick={() => openEditModal(cpn)}>
                        ✎ Sửa
                      </button>
                      <button className="bg-[#ef4444]/12 text-[#f87171] border border-[#ef4444]/30 px-4 py-2 rounded-[10px] font-inherit font-bold text-[13px] cursor-pointer transition-all duration-200 inline-flex items-center gap-[6px] whitespace-nowrap hover:bg-[#ef4444] hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(239,68,68,0.35)]" onClick={() => setDeletingId(cpn.id)}>
                        🗑 Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={coupons.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }}
        lang={lang}
      />

      <ConfirmModal
        isOpen={Boolean(deletingId)}
        title={lang === 'vi' ? 'Xác Nhận Xóa Mã Giảm Giá?' : 'Confirm Delete Coupon?'}
        message={lang === 'vi' ? 'Bạn có chắc muốn xóa mã giảm giá này không?' : 'Delete coupon?'}
        lang={lang}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingId(null)}
      />

      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/85 backdrop-blur-[14px] flex justify-center items-start z-[999999] p-[20px_16px] overflow-y-auto animate-[fadeIn_0.25s_ease-out]" onClick={() => setIsModalOpen(false)}>
          <div className="w-[min(640px,94vw)] h-auto max-h-[calc(100vh-40px)] m-auto flex flex-col bg-[#0f172a] border border-[#38bdf8]/30 rounded-[28px] p-7 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(56,189,248,0.15)] relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-5 right-[22px] bg-transparent border-none text-[#94a3b8] text-2xl cursor-pointer z-10 transition-colors duration-200 hover:text-[#f87171]" onClick={() => setIsModalOpen(false)} aria-label="Close modal">
              ×
            </button>
            <h4 className="font-heading text-[20px] font-extrabold m-0 mb-4 text-[#38bdf8] shrink-0 pr-[30px]">🎁 {editingCoupon ? 'Chỉnh Sửa Mã Giảm Giá' : 'Tạo Mã Giảm Giá Mới'}</h4>
            <form onSubmit={handleSaveCoupon} className="flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-170px)] pr-1">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#cbd5e1]">Mã Giảm Giá (Code Promo - Viết hoa, VD: MODVIP10):</label>
                <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                  type="text"
                  ref={codeInputRef}
                  placeholder="VD: MODVIP10, KHANH89"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[#cbd5e1]">Loại Giảm Giá:</label>
                  <select className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                  >
                    <option value="PERCENTAGE">% Theo Phần Trăm</option>
                    <option value="FIXED_AMOUNT">💵 Số Tiền Cố Định (VNĐ)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[#cbd5e1]">
                    {discountType === 'PERCENTAGE' ? 'Số Phần Trăm Giảm (%):' : 'Số Tiền Giảm (VNĐ):'}
                  </label>
                  <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                    type="number"
                    min="1"
                    ref={discountValueInputRef}
                    value={discountValue || ''}
                    onChange={(e) => setDiscountValue(e.target.value === '' ? 0 : parseInt(e.target.value.replace(/^0+/, ''), 10) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[#cbd5e1]">Đơn Hàng Tối Thiểu (VNĐ - 0 = Không áp dụng):</label>
                  <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                    type="number"
                    min="0"
                    value={minOrderAmount || ''}
                    onChange={(e) => setMinOrderAmount(e.target.value === '' ? 0 : parseInt(e.target.value.replace(/^0+/, ''), 10) || 0)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[#cbd5e1]">Số Tiền Giảm Tối Đa (% - 0 = Không giới hạn):</label>
                  <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                    type="number"
                    min="0"
                    value={maxDiscountAmount || ''}
                    onChange={(e) => setMaxDiscountAmount(e.target.value === '' ? 0 : parseInt(e.target.value.replace(/^0+/, ''), 10) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[#cbd5e1]">Giới Hạn Lượt Dùng (0 = Không giới hạn):</label>
                  <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                    type="number"
                    min="0"
                    value={maxUses || ''}
                    onChange={(e) => setMaxUses(e.target.value === '' ? 0 : parseInt(e.target.value.replace(/^0+/, ''), 10) || 0)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[#cbd5e1]">Áp Dụng Cho App Catalog:</label>
                  <select className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                  >
                    <option value="ALL">Tất Cả Các App Catalog</option>
                    {apps.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[#cbd5e1]">Ngày Hết Hạn (dd/mm/yy - Để trống nếu vĩnh viễn):</label>
                  <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                    type="date"
                    value={validUntilDate}
                    onChange={(e) => setValidUntilDate(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[#cbd5e1]">Trạng Thái Mã:</label>
                  <select className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                    value={active ? 'true' : 'false'}
                    onChange={(e) => setActive(e.target.value === 'true')}
                  >
                    <option value="true">🟢 Bật Mã (Active)</option>
                    <option value="false">🔴 Khóa Mã (Disabled)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-3.5 pt-3.5 border-t border-white/10 shrink-0">
                <button
                  type="button"
                  className="px-5 py-3 rounded-xl border border-[#334155] bg-[#1e293b] text-[#e2e8f0] font-bold cursor-pointer transition-all duration-200 hover:bg-[#334155]"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="px-6 py-3 rounded-xl border-0 bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white font-heading font-extrabold text-sm cursor-pointer transition-all duration-250 shadow-[0_4px_14px_rgba(56,189,248,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(56,189,248,0.5)]">
                  💾 {editingCoupon ? 'Cập Nhật Mã' : 'Tạo Mã Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
