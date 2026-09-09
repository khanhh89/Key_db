import { useState } from 'react';
import type { Language, OrderItem } from '../../../types';
import { Pagination } from '../../common/Pagination';
import { formatDateTime } from '../../../services/api';
import { copyTextToClipboard } from '../../../utils/clipboard';

interface OrderListProps {
  lang: Language;
  orders: OrderItem[];
  setIsClearingAll: (val: boolean) => void;
  handleManualConfirm: (id: string) => void;
  setDeletingOrderId: (id: string) => void;
  showToast: (msg: string) => void;
}

export function OrderList({
  lang,
  orders,
  setIsClearingAll,
  handleManualConfirm,
  setDeletingOrderId,
  showToast
}: OrderListProps) {
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Search & Status Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'PAID' | 'PENDING'>('all');

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

  return (
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
  );
}
