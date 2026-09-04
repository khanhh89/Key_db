import React, { useState, useEffect } from 'react';
import type { OrderItem, Language } from '../../types';
import {
  fetchAllOrdersFromBackend,
  confirmOrderPaymentInBackend,
  fetchAdminBankConfigFromBackend,
  saveBankConfigToBackend,
  deleteOrderFromBackend,
  clearAllOrdersFromBackend,
  formatDateTime,
  API_BASE_URL
} from '../../services/api';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Pagination } from '../../components/common/Pagination';
import { copyTextToClipboard } from '../../utils/clipboard';

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

  // Search & Status Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'PAID' | 'PENDING'>('all');

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

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.appName && o.appName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.paymentCode && o.paymentCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.deliveredKey && o.deliveredKey.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'PAID') return o.status === 'PAID';
    if (statusFilter === 'PENDING') return o.status !== 'PAID';
    return true;
  });

  const exportOrdersCSV = () => {
    if (filteredOrders.length === 0) {
      showToast(lang === 'vi' ? 'Không có đơn hàng nào để xuất!' : 'No orders to export!');
      return;
    }
    const headers = ['Mã Đơn', 'App Game', 'Số Tiền (VNĐ)', 'Mã CK', 'Trạng Thái', 'Thời Gian', 'Key Đã Giao'];
    const rows = filteredOrders.map((o) => [
      o.id,
      `"${o.appName || o.appId}"`,
      o.amount,
      o.paymentCode || '',
      o.status,
      formatDateTime(o.paidAt || o.createdAt),
      `"${o.deliveredKey || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `don_hang_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(lang === 'vi' ? '📥 Đã xuất file CSV lịch sử đơn hàng!' : 'Exported CSV file!');
  };

  const sampleQrUrl = `https://img.vietqr.io/image/${bankId}-${accNo}-compact2.png?amount=50000&addInfo=MKDEMO&accountName=${encodeURIComponent(accName)}`;

  return (
    <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[24px] p-7 flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="m-0 font-heading text-[22px] font-extrabold">💳 {lang === 'vi' ? 'Quản Lý Đơn Hàng & Cổng Thanh Toán PayOS Auto' : 'Orders & PayOS Payment Gateway'}</h2>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex gap-2.5 mb-5 flex-wrap">
        <button
          type="button"
          className={`px-5 py-3 rounded-[14px] font-heading font-bold text-[13px] cursor-pointer transition-all duration-200 ${activeTab === 'orders' ? 'bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white border-0 shadow-[0_4px_14px_rgba(56,189,248,0.3)]' : 'border border-[#1e293b] bg-[#111827]/70 text-[#94a3b8] hover:text-[#38bdf8] hover:border-[#38bdf8]'}`}
          onClick={() => handleTabChange('orders')}
        >
          📋 {lang === 'vi' ? 'Danh Sách Đơn Hàng' : 'Orders List'} ({orders.length})
        </button>

        <button
          type="button"
          className={`px-5 py-3 rounded-[14px] font-heading font-bold text-[13px] cursor-pointer transition-all duration-200 ${activeTab === 'payos' ? 'bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white border-0 shadow-[0_4px_14px_rgba(56,189,248,0.3)]' : 'border border-[#1e293b] bg-[#111827]/70 text-[#94a3b8] hover:text-[#38bdf8] hover:border-[#38bdf8]'}`}
          onClick={() => handleTabChange('payos')}
        >
          ⚡ {lang === 'vi' ? 'Cấu Hình PayOS Gateway' : 'PayOS Gateway Config'}
        </button>

        <button
          type="button"
          className={`px-5 py-3 rounded-[14px] font-heading font-bold text-[13px] cursor-pointer transition-all duration-200 ${activeTab === 'bank' ? 'bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white border-0 shadow-[0_4px_14px_rgba(56,189,248,0.3)]' : 'border border-[#1e293b] bg-[#111827]/70 text-[#94a3b8] hover:text-[#38bdf8] hover:border-[#38bdf8]'}`}
          onClick={() => handleTabChange('bank')}
        >
          🏦 {lang === 'vi' ? 'Tài Khoản VietQR' : 'VietQR Bank Account'}
        </button>
      </div>

      {/* PAYOS GATEWAY CONFIG TAB */}
      {activeTab === 'payos' && (
        <div className="bg-[#111827]/70 border border-[#1e293b] rounded-[18px] p-5 mb-2.5">
          <h4 className="m-0 mb-4 font-heading text-[#38bdf8] text-[20px] font-extrabold">⚡ {lang === 'vi' ? 'Tích Hợp Cổng Thanh Toán Tự Động PayOS' : 'PayOS Automated Gateway Setup'}</h4>
          <p className="text-[#94a3b8] text-[13px] mt-[-10px] mb-5">
            {lang === 'vi'
              ? 'PayOS giúp tự động kiểm tra chuyển khoản và nhả Key ngay lập tức khi khách hàng quét VietQR.'
              : 'PayOS automatically verifies bank transfers and pushes keys in real-time.'}
          </p>

          <form onSubmit={handleSaveConfig} className="flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-170px)] pr-1">
            <div className="bg-[#38bdf8]/[0.08] border border-[#38bdf8]/25 p-[16px_20px] rounded-[14px]">
              <label className="flex items-center gap-3 cursor-pointer">
                <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
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

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#cbd5e1]">Client ID (Mã Client ID từ PayOS Dashboard):</label>
                <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                  type="text"
                  value={payosClientId}
                  onChange={(e) => setPayosClientId(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#cbd5e1]">API Key (Mã API Key từ PayOS Dashboard):</label>
                <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                  type="password"
                  value={payosApiKey}
                  onChange={(e) => setPayosApiKey(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#cbd5e1]">Checksum Key (Mã Checksum Signature):</label>
                <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                  type="password"
                  value={payosChecksumKey}
                  onChange={(e) => setPayosChecksumKey(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-[#1e293b]/50 p-4 rounded-xl border border-[#38bdf8]/20 mt-2">
              <h5 className="m-0 mb-2 text-[#38bdf8] text-sm">🔗 Webhook URL (Copy và dán vào Kênh Webhook trên PayOS Dashboard):</h5>
              <code className="bg-[#0f172a] text-[#38bdf8] p-2 rounded-lg font-mono text-[13px] block">{API_BASE_URL}/payos/webhook</code>
            </div>

            <button
              type="button"
              className="px-6 py-3 rounded-xl border-0 bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white font-heading font-extrabold text-sm cursor-pointer transition-all duration-250 shadow-[0_4px_14px_rgba(56,189,248,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(56,189,248,0.5)] mt-2 w-fit"
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
      )}

      {/* ORDERS LIST TAB */}
      {activeTab === 'orders' && (
        <>
          {/* REVENUE OVERVIEW & TOOLBAR */}
          <div className="flex gap-5 mb-2.5 flex-col md:flex-row">
            <div className="flex-1 bg-[#111827]/70 border border-[#1e293b] p-[16px_20px] rounded-[16px] flex flex-col gap-1">
              <span className="text-[11px] font-bold text-[#94a3b8]">TỔNG DOANH THU:</span>
              <strong className="text-[#10b981] text-[20px] font-bold">{totalRevenue.toLocaleString()} đ</strong>
            </div>
            <div className="flex-1 bg-[#111827]/70 border border-[#1e293b] p-[16px_20px] rounded-[16px] flex flex-col gap-1">
              <span className="text-[11px] font-bold text-[#94a3b8]">TỔNG ĐƠN HÀNG:</span>
              <strong>{orders.length} Đơn</strong>
            </div>
            <div className="flex-1 bg-[#111827]/70 border border-[#1e293b] p-[16px_20px] rounded-[16px] flex flex-col gap-1">
              <span className="text-[11px] font-bold text-[#94a3b8]">ĐÃ THANH TOÁN:</span>
              <strong className="text-[#38bdf8] text-[20px] font-bold">{orders.filter((o) => o.status === 'PAID').length} Đơn</strong>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="bg-gradient-to-r from-[#38bdf8] to-[#6366f1] border-0 text-white px-5 py-3 rounded-[14px] font-heading font-extrabold text-sm cursor-pointer transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(56,189,248,0.4)]"
                onClick={exportOrdersCSV}
                style={{ padding: '6px 14px', fontSize: '13px' }}
              >
                📥 {lang === 'vi' ? 'Xuất File CSV' : 'Export CSV'}
              </button>
              {orders.length > 0 && (
                <button
                  type="button"
                  className="bg-[#ef4444]/12 text-[#f87171] border border-[#ef4444]/30 px-4 py-2 rounded-[10px] font-inherit font-bold text-[13px] cursor-pointer transition-all duration-200 inline-flex items-center gap-[6px] whitespace-nowrap hover:bg-[#ef4444] hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(239,68,68,0.35)]"
                  onClick={() => setIsClearingAll(true)}
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                >
                  🗑 {lang === 'vi' ? 'Xóa Tất Cả' : 'Clear All'}
                </button>
              )}
            </div>
          </div>

          {/* SEARCH & STATUS FILTER TOOLBAR */}
          <div className="flex gap-4 mb-5 items-center flex-wrap">
            <div className="flex items-center gap-2 bg-[#080c14] border border-[#1e293b] rounded-xl px-4 py-2 flex-1 min-w-[250px]">
              <span className="text-[11px] font-bold text-[#94a3b8]">🔍</span>
              <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                type="text"
                placeholder={lang === 'vi' ? 'Tìm theo Mã Đơn, Tên App, Mã CK, Key...' : 'Search by ID, App, Code, Key...'}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
              {searchTerm && (
                <button className="bg-transparent border-none text-[#94a3b8] cursor-pointer hover:text-white" onClick={() => setSearchTerm('')}>✕</button>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                className={`px-4 py-2 rounded-[10px] text-[13px] font-bold cursor-pointer transition-all border ${statusFilter === 'all' ? 'border-[#38bdf8] text-[#38bdf8] bg-[#38bdf8]/10' : 'border-[#1e293b] bg-[#111827]/70 text-[#94a3b8] hover:border-[#38bdf8] hover:text-[#38bdf8]'}`}
                onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
              >
                Tất cả ({orders.length})
              </button>
              <button
                className={`px-4 py-2 rounded-[10px] text-[13px] font-bold cursor-pointer transition-all border ${statusFilter === 'PAID' ? 'border-[#38bdf8] text-[#38bdf8] bg-[#38bdf8]/10' : 'border-[#1e293b] bg-[#111827]/70 text-[#94a3b8] hover:border-[#38bdf8] hover:text-[#38bdf8]'}`}
                onClick={() => { setStatusFilter('PAID'); setCurrentPage(1); }}
              >
                ✅ Đã Thanh Toán ({orders.filter((o) => o.status === 'PAID').length})
              </button>
              <button
                className={`px-4 py-2 rounded-[10px] text-[13px] font-bold cursor-pointer transition-all border ${statusFilter === 'PENDING' ? 'border-[#38bdf8] text-[#38bdf8] bg-[#38bdf8]/10' : 'border-[#1e293b] bg-[#111827]/70 text-[#94a3b8] hover:border-[#38bdf8] hover:text-[#38bdf8]'}`}
                onClick={() => { setStatusFilter('PENDING'); setCurrentPage(1); }}
              >
                ⏳ Đang Chờ ({orders.filter((o) => o.status !== 'PAID').length})
              </button>
            </div>
          </div>

          {/* ORDERS TABLE */}
          <div className="w-full overflow-x-auto rounded-2xl border border-[#1e293b] bg-[#0f172a]/50 backdrop-blur-[10px]">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="hover:bg-[#38bdf8]/[0.04] transition-colors group">
                  <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">Mã Đơn</th>
                  <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">App Game</th>
                  <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">Số Tiền</th>
                  <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">Mã Chuyển Khoản</th>
                  <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">Trạng Thái</th>
                  <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">Thời Gian Thanh Toán</th>
                  <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">Key Đã Giao</th>
                  <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr className="hover:bg-[#38bdf8]/[0.04] transition-colors group">
                    <td colSpan={8} className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                      {lang === 'vi' ? 'Không tìm thấy đơn hàng nào phù hợp' : 'No matching orders found'}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#38bdf8]/[0.04] transition-colors group">
                      <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]"><strong>{ord.id}</strong></td>
                      <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">{ord.appName || ord.appId}</td>
                      <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]"><strong className="text-[#10b981] text-[20px] font-bold">{ord.amount.toLocaleString()} đ</strong></td>
                      <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]"><code>{ord.paymentCode}</code></td>
                      <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                        <span className={`inline-block px-[10px] py-1 rounded-lg text-[11px] font-extrabold ${ord.status === 'PAID' ? 'bg-[#10b981]/15 text-[#10b981]' : 'bg-[#ef4444]/15 text-[#f87171]'}`}>
                          {ord.status === 'PAID' ? '✓ ĐÃ THANH TOÁN' : '⏳ CHỜ CHUYỂN KHOẢN'}
                        </span>
                      </td>
                      <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
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
                      <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                        {ord.deliveredKey ? (
                          <code
                            className="bg-[#1e293b] text-[#38bdf8] px-2.5 py-1 rounded-md font-mono text-[13px]"
                            title={lang === 'vi' ? 'Ấn để sao chép Key' : 'Click to copy Key'}
                            style={{ cursor: 'pointer' }}
                            onClick={async () => {
                              const success = await copyTextToClipboard(ord.deliveredKey!);
                              if (success) {
                                showToast(lang === 'vi' ? `📋 Đã sao chép Key VIP: ${ord.deliveredKey}` : `Copied VIP Key: ${ord.deliveredKey}`);
                              }
                            }}
                          >
                            {ord.deliveredKey}
                          </code>
                        ) : (
                          <small className="text-[#64748b]">-</small>
                        )}
                      </td>
                      <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                        <div className="flex items-center gap-2">
                          {ord.status !== 'PAID' && (
                            <button
                              type="button"
                              className="bg-[#38bdf8]/12 text-[#38bdf8] border border-[#38bdf8]/30 px-4 py-2 rounded-[10px] font-inherit font-bold text-[13px] cursor-pointer transition-all duration-200 inline-flex items-center gap-[6px] whitespace-nowrap hover:bg-[#38bdf8] hover:text-[#080c14] hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(56,189,248,0.35)]"
                              onClick={() => handleManualConfirm(ord.id)}
                            >
                              ⚡ {lang === 'vi' ? 'Xác Nhận' : 'Confirm'}
                            </button>
                          )}
                          <button
                            type="button"
                            className="bg-[#ef4444]/12 text-[#f87171] border border-[#ef4444]/30 px-4 py-2 rounded-[10px] font-inherit font-bold text-[13px] cursor-pointer transition-all duration-200 inline-flex items-center gap-[6px] whitespace-nowrap hover:bg-[#ef4444] hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(239,68,68,0.35)]"
                            onClick={() => setDeletingOrderId(ord.id)}
                          >
                            🗑 {lang === 'vi' ? 'Xóa' : 'Delete'}
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
            totalPages={Math.ceil(filteredOrders.length / pageSize) || 1}
            totalItems={filteredOrders.length}
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
