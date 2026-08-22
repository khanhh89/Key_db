import { useState, useEffect } from 'react';
import { ModalPortal } from '../common/ModalPortal';
import type { AppItem, OrderItem, Language, LicenseKeyItem, BankConfig } from '../../types';
import {
  API_BASE_URL,
  createOrderInBackend,
  createPayosPaymentLinkInBackend,
  fetchBankConfigFromBackend,
  fetchKeysFromBackend,
  applyCouponInBackend,
  saveLocalOrder,
  formatDateTime,
  type PayosLinkData,
  type CouponApplyResult
} from '../../services/api';
import { copyTextToClipboard } from '../../utils/clipboard';

interface BuyKeyModalProps {
  app: AppItem;
  lang: Language;
  onClose: () => void;
  showToast: (msg: string) => void;
  initialOrder?: OrderItem | null;
}

export function BuyKeyModal({
  app,
  lang,
  onClose,
  showToast,
  initialOrder
}: BuyKeyModalProps) {
  const t = {
    title: lang === 'vi' ? 'MUA KEY BẢN QUYỀN' : 'BUY VIP KEY FOR',
    step1: lang === 'vi' ? '1. CHỌN GÓI BẢN QUYỀN VIP:' : '1. SELECT LICENSE PACKAGE:',
    step2: lang === 'vi' ? '2. THÔNG TIN CHUYỂN KHOẢN TỰ ĐỘNG (VIETQR / BANK):' : '2. AUTOMATED PAYMENT DETAILS (VIETQR / BANK):',
    yourKeyLabel: lang === 'vi' ? 'KEY BẢN QUYỀN CỦA BẠN:' : 'YOUR VIP LICENSE KEY:',
    copyBtn: lang === 'vi' ? 'SAO CHÉP' : 'COPY',
    paidSuccessTitle: lang === 'vi' ? 'THANH TOÁN THÀNH CÔNG!' : 'PAYMENT SUCCESSFUL!',
    bankNameLabel: lang === 'vi' ? 'Ngân hàng:' : 'Bank:',
    accNoLabel: lang === 'vi' ? 'Số tài khoản:' : 'Account No:',
    accNameLabel: lang === 'vi' ? 'Chủ tài khoản:' : 'Account Name:',
    amountLabel: lang === 'vi' ? 'Số tiền thanh toán:' : 'Total Amount:',
    codeReqLabel: lang === 'vi' ? 'Nội dung chuyển khoản (BẮT BUỘC):' : 'Transfer Code (REQUIRED):',
    copyCodeBtn: lang === 'vi' ? 'SAO CHÉP MÃ' : 'COPY CODE',
    awaitingBank: lang === 'vi' ? 'Đang chờ hệ thống Ngân hàng xác nhận giao dịch...' : 'Awaiting bank payment...',
    orderId: lang === 'vi' ? 'Mã đơn hàng:' : 'Order ID:',
    timeLabel: lang === 'vi' ? 'Thời gian:' : 'Time:'
  };

  const [bank, setBank] = useState<BankConfig>({
    bankId: 'MB',
    accountNo: '',
    accountName: '',
    payosClientId: '',
    payosApiKey: '',
    payosChecksumKey: '',
    payosEnabled: true,
    enableStaticQr: true
  });

  const [availableKeys, setAvailableKeys] = useState<LicenseKeyItem[]>([]);
  const [order, setOrder] = useState<OrderItem | null>(initialOrder || null);
  const [payosLink, setPayosLink] = useState<PayosLinkData | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isPayosLoading, setIsPayosLoading] = useState<boolean>(false);
  const [isQrImgLoaded, setIsQrImgLoaded] = useState<boolean>(false);
  const [qrFallbackIndex, setQrFallbackIndex] = useState<number>(0);
  const [qrImageFailed, setQrImageFailed] = useState<boolean>(false);
  const [showManualBankDetails, setShowManualBankDetails] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 minutes

  // Coupon Promo Code States
  const [couponCodeInput, setCouponCodeInput] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponApplyResult | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState<boolean>(false);
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [showKeySecret, setShowKeySecret] = useState<boolean>(true);

  const playSuccessChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      osc1.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.8);
      osc2.stop(ctx.currentTime + 0.8);
    } catch (e) {}
  };

  // Load bank details and DB keys on mount
  useEffect(() => {
    fetchBankConfigFromBackend().then((cfg) => {
      if (cfg) setBank(cfg);
    });
    fetchKeysFromBackend().then((allKeys) => {
      const appKeys = allKeys.filter((k) => k.appId === app.id);
      setAvailableKeys(appKeys);
    });
  }, [app.id]);

  // Compute dynamic package options from DB
  const getPackageOptions = () => {
    const defaultPackages = [
      { days: 1, label: lang === 'vi' ? '1 Ngày' : '1 Day', defaultPrice: 15000 },
      { days: 7, label: lang === 'vi' ? '7 Ngày' : '7 Days', defaultPrice: 35000 },
      { days: 30, label: lang === 'vi' ? '30 Ngày' : '30 Days', defaultPrice: 50000, isHot: true },
      { days: 365, label: lang === 'vi' ? '1 Năm' : '1 Year', defaultPrice: 350000 }
    ];

    const dbAvailable = availableKeys.filter((k) => k.status === 'AVAILABLE');
    const packageMap = new Map<number, { days: number; label: string; price: number; stock: number; isHot?: boolean }>();

    defaultPackages.forEach((pkg) => {
      const matchingDbKeys = dbAvailable.filter((k) => k.durationDays === pkg.days);
      if (matchingDbKeys.length > 0) {
        const realPrice = matchingDbKeys[0].price ? matchingDbKeys[0].price : pkg.defaultPrice;
        packageMap.set(pkg.days, {
          days: pkg.days,
          label: pkg.days >= 365 ? (lang === 'vi' ? '1 Năm / Vĩnh Viễn' : '1 Year / Lifetime') : `${pkg.days} ${lang === 'vi' ? 'Ngày' : 'Days'}`,
          price: realPrice,
          stock: matchingDbKeys.length,
          isHot: pkg.isHot
        });
      }
    });

    dbAvailable.forEach((key) => {
      const days = key.durationDays || 30;
      if (!packageMap.has(days)) {
        const matchingKeys = dbAvailable.filter((k) => k.durationDays === days);
        packageMap.set(days, {
          days,
          label: days >= 365 ? (lang === 'vi' ? 'Vĩnh Viễn' : 'Lifetime') : `${days} ${lang === 'vi' ? 'Ngày' : 'Days'}`,
          price: key.price || 50000,
          stock: matchingKeys.length,
          isHot: days === 30
        });
      }
    });

    return Array.from(packageMap.values()).sort((a, b) => a.days - b.days);
  };

  const packageOptions = getPackageOptions();

  // Real-Time Promo Coupon Application during Payment Step
  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setIsApplyingCoupon(true);
    const baseAmount = originalPrice > 0 ? originalPrice : (order ? order.amount : 50000);
    const result = await applyCouponInBackend(couponCodeInput.trim(), baseAmount, app.id);

    if (result.valid && result.finalAmount !== undefined) {
      setAppliedCoupon(result);
      const newAmount = result.finalAmount;

      if (order) {
        setOrder({
          ...order,
          amount: newAmount
        });

        // Reset QR image states & trigger reload with discounted price
        setIsQrImgLoaded(false);
        setQrFallbackIndex(0);
        setQrImageFailed(false);
        setPayosLink(null);

        if (bank.payosEnabled !== false) {
          setIsPayosLoading(true);
          const linkData = await createPayosPaymentLinkInBackend(order.id, newAmount);
          if (linkData) setPayosLink(linkData);
          setIsPayosLoading(false);
        }
      }
      showToast(result.message);
    } else {
      setAppliedCoupon(null);
      showToast(result.message);
    }
    setIsApplyingCoupon(false);
  };

  const handleRemoveCoupon = async () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    if (order && originalPrice > 0) {
      setOrder({
        ...order,
        amount: originalPrice
      });

      // Reset QR image states & trigger reload with original price
      setIsQrImgLoaded(false);
      setQrFallbackIndex(0);
      setQrImageFailed(false);
      setPayosLink(null);

      if (bank.payosEnabled !== false) {
        setIsPayosLoading(true);
        const linkData = await createPayosPaymentLinkInBackend(order.id, originalPrice);
        if (linkData) setPayosLink(linkData);
        setIsPayosLoading(false);
      }
    }
    showToast(lang === 'vi' ? 'Đã gỡ mã giảm giá' : 'Removed promo code');
  };

  const handleCreateOrder = async (days: number, basePrice: number) => {
    setOriginalPrice(basePrice);
    setIsCreating(true);

    if (bank.payosEnabled !== false) {
      setIsPayosLoading(true);
    }

    setIsQrImgLoaded(false);
    setQrFallbackIndex(0);
    setQrImageFailed(false);

    const newOrder = await createOrderInBackend(app.id, app.name, basePrice, days);
    setOrder(newOrder);
    setIsCreating(false);

    if (newOrder) {
      if (bank.payosEnabled !== false) {
        const linkData = await createPayosPaymentLinkInBackend(newOrder.id);
        if (linkData) setPayosLink(linkData);
      }
    }
    setIsPayosLoading(false);
    setTimeLeft(900);
  };

  // Auto fetch PayOS payment link for existing/created order if missing
  useEffect(() => {
    if (order && !payosLink && bank.payosEnabled !== false && order.status !== 'PAID' && !isPayosLoading) {
      setIsPayosLoading(true);
      createPayosPaymentLinkInBackend(order.id, order.amount)
        .then((linkData) => {
          if (linkData) setPayosLink(linkData);
        })
        .finally(() => setIsPayosLoading(false));
    }
  }, [order?.id, order?.amount, bank.payosEnabled]);

  // 15-minute auto cancellation countdown timer
  useEffect(() => {
    if (!order || order.status === 'PAID') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setOrder(null);
          showToast(
            lang === 'vi'
              ? '⏰ Đơn hàng đã tự động hủy do quá thời hạn 15 phút chưa chuyển khoản!'
              : 'Order expired (15 mins timeout)!'
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [order, lang, showToast]);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  // Auto save order to local storage whenever order is created or status updates
  useEffect(() => {
    if (order) {
      saveLocalOrder(order);
    }
  }, [order]);

  // Auto active polling order status every 2s & auto-next on payment success
  useEffect(() => {
    if (!order || order.status === 'PAID') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/orders/${order.id}/status`);
        if (res.status === 404) {
          clearInterval(interval);
          setOrder(null);
          showToast(lang === 'vi' ? '⏰ Đơn hàng đã được hệ thống tự động xóa do quá hạn 15 phút!' : 'Order expired!');
          return;
        }
        if (res.ok) {
          const updatedOrder: OrderItem = await res.json();
          if (updatedOrder && updatedOrder.status === 'PAID' && updatedOrder.deliveredKey) {
            setOrder(updatedOrder);
            saveLocalOrder(updatedOrder);
            clearInterval(interval);
            playSuccessChime();
            showToast(
              lang === 'vi'
                ? '🎉 Thanh toán thành công!'
                : 'Payment successful!'
            );
          }
        }
      } catch (err) {
        console.warn('Polling status check error', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [order, lang, showToast]);

  const copyToClipboard = async (text: string, label: string) => {
    if (!text) return;
    const success = await copyTextToClipboard(text);
    if (success) {
      showToast(lang === 'vi' ? `📋 Đã sao chép ${label} thành công!` : `📋 Copied ${label} successfully!`);
    }
  };

  // Determine current active order amount
  const currentAmount = order ? order.amount : 50000;

  const getQrImageUrl = () => {
    const activeBankId = bank.bankId || 'MB';
    const cleanAccountNo = bank.accountNo || '';
    const encodedName = encodeURIComponent(bank.accountName || '');
    const activeCode = order ? order.paymentCode : 'MK888';
    const encodedAddInfo = encodeURIComponent(activeCode);

    if (payosLink && (payosLink.qrCode || payosLink.rawQrCode)) {
      return payosLink.qrCode || payosLink.rawQrCode || '';
    }

    if (cleanAccountNo) {
      const formatTemplates = [
        `https://img.vietqr.io/image/${activeBankId}-${cleanAccountNo}-compact2.png?amount=${currentAmount}&addInfo=${encodedAddInfo}&accountName=${encodedName}`,
        `https://qr.sepay.vn/img?bank=${activeBankId}&acc=${cleanAccountNo}&template=compact&amount=${currentAmount}&des=${encodedAddInfo}`,
        `https://api.vietqr.io/image/${activeBankId}-${cleanAccountNo}-compact.png?amount=${currentAmount}&addInfo=${encodedAddInfo}&accountName=${encodedName}`
      ];
      return formatTemplates[qrFallbackIndex] || formatTemplates[0];
    }

    const rawInfo = `STK: ${bank.accountNo || 'MB Bank'}\nND: ${activeCode}\nSo tien: ${currentAmount}`;
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(rawInfo)}&size=300x300`;
  };

  const handleQrError = () => {
    if (payosLink && (payosLink.qrCode || payosLink.rawQrCode)) {
      const rawText = payosLink.rawQrCode || payosLink.qrCode;
      if (rawText && !rawText.includes('quickchart.io')) {
        const rawString = rawText.includes('data=') ? decodeURIComponent(rawText.split('data=')[1]?.split('&')[0] || '') : rawText;
        if (rawString && !rawString.startsWith('http')) {
          setPayosLink({
            ...payosLink,
            qrCode: `https://quickchart.io/qr?text=${encodeURIComponent(rawString)}&size=300`
          });
          setIsQrImgLoaded(false);
          return;
        }
      }
    }

    if (payosLink && qrFallbackIndex === 0) {
      setPayosLink(null);
      setIsQrImgLoaded(false);
      return;
    }
    if (qrFallbackIndex < 2) {
      setQrFallbackIndex((prev) => prev + 1);
      setIsQrImgLoaded(false);
    } else {
      setQrImageFailed(true);
    }
  };

  const qrImageSrc = getQrImageUrl();

  return (
    <ModalPortal>
      <div className="sub-modal-overlay" onClick={onClose}>
        <div className="buy-key-modal-card" onClick={(e) => e.stopPropagation()}>
          <button className="close" onClick={onClose}>
            ×
          </button>

          <div className="buy-key-header">
            <h3>🛒 {t.title} {app.name}</h3>
          </div>

        {!order ? (
          /* Package Selection Step - Clean & Direct */
          <div className="package-selection-step">
            <label className="step-label">{t.step1}</label>
            {packageOptions.length === 0 ? (
              <div className="out-of-stock-notice-box" style={{
                textAlign: 'center',
                padding: '24px 16px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px dashed rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                color: '#f87171',
                margin: '12px 0'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 'bold' }}>
                  {lang === 'vi' ? 'Sản Phẩm Đang Hết Hàng Key' : 'Keys Out of Stock'}
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--txt2)' }}>
                  {lang === 'vi'
                    ? 'Hiện tại các gói Key cho ứng dụng này đã hết hàng trong kho. Vui lòng quay lại sau!'
                    : 'All key packages for this application are currently out of stock. Please try again later!'}
                </p>
              </div>
            ) : (
              <div className="packages-grid">
                {packageOptions.map((pkg) => (
                  <button
                    key={pkg.days}
                    className="package-card"
                    disabled={isCreating}
                    onClick={() => handleCreateOrder(pkg.days, pkg.price)}
                  >
                    {pkg.isHot && <div className="pkg-badge">HOT</div>}
                    <div className="pkg-days">{pkg.label}</div>
                    <div className="pkg-price">{pkg.price.toLocaleString()} đ</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : order.status === 'PAID' && order.deliveredKey ? (
          /* Key Delivered Success Step - 100-Year Masterpiece UI */
          <div className="key-delivered-step" style={{ padding: '4px 0' }}>
            <div className="success-banner" style={{
              textAlign: 'center',
              padding: '20px 16px',
              borderRadius: '16px',
              background: 'radial-gradient(circle at center, rgba(34, 197, 94, 0.15), rgba(15, 23, 42, 0.6))',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              marginBottom: '16px',
              boxShadow: '0 10px 30px rgba(34, 197, 94, 0.15)'
            }}>
              <div className="success-icon" style={{ fontSize: '42px', marginBottom: '8px', filter: 'drop-shadow(0 0 12px rgba(34, 197, 94, 0.5))' }}>
                🏆
              </div>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#4ade80', fontFamily: 'var(--font-heading)' }}>
                {t.paidSuccessTitle}
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--txt2)' }}>
                {lang === 'vi' ? 'Mã bản quyền VIP đã kích hoạt' : 'VIP License key fulfilled & delivered!'}
              </p>
            </div>

            <div className="delivered-key-box" style={{
              padding: '16px',
              borderRadius: '16px',
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--txt2)' }}>{t.yourKeyLabel}</label>
                <button
                  type="button"
                  onClick={() => setShowKeySecret(!showKeySecret)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#38bdf8',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {showKeySecret ? '👁️ ' + (lang === 'vi' ? 'Ẩn Key' : 'Hide') : '🙈 ' + (lang === 'vi' ? 'Hiện Key' : 'Show')}
                </button>
              </div>

              <div className="key-code-display" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <code
                  onClick={() => copyToClipboard(order.deliveredKey!, 'Key VIP')}
                  title={lang === 'vi' ? 'Ấn để sao chép Key VIP' : 'Click to copy VIP Key'}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    color: '#38bdf8',
                    fontFamily: 'monospace',
                    fontSize: '15px',
                    fontWeight: 'bold',
                    letterSpacing: '1px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                  }}>
                  {showKeySecret ? order.deliveredKey : '••••-••••-••••-••••'}
                </code>
                <button
                  className="copy-key-btn"
                  onClick={() => copyToClipboard(order.deliveredKey!, 'Key VIP')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                    color: '#050811',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 14px rgba(0, 242, 254, 0.35)'
                  }}
                >
                  📋 {t.copyBtn}
                </button>
              </div>
            </div>

            {/* Direct 1-Touch Download Buttons */}
            {(app.ipaUrl || app.downloadUrl) && (
              <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {app.ipaUrl && (
                  <a
                    href={app.ipaUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      flex: 1,
                      minWidth: '140px',
                      padding: '13px 16px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                      color: '#ffffff',
                      textDecoration: 'none',
                      fontWeight: 'bold',
                      fontSize: '13.5px',
                      textAlign: 'center',
                      boxShadow: '0 6px 20px rgba(2, 132, 199, 0.4)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    🍎 TẢI MOD iOS (IPA) ➔
                  </a>
                )}
                {app.downloadUrl && (
                  <a
                    href={app.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      flex: 1,
                      minWidth: '140px',
                      padding: '13px 16px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #059669, #34d399)',
                      color: '#ffffff',
                      textDecoration: 'none',
                      fontWeight: 'bold',
                      fontSize: '13.5px',
                      textAlign: 'center',
                      boxShadow: '0 6px 20px rgba(5, 150, 105, 0.4)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    🤖 TẢI MOD ANDROID (APK) ➔
                  </a>
                )}
              </div>
            )}

            <div className="order-details-mini" style={{
              marginTop: '16px',
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div>
                <span>{t.orderId}</span> <strong>{order.id}</strong>
              </div>
              <div>
                <span>{t.amountLabel}</span> <strong style={{ color: '#38bdf8' }}>{order.amount.toLocaleString()} đ</strong>
              </div>
              <div>
                <span>{t.timeLabel}</span>{' '}
                <strong>{formatDateTime(order.paidAt || order.createdAt)}</strong>
              </div>
            </div>

            <button
              className="finish-btn"
              onClick={onClose}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '14px',
                borderRadius: '14px',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              ✓ {lang === 'vi' ? 'HOÀN THÀNH - ĐÓNG CỬA SỔ' : 'DONE - CLOSE'}
            </button>
          </div>
        ) : (
          /* QR Payment Step with Compact Promo Coupon Field */
          <div className="qr-payment-step">
            <div className="qr-grid">
              <div className="qr-code-box">
                {/* PAYOS QR LOADING OR QR CODE DISPLAY */}
                {isPayosLoading ? (
                  <div className="payos-qr-loading-box">
                    <div className="qr-spinner-ring" />
                  </div>
                ) : (
                  <div className="qr-image-wrapper">
                    {!isQrImgLoaded && !qrImageFailed && (
                      <div className="qr-skeleton-shimmer">
                        <div className="qr-spinner-ring" />
                      </div>
                    )}
                    {!qrImageFailed ? (
                      <img
                        src={qrImageSrc}
                        alt="VietQR Payment Code"
                        onLoad={() => setIsQrImgLoaded(true)}
                        onError={handleQrError}
                        style={{ display: isQrImgLoaded ? 'block' : 'none' }}
                      />
                    ) : (
                      <div className="qr-failed-box">
                        <span>⚠️ Không thể tải hình QR</span>
                        <small>Vui lòng chuyển khoản theo thông tin bên dưới</small>
                      </div>
                    )}
                  </div>
                )}
                <small className="qr-tip">{lang === 'vi' ? 'Quét QR bằng App Ngân hàng bất kỳ' : 'Scan QR with Bank App'}</small>
              </div>

              <div className="bank-info-box">
                <div className="info-row">
                  <span>{t.amountLabel}</span>
                  <strong className="highlight-price">{currentAmount.toLocaleString()} đ</strong>
                </div>

                <div className="info-row highlight-row">
                  <span>{t.codeReqLabel}</span>
                  <div className="code-copy-wrap">
                    <code className="transfer-code">{order.paymentCode}</code>
                    <button
                      className="copy-code-btn"
                      onClick={() => copyToClipboard(order.paymentCode, 'Mã chuyển khoản')}
                    >
                      📋 {t.copyCodeBtn}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="toggle-manual-bank-btn"
                  onClick={() => setShowManualBankDetails((prev) => !prev)}
                >
                  {showManualBankDetails
                    ? (lang === 'vi' ? '▲ Thu gọn thông tin tài khoản' : '▲ Hide Manual Bank Info')
                    : (lang === 'vi' ? '📋 Xem STK & Ngân hàng thủ công' : '📋 Show Manual Bank Info')}
                </button>

                {showManualBankDetails && (
                  <div className="manual-bank-details-expand">
                    <div className="info-row">
                      <span>{t.bankNameLabel}</span>
                      <strong>{bank.bankId || 'MB Bank'}</strong>
                    </div>

                    <div className="info-row">
                      <span>{t.accNoLabel}</span>
                      <div className="code-copy-wrap" style={{ gap: '6px' }}>
                        <strong>{bank.accountNo || '-'}</strong>
                        {bank.accountNo && (
                          <button
                            className="copy-code-btn"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => copyToClipboard(bank.accountNo, 'Số tài khoản')}
                          >
                            📋 {t.copyBtn}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="info-row">
                      <span>{t.accNameLabel}</span>
                      <strong>{bank.accountName || '-'}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ULTRA COMPACT 1-LINE PROMO COUPON STRIP */}
            <div className="coupon-inline-strip">
              <span className="coupon-inline-label">🎁 {lang === 'vi' ? 'Mã giảm giá:' : 'Promo Code:'}</span>
              <input
                type="text"
                className="coupon-inline-input"
                value={couponCodeInput}
                onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                disabled={Boolean(appliedCoupon)}
              />
              {appliedCoupon ? (
                <button
                  type="button"
                  className="coupon-inline-btn remove"
                  onClick={handleRemoveCoupon}
                >
                  ✕ {lang === 'vi' ? 'Gỡ' : 'Remove'}
                </button>
              ) : (
                <button
                  type="button"
                  className="coupon-inline-btn apply"
                  onClick={handleApplyCoupon}
                  disabled={isApplyingCoupon || !couponCodeInput.trim()}
                >
                  {isApplyingCoupon ? '...' : (lang === 'vi' ? 'ÁP DỤNG' : 'APPLY')}
                </button>
              )}
            </div>
            {appliedCoupon && (
              <div className="coupon-inline-success">
                <span>✓ {appliedCoupon.message}</span>
              </div>
            )}

            <div className="polling-status-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span className="spin-dot">●</span>{' '}
                {lang === 'vi' ? '⚡ Đang tự động kiểm tra giao dịch...' : t.awaitingBank}
              </div>
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                ⏰ {lang === 'vi' ? 'Hủy sau:' : 'Expires in:'} {formatCountdown(timeLeft)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </ModalPortal>
  );
}
