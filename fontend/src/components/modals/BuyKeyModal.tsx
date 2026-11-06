import { useState, useEffect, useRef } from 'react';
import { ModalPortal } from '../common/ModalPortal';
import type { AppItem, OrderItem, Language, LicenseKeyItem, BankConfig, KeyPricePreset } from '../../types';
import {
  API_BASE_URL,
  createOrderInBackend,
  createPayosPaymentLinkInBackend,
  fetchBankConfigFromBackend,
  fetchKeysFromBackend,
  fetchPricePresetsFromBackend,
  applyCouponInBackend,
  releaseCouponInBackend,
  saveLocalOrder,
  formatDateTime,
  trackClientEvent,
  updateOrderEmailInBackend,
  resendOrderEmailInBackend,
  type PayosLinkData,
  type CouponApplyResult
} from '../../services/api';
import { copyTextToClipboard } from '../../utils/clipboard';
import { isKeyBelongToApp } from '../../utils/keyUtils';
import { verifyCustomerPaymentInBackend } from '../../services/ordersApi';
import { parseVietQrEmvCo, buildVietQrDeeplink } from '../../utils/bankUtils';
import { getFlashSaleOriginalPrice } from '../../utils/flashSale';

const COMMON_BANKS = [
  { id: 'mb', name: 'MB Bank', shortName: 'MB', color: '#1B1464' },
  { id: 'vcb', name: 'Vietcombank', shortName: 'VCB', color: '#74B14C' },
  { id: 'bidv', name: 'BIDV', shortName: 'BIDV', color: '#00558F' },
  { id: 'icb', name: 'VietinBank', shortName: 'CTG', color: '#0067B1' },
  { id: 'tcb', name: 'Techcombank', shortName: 'TCB', color: '#E12017' },
  { id: 'acb', name: 'ACB', shortName: 'ACB', color: '#005DAB' },
  { id: 'vpb', name: 'VPBank', shortName: 'VPB', color: '#00904C' },
  { id: 'tpb', name: 'TPBank', shortName: 'TPB', color: '#7E2B7D' },
  { id: 'vba', name: 'Agribank', shortName: 'VBA', color: '#C8102E' },
  { id: 'stb', name: 'Sacombank', shortName: 'STB', color: '#004A99' },
  { id: 'msb', name: 'MSB Bank', shortName: 'MSB', color: '#EB6909' },
  { id: 'ocb', name: 'OCB Bank', shortName: 'OCB', color: '#008738' },
  { id: 'shb', name: 'SHB Bank', shortName: 'SHB', color: '#F26522' },
  { id: 'hdb', name: 'HDBank', shortName: 'HDB', color: '#DA251C' },
  { id: 'lpb', name: 'LPBank', shortName: 'LPB', color: '#F58220' },
  { id: 'vib', name: 'VIB Bank', shortName: 'VIB', color: '#00529C' },
  { id: 'momo', name: 'MoMo', shortName: 'MoMo', color: '#A50064', isWallet: true },
  { id: 'zalopay', name: 'ZaloPay', shortName: 'ZaloPay', color: '#008FE5', isWallet: true },
  { id: 'viettelmoney', name: 'Viettel Money', shortName: 'Viettel', color: '#EE0033', isWallet: true },
];

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
  const [pricePresets, setPricePresets] = useState<KeyPricePreset[]>([]);
  const [order, setOrder] = useState<OrderItem | null>(initialOrder || null);
  const [payosLink, setPayosLink] = useState<PayosLinkData | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isPayosLoading, setIsPayosLoading] = useState<boolean>(false);
  const [isQrImgLoaded, setIsQrImgLoaded] = useState<boolean>(false);
  const [qrFallbackIndex, setQrFallbackIndex] = useState<number>(0);
  const [qrImageFailed, setQrImageFailed] = useState<boolean>(false);
  const [showManualBankDetails, setShowManualBankDetails] = useState<boolean>(false);
  const [isVerifyingManual, setIsVerifyingManual] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 minutes
  const [showBankSelector, setShowBankSelector] = useState<boolean>(false);
  const [bankSearchQuery, setBankSearchQuery] = useState<string>('');

  // Coupon Promo Code States & Refs for Auto-Release Cleanup
  const [couponCodeInput, setCouponCodeInput] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponApplyResult | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState<boolean>(false);
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [showKeySecret, setShowKeySecret] = useState<boolean>(true);

  // Email VIP Key Delivery States
  const [customerEmail, setCustomerEmail] = useState<string>(() => {
    try {
      return localStorage.getItem('modlienquan_customer_email') || initialOrder?.customerEmail || '';
    } catch {
      return initialOrder?.customerEmail || '';
    }
  });
  const [emailEditInput, setEmailEditInput] = useState<string>('');
  const [showEmailEdit, setShowEmailEdit] = useState<boolean>(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState<boolean>(false);
  const [isResendingEmail, setIsResendingEmail] = useState<boolean>(false);

  const activeCouponCodeRef = useRef<string | null>(null);
  const isOrderPaidRef = useRef<boolean>(false);
  const hasWarned2MinRef = useRef<boolean>(false);

  useEffect(() => {
    activeCouponCodeRef.current = appliedCoupon?.code || null;
  }, [appliedCoupon]);

  useEffect(() => {
    isOrderPaidRef.current = order?.status === 'PAID';
    hasWarned2MinRef.current = false;
  }, [order?.status, order?.id]);

  // Clean up coupon usage count if modal is unmounted without completing payment
  useEffect(() => {
    return () => {
      if (activeCouponCodeRef.current && !isOrderPaidRef.current) {
        releaseCouponInBackend(activeCouponCodeRef.current);
      }
    };
  }, []);

  const handleCloseModal = async () => {
    if (order && order.status !== 'PAID') {
      trackClientEvent('CLIENT_CHECKOUT_ABANDONED', `Khách đóng modal khi đang chờ thanh toán đơn [${order.id}] cho app [${app.name}].`);
    }
    if (appliedCoupon && appliedCoupon.code && order?.status !== 'PAID') {
      await releaseCouponInBackend(appliedCoupon.code, order?.id);
      setAppliedCoupon(null);
    }
    // Khi người dùng chủ động đóng modal key đã mua (qua nút x hoặc nút hoàn thành):
    localStorage.removeItem('modlienquan_active_paid_order');
    onClose();
  };

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

  // Load bank details, DB keys, and restore applied coupon status on mount
  useEffect(() => {
    const activeOrder = order || initialOrder;
    if (activeOrder) {
      const basePrice = activeOrder.originalAmount || activeOrder.amount;
      if (basePrice) setOriginalPrice(basePrice);

      if (activeOrder.couponCode && !appliedCoupon) {
        setCouponCodeInput(activeOrder.couponCode);
        setAppliedCoupon({
          valid: true,
          code: activeOrder.couponCode,
          discountAmount: activeOrder.discountAmount || 0,
          finalAmount: activeOrder.amount,
          message: lang === 'vi'
            ? `🎉 Mã giảm giá [${activeOrder.couponCode}] đã áp dụng!`
            : `Promo code [${activeOrder.couponCode}] applied!`
        });
      }
    }
    fetchBankConfigFromBackend().then((cfg) => {
      console.log('🏦 [BuyKeyModal] BankConfig loaded from API:', cfg);
      if (cfg) setBank(cfg);
    });
    fetchKeysFromBackend().then((allKeys) => {
      console.log('🔑 [BuyKeyModal] Total keys in DB:', allKeys.length);
      const appKeys = allKeys.filter((k) => isKeyBelongToApp(k, app.id));
      console.log(`🔑 [BuyKeyModal] Keys matching app [${app.name}] (ID: ${app.id}):`, appKeys);
      setAvailableKeys(appKeys);
      const availCount = appKeys.filter((k) => k.status === 'AVAILABLE').length;
      if (availCount === 0) {
        trackClientEvent('CLIENT_KEY_OUT_OF_STOCK', `Khách xem mua app [${app.name}] nhưng kho hiện đã hết key.`);
      }
    });
    // Fetch price presets — used as authoritative price source (overrides per-key price)
    fetchPricePresetsFromBackend().then((data) => {
      if (data && data.length > 0) {
        console.log('💰 [BuyKeyModal] Price presets loaded:', data);
        setPricePresets(data);
      }
    });
  }, [app.id, initialOrder, order?.id]);

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

    // Get authoritative price: preset price > key price in DB > fallback default
    // Preset is always up-to-date (admin edits it), so it takes priority
    const getAuthorativePrice = (days: number, keyPrice: number | undefined | null, fallback: number): number => {
      const preset = pricePresets.find((p) => p.durationDays === days);
      if (preset && preset.price) return preset.price;
      if (keyPrice) return keyPrice;
      return fallback;
    };

    defaultPackages.forEach((pkg) => {
      const matchingDbKeys = dbAvailable.filter((k) => k.durationDays === pkg.days);
      if (matchingDbKeys.length > 0) {
        const realPrice = getAuthorativePrice(pkg.days, matchingDbKeys[0].price, pkg.defaultPrice);
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
        const realPrice = getAuthorativePrice(days, key.price, 50000);
        packageMap.set(days, {
          days,
          label: days >= 365 ? (lang === 'vi' ? 'Vĩnh Viễn' : 'Lifetime') : `${days} ${lang === 'vi' ? 'Ngày' : 'Days'}`,
          price: realPrice,
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

    const targetOrder = order || initialOrder;

    // If another coupon was previously applied, release it first
    if (appliedCoupon && appliedCoupon.code) {
      await releaseCouponInBackend(appliedCoupon.code, targetOrder?.id);
      setAppliedCoupon(null);
    }

    const baseAmount = targetOrder?.originalAmount && targetOrder.originalAmount > 0
      ? targetOrder.originalAmount
      : (originalPrice > 0 ? originalPrice : (targetOrder ? targetOrder.amount : 50000));

    const result = await applyCouponInBackend(couponCodeInput.trim(), baseAmount, app.id, targetOrder?.id);

    if (result.valid && result.finalAmount !== undefined) {
      setAppliedCoupon(result);
      const newAmount = result.finalAmount;

      if (targetOrder) {
        const updatedOrder: OrderItem = {
          ...targetOrder,
          amount: newAmount,
          originalAmount: baseAmount,
          couponCode: result.code,
          discountAmount: result.discountAmount
        };
        setOrder(updatedOrder);

        // Reset QR image states & trigger reload with discounted price
        setIsQrImgLoaded(false);
        setQrFallbackIndex(0);
        setQrImageFailed(false);
        setPayosLink(null);

        if (bank.payosEnabled !== false) {
          setIsPayosLoading(true);
          const linkData = await createPayosPaymentLinkInBackend(targetOrder.id, newAmount);
          if (linkData) setPayosLink(linkData);
          setIsPayosLoading(false);
        }
      }
      showToast(result.message);
    } else {
      setAppliedCoupon(null);
      trackClientEvent('CLIENT_COUPON_FAIL', `Khách áp dụng mã [${couponCodeInput.trim()}] thất bại: ${result.message}`);
      showToast(result.message);
    }
    setIsApplyingCoupon(false);
  };

  const handleRemoveCoupon = async () => {
    const targetOrder = order || initialOrder;
    if (appliedCoupon && appliedCoupon.code) {
      await releaseCouponInBackend(appliedCoupon.code, targetOrder?.id);
    }
    setAppliedCoupon(null);
    setCouponCodeInput('');

    const baseAmount = targetOrder?.originalAmount && targetOrder.originalAmount > 0
      ? targetOrder.originalAmount
      : (originalPrice > 0 ? originalPrice : 50000);

    if (targetOrder) {
      const updatedOrder: OrderItem = {
        ...targetOrder,
        amount: baseAmount,
        originalAmount: baseAmount,
        couponCode: undefined,
        discountAmount: undefined
      };
      setOrder(updatedOrder);

      // Reset QR image states & trigger reload with original price
      setIsQrImgLoaded(false);
      setQrFallbackIndex(0);
      setQrImageFailed(false);
      setPayosLink(null);

      if (bank.payosEnabled !== false) {
        setIsPayosLoading(true);
        const linkData = await createPayosPaymentLinkInBackend(targetOrder.id, baseAmount);
        if (linkData) setPayosLink(linkData);
        setIsPayosLoading(false);
      }
    }
    showToast(lang === 'vi' ? 'Đã gỡ mã giảm giá' : 'Removed promo code');
  };

  const handleSaveEmailForOrder = async (override?: string) => {
    const emailToSave = (override !== undefined ? override : emailEditInput).trim().toLowerCase();
    if (!emailToSave || !emailToSave.includes('@') || !emailToSave.includes('.')) {
      showToast(lang === 'vi' ? '⚠️ Vui lòng nhập địa chỉ Gmail/Email hợp lệ!' : '⚠️ Please enter a valid email address!');
      return;
    }
    setIsSubmittingEmail(true);
    try {
      localStorage.setItem('modlienquan_customer_email', emailToSave);
      setCustomerEmail(emailToSave);

      if (order) {
        const updated = await updateOrderEmailInBackend(order.id, emailToSave);
        if (updated) {
          setOrder(updated);
          showToast(lang === 'vi' ? `✓ Đã lưu Gmail nhận Key: ${emailToSave}` : `✓ Saved delivery email: ${emailToSave}`);
        } else {
          setOrder({ ...order, customerEmail: emailToSave });
          showToast(lang === 'vi' ? `✓ Đã cập nhật email: ${emailToSave}` : `✓ Updated email: ${emailToSave}`);
        }
      } else {
        showToast(lang === 'vi' ? `✓ Đã lưu email: ${emailToSave}` : `✓ Saved email: ${emailToSave}`);
      }
      setShowEmailEdit(false);
      setEmailEditInput('');
    } catch (err) {
      console.warn('Error saving email', err);
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const handleResendKeyEmail = async (overrideEmail?: string) => {
    if (!order) return;
    setIsResendingEmail(true);
    showToast(lang === 'vi' ? '⚡ Đang gửi Key về Gmail...' : 'Sending key to Gmail...');
    try {
      const targetEmail = (overrideEmail || order.customerEmail || customerEmail || '').trim().toLowerCase();
      const res = await resendOrderEmailInBackend(order.id, targetEmail || undefined);
      if (res.success) {
        if (res.order) setOrder(res.order);
        showToast(res.message || (lang === 'vi' ? '✓ Đã gửi Key VIP về Gmail thành công!' : 'VIP Key sent to Gmail!'));
      } else {
        showToast(res.message || (lang === 'vi' ? '⚠️ Gửi email chưa hoàn tất' : 'Failed to send email'));
      }
    } catch (err) {
      showToast(lang === 'vi' ? '⚠️ Lỗi khi gửi lại email' : 'Error resending email');
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleDownloadKeyTxt = () => {
    if (!order || !order.deliveredKey) return;
    const content = `=====================================================
⚡ BẢN QUYỀN VIP - ${app.name.toUpperCase()}
=====================================================
Mã Đơn Hàng    : #${order.id}
Ứng Dụng       : ${order.appName || app.name}
Thời Hạn Gói   : ${order.durationDays ? (order.durationDays >= 365 ? '1 Năm (Vĩnh Viễn)' : order.durationDays + ' Ngày VIP') : '30 Ngày VIP'}
Mã Key VIP     : ${order.deliveredKey}
Số Tiền        : ${(order.amount || 0).toLocaleString()} đ
Mã Chuyển Khoản: ${order.paymentCode}
Trạng Thái     : ĐÃ THANH TOÁN THÀNH CÔNG
Email Nhận Key : ${order.customerEmail || customerEmail || 'N/A'}
Thời Gian TT   : ${formatDateTime(order.paidAt || order.createdAt)}
=====================================================
3 BƯỚC KÍCH HOẠT NHANH:
1. Cài đặt bản hack/mod game từ website.
2. Mở ứng dụng, vào mục "Kích Hoạt Bản Quyền VIP".
3. Dán chính xác mã Key VIP bên trên để kích hoạt đầy đủ đặc quyền 24/7.
=====================================================
Chính sách: Bảo hành 100% trọn đời gói. Tuyệt đối không chia sẻ mã Key!
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KEY_VIP_${app.name.replace(/[^a-zA-Z0-9]/g, '_')}_${order.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(lang === 'vi' ? '💾 Đã tải file sao lưu Key VIP về máy!' : 'Downloaded key backup file!');
  };

  const handleCreateOrder = async (days: number, basePrice: number) => {
    if (appliedCoupon && appliedCoupon.code) {
      await releaseCouponInBackend(appliedCoupon.code, order?.id);
      setAppliedCoupon(null);
      setCouponCodeInput('');
    }
    setOriginalPrice(basePrice);
    setIsCreating(true);

    if (bank.payosEnabled !== false) {
      setIsPayosLoading(true);
    }

    setIsQrImgLoaded(false);
    setQrFallbackIndex(0);
    setQrImageFailed(false);

    const cleanEmail = customerEmail.trim();
    if (cleanEmail) {
      localStorage.setItem('modlienquan_customer_email', cleanEmail);
    }

    const newOrder = await createOrderInBackend(app.id, app.name, basePrice, days, cleanEmail || undefined);
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
    hasWarned2MinRef.current = false;
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

  // 15-minute auto cancellation countdown timer with 2-minute push/toast notification
  useEffect(() => {
    if (!order || order.status === 'PAID') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        // Trigger 2-Minute Urgent Warning Notification
        if (prev <= 120 && prev > 1 && !hasWarned2MinRef.current) {
          hasWarned2MinRef.current = true;

          // 1. Toast Notification
          showToast(
            lang === 'vi'
              ? '⚠️ SẮP HẾT HẠN: Chỉ còn 2 phút để hoàn tất chuyển khoản VietQR giữ đơn hàng!'
              : '⚠️ PAYMENT EXPIRING: Only 2 minutes left to complete VietQR transfer!'
          );

          // 2. Audio Chime (Web Audio API synthetic notification chime)
          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              const ctx = new AudioContextClass();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.setValueAtTime(520, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
              gain.gain.setValueAtTime(0.18, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.5);
            }
          } catch (ignored) {}

          // 3. Browser Push / Desktop Notification (if permitted)
          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              try {
                new Notification('⚠️ Sắp hết hạn thanh toán VietQR!', {
                  body: lang === 'vi'
                    ? `Đơn hàng [${order?.appName || 'App VIP'}] chỉ còn 2 phút để thanh toán!`
                    : `Your order has only 2 minutes left to complete payment!`,
                  icon: '/favicon.ico'
                });
              } catch (ignored) {}
            } else if (Notification.permission === 'default') {
              Notification.requestPermission().catch(() => {});
            }
          }
        }

        if (prev <= 1) {
          clearInterval(timer);
          trackClientEvent('CLIENT_PAYMENT_TIMEOUT', `Đơn hàng [${order.id}] mua app [${app.name}] tự hủy do quá hạn 15 phút chưa thanh toán.`);
          if (activeCouponCodeRef.current && !isOrderPaidRef.current) {
            releaseCouponInBackend(activeCouponCodeRef.current);
            setAppliedCoupon(null);
          }
          setOrder(null);
          showToast(
            lang === 'vi'
              ? '⏰ Đơn hàng đã tự động hủy do quá thời hạn 15 phút chưa chuyển khoản!'
              : 'Order expired (15 mins timeout)!'
          );

          // Browser Push Notification on expiration
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('⏰ Đơn hàng đã hết hạn!', {
                body: lang === 'vi'
                  ? `Đơn hàng [${app.name}] đã hết hạn và tự động hủy.`
                  : `Order expired (15 mins timeout).`,
                icon: '/favicon.ico'
              });
            } catch (ignored) {}
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [order, lang, showToast, app.name]);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  // Sync initialOrder if updated from outside (e.g. reload or PayOS callback)
  useEffect(() => {
    if (initialOrder) {
      setOrder(initialOrder);
      if (initialOrder.status === 'PAID' && initialOrder.deliveredKey) {
        localStorage.setItem('modlienquan_active_paid_order', JSON.stringify(initialOrder));
      }
    }
  }, [initialOrder]);

  // Safety net: if order is PAID but deliveredKey is not populated yet, fetch immediately
  useEffect(() => {
    if (order && order.status === 'PAID' && !order.deliveredKey) {
      fetch(`${API_BASE_URL}/orders/${order.id}/status`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: OrderItem | null) => {
          if (data && data.deliveredKey) {
            setOrder(data);
            saveLocalOrder(data);
            localStorage.setItem('modlienquan_active_paid_order', JSON.stringify(data));
          }
        })
        .catch(() => {});
    }
  }, [order?.id, order?.status, order?.deliveredKey]);

  // Auto save order to local storage whenever order is created or status updates
  useEffect(() => {
    if (order) {
      saveLocalOrder(order);
      if (order.status === 'PAID' && order.deliveredKey) {
        localStorage.setItem('modlienquan_active_paid_order', JSON.stringify(order));
      }
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
            localStorage.setItem('modlienquan_active_paid_order', JSON.stringify(updatedOrder));
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

  const handleManualVerify = async () => {
    if (!order) return;
    setIsVerifyingManual(true);
    showToast(lang === 'vi' ? '⚡ Đang kiểm tra tiền về hệ thống...' : 'Checking payment status...');

    try {
      const res = await verifyCustomerPaymentInBackend(order.id);
      if (res.success && res.data && res.data.status === 'PAID' && res.data.deliveredKey) {
        setOrder(res.data);
        saveLocalOrder(res.data);
        localStorage.setItem('modlienquan_active_paid_order', JSON.stringify(res.data));
        playSuccessChime();
        showToast(lang === 'vi' ? '🎉 Thanh toán thành công! Đã nhận Key VIP.' : 'Payment verified! Key delivered.');
      } else {
        const msg = res.message || (lang === 'vi' ? `⏳ Hệ thống chưa nhận được tiền cho nội dung [${order.paymentCode}]. Vui lòng thử lại sau vài giây.` : 'Payment not recorded yet.');
        showToast(msg);
      }
    } catch (err) {
      showToast(lang === 'vi' ? '❌ Có lỗi xảy ra khi kiểm tra đơn hàng.' : 'Error checking order.');
    } finally {
      setIsVerifyingManual(false);
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

  const handleOverlayClick = () => {
    // Prevent closing modal when clicking outside if key payment is completed
    if (order && order.status === 'PAID') {
      showToast(lang === 'vi' ? '💡 Vui lòng bấm nút × ở góc trên để đóng cửa sổ Key VIP' : 'Please click × button to close VIP Key modal');
      return;
    }
    handleCloseModal();
  };

  const handleFastTransfer = () => {
    setBankSearchQuery('');
    setShowBankSelector(true);
  };

  const executeFastTransfer = (targetAppId: string) => {
    // 1. Primary source: PayOS API response data
    let accountNo = payosLink?.accountNumber || '';
    let bankIdOrBin = payosLink?.bin || bank.bankId || 'MB';
    let accountName = payosLink?.accountName || bank.accountName || '';
    let amount = payosLink?.amount || order?.amount || currentAmount;
    let paymentCode = order ? order.paymentCode : 'MK888';

    // 2. Parse EMVCo raw QR code payload if present
    const rawQr = payosLink?.rawQrCode || (payosLink?.qrCode && !payosLink.qrCode.startsWith('http') ? payosLink.qrCode : null);
    if (rawQr) {
      const parsed = parseVietQrEmvCo(rawQr);
      if (parsed.accountNumber) accountNo = parsed.accountNumber;
      if (parsed.bin) bankIdOrBin = parsed.bin;
      if (parsed.accountName) accountName = parsed.accountName;
      if (parsed.amount) amount = parsed.amount;
      if (parsed.paymentCode) paymentCode = parsed.paymentCode;
    }

    // 3. Fallback to store bank config if account number is still missing
    if (!accountNo) {
      accountNo = bank.accountNo || '';
    }

    // 4. Automatically copy transfer code & account number to clipboard for instant paste convenience
    if (paymentCode) {
      copyTextToClipboard(paymentCode);
      showToast(
        lang === 'vi'
          ? `📋 Đã sao chép Nội dung [${paymentCode}] & Mở App Ngân Hàng!`
          : `📋 Copied code [${paymentCode}] & Opening Bank App!`
      );
    }

    // 5. Build standard VietQR redirect URL with 100% pre-filled parameters (ba, am, tn, bn)
    const url = buildVietQrDeeplink(targetAppId, {
      accountNo,
      bankIdOrBin,
      amount,
      paymentCode,
      accountName
    });

    console.log(`🚀 [BuyKeyModal] Opening VietQR deep link for [${targetAppId}]:`, url);
    window.open(url, '_blank');
    setShowBankSelector(false);
  };

  console.log(`🛒 [BuyKeyModal RENDERING] App: "${app.name}" (ID: ${app.id}) | AvailableKeys: ${availableKeys.length} | PackageOptions: ${packageOptions.length}`);

  return (
    <ModalPortal>
      <div className="sub-modal-overlay mobile-bottom-sheet-overlay" onClick={handleOverlayClick}>
        <div className="buy-key-modal-card mobile-bottom-sheet-container" onClick={(e) => e.stopPropagation()}>
          <div className="mobile-sheet-drag-handle" />
          <button className="close" onClick={handleCloseModal}>
            ×
          </button>

          <div className="buy-key-header">
            <h3>
              {order && order.status === 'PAID' && order.deliveredKey
                ? `🔑 ${lang === 'vi' ? 'BẢN QUYỀN VIP CỦA BẠN' : 'YOUR VIP LICENSE KEY'} • ${app.name}`
                : `🛒 ${t.title} ${app.name}`}
            </h3>
          </div>

        {!order ? (
          /* Package Selection Step - Clean & Direct */
          <div className="package-selection-step">
            <label className="step-label">{t.step1}</label>

            {/* GMAIL RECEIVER FIELD (SMART PRESET & AUTO-STORE) */}
            <div className="email-preset-box" style={{
              marginBottom: '16px',
              padding: '12px 14px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(15, 23, 42, 0.7) 100%)',
              border: '1.5px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📧</span>
                  <span>{lang === 'vi' ? 'Gmail nhận Key VIP tự động (Khuyến nghị):' : 'VIP Key Gmail Delivery (Recommended):'}</span>
                </label>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {lang === 'vi' ? 'Tránh thất lạc Key' : 'Auto Backup'}
                </span>
              </div>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomerEmail(val);
                  localStorage.setItem('modlienquan_customer_email', val.trim());
                }}
                placeholder={lang === 'vi' ? 'Nhập Gmail của bạn (vd: yourname@gmail.com)' : 'Enter your Gmail (e.g. yourname@gmail.com)'}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <small style={{ fontSize: '11.5px', color: '#94a3b8', margin: 0 }}>
                {lang === 'vi'
                  ? '⚡ Hệ thống sẽ tự động gửi mã Key VIP & Hóa đơn về Gmail này ngay khi thanh toán VietQR thành công!'
                  : '⚡ System will automatically deliver your VIP Key & invoice to this Gmail once payment is completed!'}
              </small>
            </div>
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
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    marginBottom: '12px',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#f87171' }}>
                    <span>🔥</span>
                    <span>FLASH SALE GIỜ VÀNG (-30%)</span>
                  </div>
                  <div style={{ color: '#fde047', fontWeight: 700, fontSize: '11px' }}>
                    ⚡ Giá đã giảm trực tiếp bên dưới!
                  </div>
                </div>

                <div className="packages-grid">
                  {packageOptions.map((pkg) => {
                    const oldPrice = getFlashSaleOriginalPrice(pkg.price);
                    return (
                      <button
                        key={pkg.days}
                        className="package-card"
                        disabled={isCreating}
                        onClick={() => handleCreateOrder(pkg.days, pkg.price)}
                        style={{ position: 'relative' }}
                      >
                        {/* -30% Tag */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            left: '-6px',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: '#ffffff',
                            fontSize: '10px',
                            fontWeight: 900,
                            padding: '2px 6px',
                            borderRadius: '6px',
                            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
                            letterSpacing: '0.3px',
                            zIndex: 2
                          }}
                        >
                          -30%
                        </div>
                        {pkg.isHot && <div className="pkg-badge">HOT</div>}
                        <div className="pkg-days">{pkg.label}</div>
                        {/* Strikethrough Old Price */}
                        <div
                          style={{
                            fontSize: '11px',
                            textDecoration: 'line-through',
                            color: '#94a3b8',
                            marginTop: '4px'
                          }}
                        >
                          {oldPrice.toLocaleString()} đ
                        </div>
                        {/* Flash Sale Red Hot Price (The exact configured price) */}
                        <div
                          className="pkg-price"
                          style={{
                            color: '#ef4444',
                            fontWeight: 900,
                            fontSize: '15px',
                            marginTop: '2px'
                          }}
                        >
                          {pkg.price.toLocaleString()} đ
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
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

            {/* Direct 1-Touch Download Buttons — filtered by platform */}
            {(() => {
              const platform = app.platform || 'both';
              const showIos = (platform === 'ios' || platform === 'both') && app.ipaUrl;
              const showAndroid = (platform === 'android' || platform === 'both') && app.downloadUrl;
              if (!showIos && !showAndroid) return null;
              return (
                <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {showIos && (
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
                  {showAndroid && (
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
              );
            })()}

            {/* EMAIL DELIVERY & OFFLINE BACKUP CARD */}
            {(() => {
              const activeEmail = order.customerEmail || customerEmail;
              return activeEmail ? (
                <div className="email-delivery-success-card" style={{
                  marginTop: '16px',
                  padding: '16px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.85) 100%)',
                  border: '1.5px solid rgba(16, 185, 129, 0.4)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ fontSize: '26px', lineHeight: 1 }}>✉️</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <h5 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#34d399' }}>
                          {lang === 'vi' ? 'ĐÃ GỬI KEY VỀ GMAIL CỦA BẠN' : 'VIP KEY SENT TO GMAIL'}
                        </h5>
                        <span style={{
                          fontSize: '11px',
                          background: 'rgba(52, 211, 153, 0.2)',
                          color: '#34d399',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 700
                        }}>
                          {order.emailSent ? '✓ ĐÃ GỬI' : '⚡ TỰ ĐỘNG'}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 6px 0', fontSize: '13px', color: '#cbd5e1' }}>
                        {lang === 'vi' ? 'Hộp thư nhận:' : 'Delivered to:'}{' '}
                        <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>
                          {activeEmail}
                        </strong>
                      </p>
                      <small style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', lineHeight: 1.4 }}>
                        {lang === 'vi'
                          ? '💡 Vui lòng kiểm tra Hộp thư đến (hoặc thư mục Spam/Quảng cáo) để xem lại mã Key VIP & Hóa đơn bất cứ lúc nào.'
                          : '💡 Please check your Inbox (or Spam/Promotions folder) to view your VIP Key and receipt anytime.'}
                      </small>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    <a
                      href="https://mail.google.com"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        flex: 1,
                        minWidth: '120px',
                        padding: '9px 12px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(2, 132, 199, 0.4) 100%)',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        color: '#38bdf8',
                        fontSize: '12px',
                        fontWeight: 700,
                        textAlign: 'center',
                        textDecoration: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      📬 {lang === 'vi' ? 'Mở Hòm Thư Gmail ➔' : 'Open Gmail ➔'}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleResendKeyEmail()}
                      disabled={isResendingEmail}
                      style={{
                        flex: 1,
                        minWidth: '110px',
                        padding: '9px 12px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isResendingEmail ? '⏳ ...' : '🔄 ' + (lang === 'vi' ? 'Gửi Lại Thư' : 'Resend Email')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEmailEdit(!showEmailEdit)}
                      style={{
                        padding: '9px 12px',
                        borderRadius: '10px',
                        background: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#94a3b8',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      ✏️ {lang === 'vi' ? 'Đổi Mail' : 'Edit'}
                    </button>
                  </div>

                  {showEmailEdit && (
                    <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
                      <input
                        type="email"
                        placeholder="nhap-gmail-moi@gmail.com"
                        value={emailEditInput}
                        onChange={(e) => setEmailEditInput(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: '8px',
                          background: 'rgba(0,0,0,0.5)',
                          border: '1px solid rgba(56, 189, 248, 0.4)',
                          color: '#fff',
                          fontSize: '12px',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        disabled={isSubmittingEmail}
                        onClick={async () => {
                          const target = emailEditInput.trim();
                          if (target) {
                            await handleSaveEmailForOrder(target);
                            await handleResendKeyEmail(target);
                          }
                        }}
                        style={{
                          padding: '9px 14px',
                          borderRadius: '8px',
                          background: '#38bdf8',
                          color: '#0f172a',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {isSubmittingEmail ? '...' : (lang === 'vi' ? 'Lưu & Gửi' : 'Save & Send')}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="email-delivery-prompt-card" style={{
                  marginTop: '16px',
                  padding: '16px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(15, 23, 42, 0.85) 100%)',
                  border: '1.5px solid rgba(56, 189, 248, 0.3)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '20px' }}>📩</span>
                    <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#38bdf8' }}>
                      {lang === 'vi' ? 'GỬI BẢN QUYỀN VỀ GMAIL ĐỂ SAO LƯU' : 'BACKUP VIP KEY TO YOUR GMAIL'}
                    </h5>
                  </div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '12.5px', color: '#94a3b8' }}>
                    {lang === 'vi'
                      ? 'Nhập Gmail của bạn để hệ thống gửi ngay mã Key VIP & hóa đơn điện tử về hộp thư đề phòng đóng nhầm tab:'
                      : 'Enter your Gmail to receive electronic receipt and store your key permanently:'}
                  </p>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="email"
                      placeholder={lang === 'vi' ? 'Nhập Gmail của bạn (vd: yourname@gmail.com)' : 'Enter your Gmail'}
                      value={emailEditInput}
                      onChange={(e) => setEmailEditInput(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        color: '#fff',
                        fontSize: '12.5px',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      disabled={isSubmittingEmail || !emailEditInput.trim()}
                      onClick={async () => {
                        const target = emailEditInput.trim();
                        if (target) {
                          await handleSaveEmailForOrder(target);
                          await handleResendKeyEmail(target);
                        }
                      }}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                        color: '#040b17',
                        border: 'none',
                        fontWeight: 800,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {isSubmittingEmail ? '...' : (lang === 'vi' ? 'GỬI KEY NGAY 🚀' : 'SEND KEY NOW 🚀')}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* OFFLINE TXT FILE BACKUP DOWNLOAD */}
            <button
              type="button"
              onClick={handleDownloadKeyTxt}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '11px 16px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px dashed rgba(56, 189, 248, 0.35)',
                color: '#38bdf8',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              💾 {lang === 'vi' ? 'Tải File Bản Quyền Sao Lưu (.txt)' : 'Download Key Backup File (.txt)'}
            </button>

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
              onClick={handleCloseModal}
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

                <button
                  type="button"
                  onClick={handleFastTransfer}
                  style={{
                    marginTop: '12px',
                    padding: '10px 16px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                >
                  🚀 {lang === 'vi' ? 'Chuyển Khoản Nhanh (Mở App NH)' : 'Fast Transfer (Open Bank App)'}
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

            {/* GMAIL DELIVERY STRIP DURING PAYMENT */}
            <div className="coupon-inline-strip" style={{ marginTop: '8px' }}>
              <span className="coupon-inline-label" style={{ minWidth: '100px' }}>
                📧 {lang === 'vi' ? 'Nhận qua Gmail:' : 'Send to Gmail:'}
              </span>
              <input
                type="email"
                className="coupon-inline-input"
                style={{ textTransform: 'none' }}
                placeholder={lang === 'vi' ? 'Nhập Gmail (tự động nhận key)' : 'Enter Gmail (auto receives key)'}
                value={customerEmail}
                onChange={(e) => {
                  setCustomerEmail(e.target.value);
                  localStorage.setItem('modlienquan_customer_email', e.target.value.trim());
                }}
              />
              <button
                type="button"
                className="coupon-inline-btn apply"
                disabled={isSubmittingEmail || !customerEmail.trim()}
                onClick={() => handleSaveEmailForOrder(customerEmail)}
              >
                {isSubmittingEmail ? '...' : (lang === 'vi' ? 'LƯU' : 'SAVE')}
              </button>
            </div>

            {/* 2-Minute Expiration Warning Strip */}
            {timeLeft <= 120 && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.22)',
                border: '1.5px solid #ef4444',
                color: '#fca5a5',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '12.5px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '10px',
                boxShadow: '0 0 16px rgba(239, 68, 68, 0.35)'
              }}>
                <span style={{ fontSize: '18px' }}>🚨</span>
                <div style={{ flex: 1 }}>
                  <span>
                    {lang === 'vi'
                      ? `SẮP HẾT THỜI GIAN GIỮ ĐƠN: Còn ${formatCountdown(timeLeft)} để quét VietQR!`
                      : `PAYMENT EXPIRING: Only ${formatCountdown(timeLeft)} left to scan VietQR!`}
                  </span>
                  <small style={{ display: 'block', fontSize: '11px', color: '#fecaca', fontWeight: 500, marginTop: '2px' }}>
                    {lang === 'vi'
                      ? 'Vui lòng chuyển khoản ngay. Đơn hàng sẽ tự hủy khi đồng hồ về 00:00.'
                      : 'Please complete transfer now. Order auto-cancels at 00:00.'}
                  </small>
                </div>
              </div>
            )}

            <div className="polling-status-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span className="spin-dot">●</span>{' '}
                {lang === 'vi' ? '⚡ Đang tự động kiểm tra giao dịch...' : t.awaitingBank}
              </div>
              <div style={{
                background: timeLeft <= 120 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.15)',
                color: timeLeft <= 120 ? '#fca5a5' : '#f87171',
                border: timeLeft <= 120 ? '1.5px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.35)',
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                boxShadow: timeLeft <= 120 ? '0 0 12px rgba(239, 68, 68, 0.6)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span>⏰</span>
                <span>
                  {timeLeft <= 120
                    ? (lang === 'vi' ? '🚨 GẤP: ' : '🚨 URGENT: ')
                    : (lang === 'vi' ? 'Hủy sau: ' : 'Expires in: ')}
                  {formatCountdown(timeLeft)}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '14px', textAlign: 'center' }}>
              <button
                type="button"
                className="manual-verify-now-btn"
                onClick={handleManualVerify}
                disabled={isVerifyingManual}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '14.5px',
                  cursor: isVerifyingManual ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 20px rgba(2, 132, 199, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  opacity: isVerifyingManual ? 0.7 : 1
                }}
              >
                {isVerifyingManual ? (
                  <>⚡ {lang === 'vi' ? 'ĐANG KIỂM TRA HỆ THỐNG...' : 'CHECKING...'}</>
                ) : (
                  <>🔍 {lang === 'vi' ? 'XÁC NHẬN ĐÃ CHUYỂN TIỀN' : 'I HAVE TRANSFERRED (VERIFY NOW)'}</>
                )}
              </button>
              <small style={{ display: 'block', marginTop: '6px', color: '#94a3b8', fontSize: '11.5px' }}>
                {lang === 'vi' ? 'Ấn vào đây nếu bạn đã chuyển khoản xong để hệ thống kiểm tra và cấp Key ngay lập tức' : 'Click here after transfer to check payment immediately'}
              </small>
            </div>
          </div>
        )}

        {/* Bank Selector Popup for Fast Transfer with Search & Pre-filled Autofill indicator */}
        {showBankSelector && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(12px)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            borderRadius: '24px',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <h3 style={{ color: '#fff', margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800 }}>
                {lang === 'vi' ? '🚀 Chọn Ứng Dụng Ngân Hàng' : '🚀 Select Banking App'}
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
                {lang === 'vi' ? 'Hệ thống sẽ tự động điền Số tiền, STK và Nội dung trên App:' : 'All payment details will be auto-filled in your banking app:'}
              </p>
            </div>

            {/* Quick search input */}
            <input
              type="text"
              placeholder={lang === 'vi' ? '🔍 Tìm nhanh ngân hàng (MB, VCB, TCB...)...' : '🔍 Search bank...'}
              value={bankSearchQuery}
              onChange={(e) => setBankSearchQuery(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '340px',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(0, 0, 0, 0.4)',
                color: '#fff',
                fontSize: '13px',
                marginBottom: '14px',
                outline: 'none'
              }}
            />

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              width: '100%',
              maxWidth: '350px',
              maxHeight: '320px',
              overflowY: 'auto',
              padding: '4px'
            }}>
              {COMMON_BANKS
                .filter((b) =>
                  !bankSearchQuery ||
                  b.name.toLowerCase().includes(bankSearchQuery.toLowerCase()) ||
                  b.shortName.toLowerCase().includes(bankSearchQuery.toLowerCase()) ||
                  b.id.toLowerCase().includes(bankSearchQuery.toLowerCase())
                )
                .map((b) => (
                  <button
                    key={b.id}
                    onClick={() => executeFastTransfer(b.id)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${b.color}45`,
                      padding: '10px 6px',
                      borderRadius: '12px',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = `${b.color}25`; e.currentTarget.style.borderColor = b.color; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.borderColor = `${b.color}45`; }}
                  >
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10.5px', color: '#fff', fontWeight: 800, boxShadow: `0 2px 8px ${b.color}60` }}>
                      {b.shortName.substring(0, 3)}
                    </div>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{b.name}</span>
                  </button>
                ))}
            </div>

            <button
              onClick={() => setShowBankSelector(false)}
              style={{
                marginTop: '16px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#94a3b8',
                padding: '8px 22px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '12.5px',
                fontWeight: 600
              }}
            >
              {lang === 'vi' ? '✕ Đóng' : '✕ Close'}
            </button>
          </div>
        )}
      </div>
    </div>
    </ModalPortal>
  );
}
