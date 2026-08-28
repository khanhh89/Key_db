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
    <div className="manager-panel">
      <div className="panel-header">
        <h2>🎁 {lang === 'vi' ? 'Quản Lý Mã Giảm Giá (Coupons & Promo)' : 'Discount Coupons Manager'}</h2>
        <button className="add-btn" onClick={openNewModal}>
          + {lang === 'vi' ? 'Tạo Mã Giảm Giá Mới' : 'Create New Coupon'}
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Mã Code</th>
              <th>Loại Giảm Giá</th>
              <th>Mức Giảm</th>
              <th>Đơn Tối Thiểu</th>
              <th>Hạn Sử Dụng (dd/mm/yy)</th>
              <th>Lượt Dùng (Đã / Tối đa)</th>
              <th>App Áp Dụng</th>
              <th>Trạng Thái</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCoupons.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  Chưa có mã giảm giá nào. Bấm "+ Tạo Mã Giảm Giá Mới" để tạo ngay!
                </td>
              </tr>
            ) : (
              paginatedCoupons.map((cpn) => (
                <tr key={cpn.id}>
                  <td>
                    <code style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '4px 10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                      {cpn.code}
                    </code>
                  </td>
                  <td>
                    {cpn.discountType === 'PERCENTAGE' ? (
                      <span className="tag-badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                        % Theo Phần Trăm
                      </span>
                    ) : (
                      <span className="tag-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                        💵 Số Tiền Cố Định
                      </span>
                    )}
                  </td>
                  <td style={{ fontWeight: 'bold', color: '#10b981' }}>
                    {cpn.discountType === 'PERCENTAGE' ? `-${cpn.discountValue}%` : `-${cpn.discountValue.toLocaleString()}đ`}
                  </td>
                  <td>{cpn.minOrderAmount ? `${cpn.minOrderAmount.toLocaleString()}đ` : '0đ (Không áp dụng)'}</td>
                  <td>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: cpn.validUntil ? '#f59e0b' : '#94a3b8' }}>
                      {formatDateDDMMYY(cpn.validUntil)}
                    </span>
                  </td>
                  <td>
                    {cpn.usedCount || 0} / {cpn.maxUses && cpn.maxUses > 0 ? cpn.maxUses : '∞ Không giới hạn'}
                  </td>
                  <td>
                    <small style={{ fontWeight: 600 }}>{getAppName(cpn.appId)}</small>
                  </td>
                  <td>
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
                  <td>
                    <div className="btn-group">
                      <button className="edit-btn" onClick={() => openEditModal(cpn)}>
                        ✎ Sửa
                      </button>
                      <button className="delete-btn" onClick={() => setDeletingId(cpn.id)}>
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
          <div className="sub-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="sub-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setIsModalOpen(false)} aria-label="Close modal">
              ×
            </button>
            <h4>🎁 {editingCoupon ? 'Chỉnh Sửa Mã Giảm Giá' : 'Tạo Mã Giảm Giá Mới'}</h4>
            <form onSubmit={handleSaveCoupon} className="modal-form">
              <div className="form-group">
                <label>Mã Giảm Giá (Code Promo - Viết hoa, VD: MODVIP10):</label>
                <input
                  type="text"
                  ref={codeInputRef}
                  placeholder="VD: MODVIP10, KHANH89"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Loại Giảm Giá:</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                  >
                    <option value="PERCENTAGE">% Theo Phần Trăm</option>
                    <option value="FIXED_AMOUNT">💵 Số Tiền Cố Định (VNĐ)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    {discountType === 'PERCENTAGE' ? 'Số Phần Trăm Giảm (%):' : 'Số Tiền Giảm (VNĐ):'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    ref={discountValueInputRef}
                    value={discountValue || ''}
                    onChange={(e) => setDiscountValue(e.target.value === '' ? 0 : parseInt(e.target.value.replace(/^0+/, ''), 10) || 0)}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Đơn Hàng Tối Thiểu (VNĐ - 0 = Không áp dụng):</label>
                  <input
                    type="number"
                    min="0"
                    value={minOrderAmount || ''}
                    onChange={(e) => setMinOrderAmount(e.target.value === '' ? 0 : parseInt(e.target.value.replace(/^0+/, ''), 10) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label>Số Tiền Giảm Tối Đa (% - 0 = Không giới hạn):</label>
                  <input
                    type="number"
                    min="0"
                    value={maxDiscountAmount || ''}
                    onChange={(e) => setMaxDiscountAmount(e.target.value === '' ? 0 : parseInt(e.target.value.replace(/^0+/, ''), 10) || 0)}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Giới Hạn Lượt Dùng (0 = Không giới hạn):</label>
                  <input
                    type="number"
                    min="0"
                    value={maxUses || ''}
                    onChange={(e) => setMaxUses(e.target.value === '' ? 0 : parseInt(e.target.value.replace(/^0+/, ''), 10) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label>Áp Dụng Cho App Catalog:</label>
                  <select
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

              <div className="form-grid">
                <div className="form-group">
                  <label>Ngày Hết Hạn (dd/mm/yy - Để trống nếu vĩnh viễn):</label>
                  <input
                    type="date"
                    value={validUntilDate}
                    onChange={(e) => setValidUntilDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Trạng Thái Mã:</label>
                  <select
                    value={active ? 'true' : 'false'}
                    onChange={(e) => setActive(e.target.value === 'true')}
                  >
                    <option value="true">🟢 Bật Mã (Active)</option>
                    <option value="false">🔴 Khóa Mã (Disabled)</option>
                  </select>
                </div>
              </div>

              <div className="modal-btn-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="save-btn">
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
