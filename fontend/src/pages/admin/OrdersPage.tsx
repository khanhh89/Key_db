import { useState, useEffect } from 'react';
import type { OrderItem, Language } from '../../types';
import {
  fetchAllOrdersFromBackend,
  confirmOrderPaymentInBackend,
  fetchAdminBankConfigFromBackend,
  saveBankConfigToBackend,
  deleteOrderFromBackend,
  clearAllOrdersFromBackend,
  formatDateTime
} from '../../services/api';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Pagination } from '../../components/common/Pagination';

interface OrdersPageProps {
  lang: Language;
  showToast: (msg: string) => void;
}

const POPULAR_BANKS = [
  { id: 'MBBANK', name: 'MB Bank (Ngân hàng Quân Đội)' },
  { id: 'VCB', name: 'Vietcombank (VCB)' },
  { id: 'TCB', name: 'Techcombank' },
  { id: 'ACB', name: 'Ngân hàng ACB' },
  { id: 'TPB', name: 'TPBank' },
  { id: 'BIDV', name: 'BIDV' },
  { id: 'VPB', name: 'VPBank' },
  { id: 'VBA', name: 'Agribank' },
  { id: 'STB', name: 'Sacombank' },
  { id: 'MSB', name: 'MSB Bank' },
  { id: 'OCB', name: 'OCB Bank' }
];

export function OrdersPage({ lang, showToast }: OrdersPageProps) {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'payos' | 'bank'>('orders');
  const [isSaving, setIsSaving] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Deletion states
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Bank & PayOS Config States
  const [bankId, setBankId] = useState('');
  const [accNo, setAccNo] = useState('');
  const [accName, setAccName] = useState('');

  const [payosClientId, setPayosClientId] = useState('');
  const [payosApiKey, setPayosApiKey] = useState('');
  const [payosChecksumKey, setPayosChecksumKey] = useState('');
  const [payosEnabled, setPayosEnabled] = useState(false);
  const [enableStaticQr, setEnableStaticQr] = useState(true);

  const loadData = async () => {
    const fetchedOrders = await fetchAllOrdersFromBackend();
    setOrders(fetchedOrders);
    const bank = await fetchAdminBankConfigFromBackend();
    if (bank) {
      setBankId(bank.bankId || '');
      setAccNo(bank.accountNo || '');
      setAccName(bank.accountName || '');
      setPayosClientId(bank.payosClientId || '');
      setPayosApiKey(bank.payosApiKey || '');
      setPayosChecksumKey(bank.payosChecksumKey || '');
      setPayosEnabled(bank.payosEnabled !== false);
      setEnableStaticQr(bank.enableStaticQr !== false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const confirmDeleteOrder = async () => {
    if (!deletingOrderId) return;
    await deleteOrderFromBackend(deletingOrderId);
    await loadData();
    showToast(lang === 'vi' ? `Đã xóa đơn hàng ${deletingOrderId}!` : `Deleted order ${deletingOrderId}!`);
    setDeletingOrderId(null);
  };

  const confirmClearAllOrders = async () => {
    await clearAllOrdersFromBackend();
    await loadData();
    showToast(lang === 'vi' ? 'Đã xóa toàn bộ lịch sử đơn hàng!' : 'Cleared all orders!');
    setIsClearingAll(false);
  };


  const handleManualConfirm = async (orderId: string) => {
    showToast(lang === 'vi' ? `⚡ Đang xử lý xác nhận đơn hàng ${orderId}...` : `Processing order ${orderId}...`);
    await confirmOrderPaymentInBackend(orderId);
    await loadData();
    showToast(lang === 'vi' ? `✅ Đã xác nhận đơn ${orderId} & nhả Key VIP thành công!` : `Confirmed ${orderId} & key pushed!`);
  };

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    showToast(lang === 'vi' ? '⏳ Đang lưu dữ liệu cấu hình hệ thống...' : 'Saving system config...');
    try {
      const result = await saveBankConfigToBackend({
        bankId,
        accountNo: accNo,
        accountName: accName.toUpperCase(),
        payosClientId,
        payosApiKey,
        payosChecksumKey,
        payosEnabled,
        enableStaticQr
      });
      if (result) {
        setBankId(result.bankId || bankId);
        setAccNo(result.accountNo || accNo);
        setAccName(result.accountName || accName);
        setPayosClientId(result.payosClientId || payosClientId);
        setPayosApiKey(result.payosApiKey || payosApiKey);
        setPayosChecksumKey(result.payosChecksumKey || payosChecksumKey);
        setPayosEnabled(result.payosEnabled !== false);
        setEnableStaticQr(result.enableStaticQr !== false);
      }
      showToast(lang === 'vi' ? '🎉 THÀNH CÔNG: Đã lưu thông tin PayOS & Ngân Hàng!' : '🎉 Success: Saved!');
    } catch (err) {
      showToast(lang === 'vi' ? '❌ Thất bại: Không thể kết nối hệ thống máy chủ!' : '❌ Save failed!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTabChange = (tab: 'orders' | 'payos' | 'bank') => {
    setActiveTab(tab);
    if (tab === 'orders') showToast(lang === 'vi' ? '📋 Đã chuyển sang Danh sách Đơn Hàng' : 'Switched to Orders');
    if (tab === 'payos') showToast(lang === 'vi' ? '⚡ Đã chuyển sang Cấu Hình PayOS Gateway' : 'Switched to PayOS Config');
    if (tab === 'bank') showToast(lang === 'vi' ? '🏦 Đã chuyển sang Cấu Hình Tài Khoản VietQR' : 'Switched to VietQR Bank');
  };

  const totalRevenue = orders
    .filter((o) => o.status === 'PAID')
    .reduce((sum, o) => sum + o.amount, 0);

  const sampleQrUrl = `https://img.vietqr.io/image/${bankId}-${accNo}-compact2.png?amount=50000&addInfo=MKDEMO&accountName=${encodeURIComponent(accName)}`;

  return (
    <div className="manager-panel">
      <div className="panel-header">
        <h2>💳 {lang === 'vi' ? 'Quản Lý Đơn Hàng & Cổng Thanh Toán PayOS Auto' : 'Orders & PayOS Payment Gateway'}</h2>
      </div>

      {/* NAVIGATION TABS */}
      <div className="admin-tabs-bar">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => handleTabChange('orders')}
        >
          📋 {lang === 'vi' ? 'Danh Sách Đơn Hàng' : 'Orders List'} ({orders.length})
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'payos' ? 'active' : ''}`}
          onClick={() => handleTabChange('payos')}
        >
          ⚡ {lang === 'vi' ? 'Cấu Hình PayOS Gateway' : 'PayOS Gateway Config'}
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'bank' ? 'active' : ''}`}
          onClick={() => handleTabChange('bank')}
        >
          🏦 {lang === 'vi' ? 'Tài Khoản VietQR' : 'VietQR Bank Account'}
        </button>
      </div>

      {/* PAYOS GATEWAY CONFIG TAB */}
      {activeTab === 'payos' && (
        <div className="bank-config-box">
          <h4>⚡ {lang === 'vi' ? 'Tích Hợp Cổng Thanh Toán Tự Động PayOS' : 'PayOS Automated Gateway Setup'}</h4>
          <p className="subtitle-desc">
            {lang === 'vi'
              ? 'PayOS giúp tự động kiểm tra chuyển khoản và nhả Key ngay lập tức khi khách hàng quét VietQR.'
              : 'PayOS automatically verifies bank transfers and pushes keys in real-time.'}
          </p>

          <form onSubmit={handleSaveConfig} className="bank-form">
            <div className="payos-toggle-box">
              <label className="toggle-label">
                <input
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

            <div className="form-grid">
              <div className="form-group">
                <label>Client ID (Mã Client ID từ PayOS Dashboard):</label>
                <input
                  type="text"
                  value={payosClientId}
                  onChange={(e) => setPayosClientId(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>API Key (Mã API Key từ PayOS Dashboard):</label>
                <input
                  type="password"
                  value={payosApiKey}
                  onChange={(e) => setPayosApiKey(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Checksum Key (Mã Checksum Signature):</label>
                <input
                  type="password"
                  value={payosChecksumKey}
                  onChange={(e) => setPayosChecksumKey(e.target.value)}
                />
              </div>
            </div>

            <div className="webhook-info-card">
              <h5>🔗 Webhook URL (Copy và dán vào Kênh Webhook trên PayOS Dashboard):</h5>
              <code className="webhook-url">http://localhost:8080/api/payos/webhook</code>
            </div>

            <button
              type="button"
              className="save-form-btn"
              disabled={isSaving}
              onClick={() => handleSaveConfig()}
            >
              {isSaving
                ? (lang === 'vi' ? '⏳ ĐANG LƯU...' : '⏳ SAVING...')
                : (lang === 'vi' ? '💾 Lưu Cấu Hình PayOS' : '💾 Save PayOS Config')}
            </button>
          </form>
        </div>
      )}

      {/* VIETQR BANK CONFIG TAB */}
      {activeTab === 'bank' && (
        <div className="bank-config-box">
          <h4>🏦 {lang === 'vi' ? 'Cấu Hình Tài Khoản Nhận Tiền VietQR' : 'VietQR Bank Account Config'}</h4>
          <div className="bank-config-grid">
            <form onSubmit={handleSaveConfig} className="bank-form">
              <div className="form-group">
                <label>{lang === 'vi' ? 'Chọn Ngân Hàng Thụ Hưởng:' : 'Select Destination Bank:'}</label>
                <select value={bankId} onChange={(e) => setBankId(e.target.value)}>
                  {POPULAR_BANKS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{lang === 'vi' ? 'Số Tài Khoản Ngân Hàng:' : 'Bank Account Number:'}</label>
                <input
                  type="text"
                  value={accNo}
                  onChange={(e) => setAccNo(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>{lang === 'vi' ? 'Tên Chủ Tài Khoản (In Hoa Không Dấu):' : 'Account Owner Name:'}</label>
                <input
                  type="text"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value.toUpperCase())}
                />
              </div>

              <div className="form-group" style={{ margin: '12px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                  <input
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
                className="save-form-btn"
                disabled={isSaving}
                onClick={() => handleSaveConfig()}
              >
                {isSaving
                  ? (lang === 'vi' ? '⏳ ĐANG LƯU...' : '⏳ SAVING...')
                  : (lang === 'vi' ? '💾 Lưu Thông Tin Ngân Hàng' : 'Save Bank Details')}
              </button>
            </form>

            <div className="qr-preview-card">
              <h5>📱 {lang === 'vi' ? 'Xem Trước Mã VietQR Tự Động:' : 'VietQR Preview:'}</h5>
              <img src={sampleQrUrl} alt="VietQR Preview" className="qr-preview-img" />
              <div className="qr-preview-info">
                <span>{bankId} - {accNo}</span>
                <strong>{accName}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ORDERS LIST TAB */}
      {activeTab === 'orders' && (
        <>
          {/* REVENUE OVERVIEW */}
          <div className="order-stats-bar">
            <div className="order-stat">
              <span>TỔNG DOANH THU:</span>
              <strong className="price">{totalRevenue.toLocaleString()} đ</strong>
            </div>
            <div className="order-stat">
              <span>TỔNG ĐƠN HÀNG:</span>
              <strong>{orders.length} Đơn</strong>
            </div>
            <div className="order-stat">
              <span>ĐÃ THANH TOÁN:</span>
              <strong className="paid-text">{orders.filter((o) => o.status === 'PAID').length} Đơn</strong>
            </div>
            {orders.length > 0 && (
              <button
                type="button"
                className="delete-btn"
                onClick={() => setIsClearingAll(true)}
                style={{ marginLeft: 'auto', padding: '6px 14px' }}
              >
                🗑 {lang === 'vi' ? 'Xóa Tất Cả Đơn Hàng' : 'Clear All Orders'}
              </button>
            )}
          </div>

          {/* ORDERS TABLE */}
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã Đơn</th>
                  <th>App Game</th>
                  <th>Số Tiền</th>
                  <th>Mã Chuyển Khoản</th>
                  <th>Trạng Thái</th>
                  <th>Thời Gian Thanh Toán</th>
                  <th>Key Đã Giao</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((ord) => (
                  <tr key={ord.id}>
                    <td><strong>{ord.id}</strong></td>
                    <td>{ord.appName}</td>
                    <td><strong className="price">{ord.amount.toLocaleString()} đ</strong></td>
                    <td><code>{ord.paymentCode}</code></td>
                    <td>
                      <span className={`status-badge ${ord.status === 'PAID' ? 'available' : 'pending'}`}>
                        {ord.status === 'PAID' ? '✓ ĐÃ THANH TOÁN' : '⏳ CHỜ CHUYỂN KHOẢN'}
                      </span>
                    </td>
                    <td>
                      {ord.status === 'PAID' ? (
                        <div style={{ fontSize: '12px' }}>
                          <span style={{ color: '#4ade80', fontWeight: 600 }}>
                            ✓ TT: {formatDateTime(ord.paidAt || ord.createdAt)}
                          </span>
                          {ord.createdAt && ord.paidAt && (
                            <div style={{ fontSize: '11px', opacity: 0.7 }}>
                              Tạo: {formatDateTime(ord.createdAt)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', opacity: 0.7 }}>
                          Tạo: {formatDateTime(ord.createdAt)}
                        </span>
                      )}
                    </td>
                    <td>
                      {ord.deliveredKey ? (
                        <code className="key-table-code">{ord.deliveredKey}</code>
                      ) : (
                        <small className="muted">-</small>
                      )}
                    </td>
                    <td>
                      <div className="btn-group">
                        {ord.status !== 'PAID' && (
                          <button
                            type="button"
                            className="edit-btn"
                            onClick={() => handleManualConfirm(ord.id)}
                          >
                            ⚡ {lang === 'vi' ? 'Xác Nhận' : 'Confirm'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="delete-btn"
                          onClick={() => setDeletingOrderId(ord.id)}
                        >
                          🗑 {lang === 'vi' ? 'Xóa' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(orders.length / pageSize) || 1}
            totalItems={orders.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }}
            lang={lang}
          />
        </>
      )}

      {/* CONFIRM DELETE SINGLE ORDER */}
      <ConfirmModal
        isOpen={Boolean(deletingOrderId)}
        title={lang === 'vi' ? 'Xác Nhận Xóa Đơn Hàng?' : 'Confirm Delete Order?'}
        message={
          lang === 'vi'
            ? `Bạn có chắc chắn muốn xóa đơn hàng ${deletingOrderId} không?`
            : `Delete order ${deletingOrderId}?`
        }
        lang={lang}
        onConfirm={confirmDeleteOrder}
        onCancel={() => setDeletingOrderId(null)}
      />

      {/* CONFIRM CLEAR ALL ORDERS */}
      <ConfirmModal
        isOpen={isClearingAll}
        title={lang === 'vi' ? 'Xác Nhận Xóa TOÀN BỘ Đơn Hàng?' : 'Confirm Clear ALL Orders?'}
        message={
          lang === 'vi'
            ? 'Bạn có chắc chắn muốn xóa tất cả lịch sử đơn hàng không? Hành động này KHÔNG thể hoàn tác.'
            : 'Are you sure you want to delete ALL orders? This action CANNOT be undone.'
        }
        lang={lang}
        onConfirm={confirmClearAllOrders}
        onCancel={() => setIsClearingAll(false)}
      />
    </div>
  );
}
