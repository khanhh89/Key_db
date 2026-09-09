import { useState, useEffect } from 'react';
import type { CouponItem, AppItem, Language } from '../../types';
import { fetchCouponsFromBackend, deleteCouponFromBackend, saveCouponToBackend } from '../../services/api';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Pagination } from '../../components/common/Pagination';
import { CouponFormModal } from '../../components/admin/coupons/CouponFormModal';

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

  const loadCoupons = async () => {
    const data = await fetchCouponsFromBackend();
    setCoupons(data);
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const openNewModal = () => {
    setEditingCoupon(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cpn: CouponItem) => {
    setEditingCoupon(cpn);
    setIsModalOpen(true);
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

      <CouponFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingCoupon={editingCoupon}
        apps={apps}
        lang={lang}
        showToast={showToast}
        onSaved={loadCoupons}
      />
    </div>
  );
}

