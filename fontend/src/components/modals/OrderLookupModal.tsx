import { useState } from 'react';
import type { OrderItem, Language } from '../../types';
import { fetchOrderStatusFromBackend, verifyCustomerPaymentInBackend, formatDateTime, trackClientEvent } from '../../services/api';

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
        // Save to recent lookup history in client-side localStorage (only visible to this browser/device)
        const existing = JSON.parse(localStorage.getItem('modlienquan_recent_orders') || '[]');
        const updated = Array.from(new Set([order.id, order.paymentCode, ...existing])).slice(0, 5);
        localStorage.setItem('modlienquan_recent_orders', JSON.stringify(updated));
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
    } else {
      setVerifyMsg(res.message || (lang === 'vi' ? 'Hệ thống chưa ghi nhận tiền trong tài khoản.' : 'Payment not recorded yet.'));
    }
    setIsVerifying(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(lang === 'vi' ? `Đã sao chép ${label}!` : `Copied ${label}!`);
  };

  const recentCodes: string[] = JSON.parse(localStorage.getItem('modlienquan_recent_orders') || '[]');

  return (
    <div className="sub-modal-overlay" onClick={onClose}>
      <div className="buy-key-modal-card lookup-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Close modal">
          ×
        </button>

        <div className="buy-key-header">
          <h3>🔍 {lang === 'vi' ? 'Tra Cứu Đơn Hàng' : 'Check Order Status'}</h3>
          <p className="subtitle-desc" style={{ fontSize: '13px', color: 'var(--text-muted-dark)', marginTop: '4px' }}>
            {lang === 'vi'
              ? 'Nhập Mã Đơn Hàng (ORD-xxxxx) hoặc Mã Chuyển Khoản (MKxxxxx) để kiểm tra trạng thái và nhận Key'
              : 'Enter Order ID (ORD-xxxxx) or Payment Code (MKxxxxx) to check status & retrieve key'}
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

        {/* Recent Search Chips (Client Local Storage Only) */}
        {recentCodes.length > 0 && !hasSearched && (
          <div style={{ marginTop: '14px' }}>
            <span style={{ fontSize: '12px', opacity: 0.7, fontWeight: 500 }}>
              {lang === 'vi' ? 'Mã tra cứu gần đây (trên máy bạn):' : 'Recent lookups (this device):'}
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
                    <label>{lang === 'vi' ? '🔑 KEY BẢN QUYỀN ĐÃ CẤP:' : '🔑 DELIVERED LICENSE KEY:'}</label>
                    <div className="key-code-display" style={{ marginTop: '8px' }}>
                      <code>{orderResult.deliveredKey || 'VIP-KEY-DELIVERED'}</code>
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
      </div>
    </div>
  );
}
