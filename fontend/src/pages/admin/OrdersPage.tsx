import React, { useState, useEffect } from 'react';
import type { OrderItem, Language } from '../../types';
import {
  fetchAllOrdersFromBackend,
  confirmOrderPaymentInBackend,
  fetchAdminBankConfigFromBackend,
  saveBankConfigToBackend,
  deleteOrderFromBackend,
  clearAllOrdersFromBackend
} from '../../services/api';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { OrderPayosConfig } from '../../components/admin/orders/OrderPayosConfig';
import { OrderBankConfig } from '../../components/admin/orders/OrderBankConfig';
import { OrderList } from '../../components/admin/orders/OrderList';

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
        <OrderPayosConfig
          lang={lang}
          payosEnabled={payosEnabled}
          setPayosEnabled={setPayosEnabled}
          payosClientId={payosClientId}
          setPayosClientId={setPayosClientId}
          payosApiKey={payosApiKey}
          setPayosApiKey={setPayosApiKey}
          payosChecksumKey={payosChecksumKey}
          setPayosChecksumKey={setPayosChecksumKey}
          isSaving={isSaving}
          handleSaveConfig={handleSaveConfig}
          showToast={showToast}
        />
      )}

      {/* VIETQR BANK CONFIG TAB */}
      {activeTab === 'bank' && (
        <OrderBankConfig
          lang={lang}
          bankId={bankId}
          setBankId={setBankId}
          accNo={accNo}
          setAccNo={setAccNo}
          accName={accName}
          setAccName={setAccName}
          enableStaticQr={enableStaticQr}
          setEnableStaticQr={setEnableStaticQr}
          isSaving={isSaving}
          handleSaveConfig={handleSaveConfig}
          showToast={showToast}
          sampleQrUrl={sampleQrUrl}
          POPULAR_BANKS={POPULAR_BANKS}
        />
      )}

      {/* ORDERS LIST TAB */}
      {activeTab === 'orders' && (
        <OrderList
          lang={lang}
          orders={orders}
          setIsClearingAll={setIsClearingAll}
          handleManualConfirm={handleManualConfirm}
          setDeletingOrderId={setDeletingOrderId}
          showToast={showToast}
        />
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
