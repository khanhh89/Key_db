import { useState, useEffect } from 'react';
import { ModalPortal } from '../common/ModalPortal';
import type { OrderItem, Language } from '../../types';
import {
  fetchOrderStatusFromBackend,
  verifyCustomerPaymentInBackend,
  formatDateTime,
  trackClientEvent,
  getLocalOrders
} from '../../services/api';

interface OrderLookupModalProps {
  lang: Language;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export function OrderLookupModal({ lang, onClose, showToast }: OrderLookupModalProps) {
  const [searchCode, setSearchCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [orderResult, setOrderResult] = useState<OrderItem | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Local Saved Orders (Device History - All orders on this browser)
  const [localDeviceOrders, setLocalDeviceOrders] = useState<OrderItem[]>([]);

  const refreshDeviceOrders = () => {
    const orders = getLocalOrders();
    const sorted = [...orders].sort((a, b) => {
      // Show PAID orders first, then newest orders
      if (a.status === 'PAID' && b.status !== 'PAID') return -1;
      if (a.status !== 'PAID' && b.status === 'PAID') return 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    setLocalDeviceOrders(sorted);
  };

  useEffect(() => {
    refreshDeviceOrders();
  }, []);

  const toggleShowSecret = (orderId: string) => {
    setShowSecrets((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const handleLookup = async (codeToSearch?: string) => {
    const code = (codeToSearch || searchCode).trim();
    if (!code) {
      showToast(lang === 'vi' ? '⚠️ Vui lòng nhập Mã Đơn Hàng (ORD-...) hoặc Mã Chuyển Khoản (MK...)' : '⚠️ Please enter Order ID or Payment Code');
      return;
    }

    trackClientEvent('CLIENT_LOOKUP_ORDER', `Khách hàng tra cứu đơn hàng với mã [${code}]`);

    setIsLoading(true);
    setVerifyMsg(null);
    setHasSearched(true);

    try {
      const order = await fetchOrderStatusFromBackend(code);
      setOrderResult(order);

      if (order) {
        // Save to recent lookup history in client-side localStorage
        const existing = JSON.parse(localStorage.getItem('modlienquan_recent_orders') || '[]');
        const updated = Array.from(new Set([order.id, order.paymentCode, ...existing])).slice(0, 5);
        localStorage.setItem('modlienquan_recent_orders', JSON.stringify(updated));

        // Refresh device history
        refreshDeviceOrders();
      }
    } catch (err) {
      console.error('Lookup order error:', err);
      setOrderResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!orderResult) return;
    setIsVerifying(true);
    setVerifyMsg(null);

    const res = await verifyCustomerPaymentInBackend(orderResult.id);
    if (res.success && res.data) {
      setOrderResult(res.data);
      showToast(lang === 'vi' ? '🎉 Thanh toán thành công! Key đã được cấp.' : 'Payment verified! Key delivered.');
      refreshDeviceOrders();
    } else {
      setVerifyMsg(res.message || (lang === 'vi' ? 'Hệ thống chưa ghi nhận tiền trong tài khoản.' : 'Payment not recorded yet.'));
    }
    setIsVerifying(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(lang === 'vi' ? `Đã sao chép ${label}!` : `Copied ${label}!`);
  };

  const clearLocalHistory = () => {
    if (window.confirm(lang === 'vi' ? 'Bạn có chắc muốn xóa toàn bộ lịch sử đơn hàng lưu trên thiết bị này?' : 'Clear order history on this device?')) {
      localStorage.removeItem('modlienquan_orders');
      setLocalDeviceOrders([]);
      showToast(lang === 'vi' ? 'Đã xóa lịch sử đơn hàng lưu trên máy!' : 'Cleared local order history!');
    }
  };

  const recentCodes: string[] = JSON.parse(localStorage.getItem('modlienquan_recent_orders') || '[]');

  return (
    <ModalPortal>
      <div className="sub-modal-overlay" onClick={onClose}>
      <div className="buy-key-modal-card lookup-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Close modal">
          ×
        </button>

        <div className="buy-key-header">
          <h3>🔍 {lang === 'vi' ? 'Tra Cứu & Lịch Sử Đơn Hàng Key VIP' : 'Check Order & Saved VIP Keys'}</h3>
          <p className="subtitle-desc" style={{ fontSize: '13px', color: 'var(--text-muted-dark)', marginTop: '4px' }}>
            {lang === 'vi'
              ? 'Nhập Mã Đơn Hàng (ORD-xxxxx) hoặc Mã Chuyển Khoản (MKxxxxx) để kiểm tra & xem lại toàn bộ Key VIP trên máy'
              : 'Enter Order ID (ORD-xxxxx) or Payment Code (MKxxxxx) to check status & view saved keys'}
          </p>
        </div>

        {/* Search Input Box */}
        <div className="lookup-search-box">
          <input
            type="text"
            className="lookup-input"
            placeholder={lang === 'vi' ? 'Nhập mã ORD-... hoặc MK...' : 'Enter ORD-... or MK...'}
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLookup();
            }}
          />
          <button
            className="lookup-btn"
            onClick={() => handleLookup()}
            disabled={isLoading}
          >
            {isLoading ? (lang === 'vi' ? '⏳ Đang tìm...' : '⏳ Searching...') : (lang === 'vi' ? '🔎 Tra Cứu' : '🔎 Search')}
          </button>
        </div>

        {/* Recent Search Chips */}
        {recentCodes.length > 0 && !hasSearched && (
          <div style={{ marginTop: '14px' }}>
            <span style={{ fontSize: '12px', opacity: 0.7, fontWeight: 500 }}>
              {lang === 'vi' ? 'Mã tra cứu gần đây:' : 'Recent lookups:'}
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              {recentCodes.map((code) => (
                <button
                  key={code}
                  className="recent-chip"
                  onClick={() => {
                    setSearchCode(code);
                    handleLookup(code);
                  }}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Result Container */}
        {hasSearched && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <strong style={{ fontSize: '14px', color: '#38bdf8' }}>
                📋 {lang === 'vi' ? 'Kết quả tra cứu mã:' : 'Lookup Result:'}
              </strong>
              <button
                className="text-link-btn"
                style={{ fontSize: '12px', color: '#94a3b8' }}
                onClick={() => setHasSearched(false)}
              >
                ← {lang === 'vi' ? 'Quay lại lịch sử' : 'Back to history'}
              </button>
            </div>

            {isLoading ? (
              <div className="loading-spinner-box" style={{ padding: '30px', textAlign: 'center' }}>
                🔄 {lang === 'vi' ? 'Đang truy vấn dữ liệu từ API máy chủ...' : 'Fetching order data from API server...'}
              </div>
            ) : orderResult ? (
              <div className="key-delivered-step" style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px solid var(--border-dark)' }}>
                {/* Header Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>{lang === 'vi' ? 'Ứng Dụng:' : 'App:'}</span>{' '}
                    <strong style={{ fontSize: '16px', fontFamily: 'var(--font-heading)' }}>{orderResult.appName}</strong>
                  </div>
                  <span
                    className={`status-badge ${orderResult.status === 'PAID' ? 'available' : 'pending'}`}
                    style={{
                      padding: '5px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      background: orderResult.status === 'PAID' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                      color: orderResult.status === 'PAID' ? '#4ade80' : '#facc15',
                      border: orderResult.status === 'PAID' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)'
                    }}
                  >
                    {orderResult.status === 'PAID'
                      ? (lang === 'vi' ? '✓ ĐÃ THANH TOÁN' : '✓ PAID')
                      : (lang === 'vi' ? '⏳ CHỜ CHUYỂN KHOẢN' : '⏳ PENDING')}
                  </span>
                </div>

                {/* Details Table */}
                <div className="key-details-summary" style={{ background: 'transparent', padding: '0', border: 'none' }}>
                  <div><span>Mã đơn:</span> <strong>{orderResult.id}</strong></div>
                  <div><span>Mã CK:</span> <code>{orderResult.paymentCode}</code></div>
                  <div><span>Số tiền:</span> <strong style={{ color: '#38bdf8' }}>{orderResult.amount.toLocaleString()} đ</strong></div>
                  {orderResult.durationDays && <div><span>Thời hạn:</span> <strong>{orderResult.durationDays} ngày</strong></div>}
                  {orderResult.createdAt && <div><span>Ngày tạo:</span> <span>{formatDateTime(orderResult.createdAt)}</span></div>}
                  {orderResult.status === 'PAID' && (
                    <div><span>Ngày TT:</span> <strong style={{ color: '#4ade80' }}>{formatDateTime(orderResult.paidAt || orderResult.createdAt)}</strong></div>
                  )}
                </div>

                {/* Status-specific Display */}
                {orderResult.status === 'PAID' ? (
                  <div className="delivered-key-box" style={{ marginTop: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--txt2)' }}>
                        {lang === 'vi' ? '🔑 KEY BẢN QUYỀN ĐÃ CẤP:' : '🔑 DELIVERED LICENSE KEY:'}
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleShowSecret(orderResult.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#38bdf8',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {showSecrets[orderResult.id] ? '👁️ Ẩn' : '🙈 Hiện'}
                      </button>
                    </div>
                    <div className="key-code-display">
                      <code>{showSecrets[orderResult.id] ? (orderResult.deliveredKey || 'VIP-KEY-DELIVERED') : '••••-••••-••••-••••'}</code>
                      <button
                        className="copy-key-btn"
                        onClick={() => copyToClipboard(orderResult.deliveredKey || '', 'Key VIP')}
                      >
                        📋 {lang === 'vi' ? 'SAO CHÉP' : 'COPY'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px dashed var(--border-dark)' }}>
                    <p style={{ fontSize: '13px', color: '#facc15', margin: '0 0 12px 0' }}>
                      ⚠️ {lang === 'vi' ? 'Đơn hàng này chưa ghi nhận thanh toán tự động.' : 'Order is pending payment.'}
                    </p>

                    {verifyMsg && (
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        fontSize: '13px',
                        marginBottom: '12px'
                      }}>
                        {verifyMsg}
                      </div>
                    )}

                    <button
                      className="confirm-paid-btn"
                      disabled={isVerifying}
                      onClick={handleVerify}
                      style={{ width: '100%', padding: '13px' }}
                    >
                      ⚡ {isVerifying
                        ? (lang === 'vi' ? 'ĐANG KIỂM TRA MÁY CHỦ API...' : 'CHECKING API...')
                        : (lang === 'vi' ? 'KÍCH HOẠT KIỂM TRA THANH TOÁN (LẤY KEY)' : 'VERIFY PAYMENT (GET KEY)')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '28px 20px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '16px',
                color: '#f87171'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>❌</div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#f87171', fontFamily: 'var(--font-heading)' }}>
                  {lang === 'vi' ? 'Không tìm thấy đơn hàng!' : 'Order Not Found!'}
                </h4>
                <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>
                  {lang === 'vi'
                    ? `Không tìm thấy đơn hàng với mã "${searchCode}" trên API máy chủ. Vui lòng kiểm tra lại mã!`
                    : `No order found for code "${searchCode}". Please check your code.`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 📜 SAVED LOCAL DEVICE ORDERS HISTORY SECTION */}
        {!hasSearched && (
          <div style={{ marginTop: '22px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-heading)' }}>
                📜 {lang === 'vi' ? `LỊCH SỬ ĐƠN HÀNG TRÊN MÁY NÀY (${localDeviceOrders.length})` : `DEVICE ORDER HISTORY (${localDeviceOrders.length})`}
              </h4>
              {localDeviceOrders.length > 0 && (
                <button
                  type="button"
                  onClick={clearLocalHistory}
                  style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                >
                  🗑 {lang === 'vi' ? 'Xóa lịch sử' : 'Clear'}
                </button>
              )}
            </div>

            {localDeviceOrders.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '24px 16px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                borderRadius: '14px',
                color: '#94a3b8'
              }}>
                <div style={{ fontSize: '28px', marginBottom: '6px' }}>📜</div>
                <p style={{ margin: 0, fontSize: '13px' }}>
                  {lang === 'vi'
                    ? 'Chưa có đơn hàng hoặc Key VIP nào được khởi tạo trên trình duyệt này. Sau khi mua hàng, thông tin sẽ tự động hiển thị tại đây!'
                    : 'No orders or VIP keys saved on this browser yet.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                {localDeviceOrders.map((o) => (
                  <div key={o.id} style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: o.status === 'PAID' ? 'rgba(15, 23, 42, 0.75)' : 'rgba(30, 41, 59, 0.5)',
                    border: o.status === 'PAID' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px dashed rgba(234, 179, 8, 0.4)',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <strong style={{ fontSize: '14.5px', color: '#f8fafc' }}>{o.appName}</strong>
                        <small style={{ display: 'block', fontSize: '11px', color: '#94a3b8' }}>
                          Mã đơn: {o.id} • {o.durationDays ? `${o.durationDays} ngày` : 'VIP'} • {o.paidAt || o.createdAt ? formatDateTime(o.paidAt || o.createdAt) : ''}
                        </small>
                      </div>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          background: o.status === 'PAID' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                          color: o.status === 'PAID' ? '#4ade80' : '#facc15',
                          border: o.status === 'PAID' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)'
                        }}
                      >
                        {o.status === 'PAID' ? '✓ ĐÃ THANH TOÁN' : '⏳ CHỜ CHUYỂN KHOẢN'}
                      </span>
                    </div>

                    {o.status === 'PAID' && o.deliveredKey ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                        <code style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '10px',
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: '1px solid rgba(56, 189, 248, 0.2)',
                          color: '#38bdf8',
                          fontFamily: 'monospace',
                          fontSize: '13.5px',
                          fontWeight: 'bold',
                          letterSpacing: '1px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {showSecrets[o.id] ? o.deliveredKey : '••••-••••-••••-••••'}
                        </code>
                        <button
                          type="button"
                          onClick={() => toggleShowSecret(o.id)}
                          style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          {showSecrets[o.id] ? '👁️ Ẩn' : '🙈 Hiện'}
                        </button>
                        <button
                          className="copy-key-btn"
                          onClick={() => copyToClipboard(o.deliveredKey || '', 'Key VIP')}
                          style={{ padding: '8px 14px', fontSize: '12px' }}
                        >
                          📋 {lang === 'vi' ? 'CHÉP' : 'COPY'}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: '12px', color: '#facc15' }}>
                          Mã CK: <code>{o.paymentCode}</code> • <strong>{o.amount.toLocaleString()} đ</strong>
                        </span>
                        <button
                          className="lookup-btn"
                          style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '8px' }}
                          onClick={() => {
                            setSearchCode(o.id || o.paymentCode);
                            handleLookup(o.id || o.paymentCode);
                          }}
                        >
                          ⚡ {lang === 'vi' ? 'Kiểm Tra / Lấy Key' : 'Check Key'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </ModalPortal>
  );
}


