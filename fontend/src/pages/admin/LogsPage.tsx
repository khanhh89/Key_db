import { useState, useEffect, useMemo } from 'react';
import type { Language } from '../../types';
import { fetchSystemLogsFromBackend, clearSystemLogsInBackend, type SystemLogItem } from '../../services/configApi';
import { formatDateTime } from '../../services/dateUtils';
import { ConfirmModal } from '../../components/common/ConfirmModal';

interface LogsPageProps {
  lang: Language;
  showToast: (msg: string) => void;
}

export function LogsPage({ lang, showToast }: LogsPageProps) {
  const [logs, setLogs] = useState<SystemLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'CLIENT' | 'ADMIN'>('ALL');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    const data = await fetchSystemLogsFromBackend();
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    let result = logs;

    // Filter by Category
    if (filterCategory === 'CLIENT') {
      result = result.filter((log) => log.action.startsWith('CLIENT_') || log.action.startsWith('ORDER_'));
    } else if (filterCategory === 'ADMIN') {
      result = result.filter((log) => log.action.startsWith('ADMIN_') || log.action.startsWith('APP_') || log.action.startsWith('KEY_') || log.action.startsWith('CONFIG_'));
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (log) =>
          log.action.toLowerCase().includes(query) ||
          log.clientIp.toLowerCase().includes(query) ||
          log.details.toLowerCase().includes(query) ||
          (log.userAgent && log.userAgent.toLowerCase().includes(query))
      );
    }
    return result;
  }, [logs, filterCategory, searchQuery]);

  const handleClearLogs = async () => {
    const success = await clearSystemLogsInBackend();
    if (success) {
      setLogs([]);
      showToast(lang === 'vi' ? '🎉 Đã xóa sạch nhật ký hoạt động hệ thống!' : 'System activity logs cleared!');
    } else {
      showToast(lang === 'vi' ? '❌ Xóa nhật ký thất bại!' : 'Failed to clear logs!');
    }
    setIsClearModalOpen(false);
  };

  const getBadgeStyle = (action: string) => {
    if (action.includes('SUCCESS') || action.includes('CREATE')) {
      return { background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' };
    }
    if (action.includes('FAIL') || action.includes('DENIED')) {
      return { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' };
    }
    if (action.includes('PASSWORD') || action.includes('ADMIN')) {
      return { background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' };
    }
    return { background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' };
  };

  return (
    <div className="admin-page-container p-6">
      {/* Header Bar */}
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <div>
          <h2 className="m-0 text-[22px] font-extrabold text-[#f8fafc] flex items-center gap-2.5">
            📜 {lang === 'vi' ? 'Nhật Ký Hoạt Động Hệ Thống' : 'System Activity Audit Logs'}
          </h2>
          <p className="mt-1 text-[13px] text-[#94a3b8]">
            {lang === 'vi' ? 'Theo dõi thời gian thực các thao tác người dùng, địa chỉ IP và hành động đăng nhập Admin.' : 'Real-time audit log of user actions, client IP addresses, and Admin activities.'}
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <button
            onClick={loadLogs}
            disabled={loading}
            className="coupon-inline-btn apply"
            style={{ padding: '10px 18px', fontSize: '13px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🔄 {lang === 'vi' ? 'Làm Mới Log' : 'Refresh Logs'}
          </button>

          {logs.length > 0 && (
            <button
              onClick={() => setIsClearModalOpen(true)}
              className="coupon-inline-btn remove"
              style={{ padding: '10px 18px', fontSize: '13px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              🗑️ {lang === 'vi' ? 'Xóa Nhật Ký' : 'Clear Logs'}
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex gap-2.5 mb-4 flex-wrap">
        <button
          onClick={() => setFilterCategory('ALL')}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: filterCategory === 'ALL' ? '1px solid #00f2fe' : '1px solid #1e293b',
            background: filterCategory === 'ALL' ? 'rgba(0, 242, 254, 0.15)' : 'rgba(15, 23, 42, 0.8)',
            color: filterCategory === 'ALL' ? '#00f2fe' : '#94a3b8',
            transition: 'all 0.2s ease'
          }}
        >
          📋 {lang === 'vi' ? 'Tất Cả Nhật Ký' : 'All Audit Logs'} ({logs.length})
        </button>

        <button
          onClick={() => setFilterCategory('CLIENT')}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: filterCategory === 'CLIENT' ? '1px solid #38bdf8' : '1px solid #1e293b',
            background: filterCategory === 'CLIENT' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.8)',
            color: filterCategory === 'CLIENT' ? '#38bdf8' : '#94a3b8',
            transition: 'all 0.2s ease'
          }}
        >
          👨‍💻 {lang === 'vi' ? 'Hoạt Động Khách Hàng (Client)' : 'Client Activity Logs'}
        </button>

        <button
          onClick={() => setFilterCategory('ADMIN')}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: filterCategory === 'ADMIN' ? '1px solid #c084fc' : '1px solid #1e293b',
            background: filterCategory === 'ADMIN' ? 'rgba(192, 132, 252, 0.15)' : 'rgba(15, 23, 42, 0.8)',
            color: filterCategory === 'ADMIN' ? '#c084fc' : '#94a3b8',
            transition: 'all 0.2s ease'
          }}
        >
          🛡️ {lang === 'vi' ? 'Thao Tác Quản Trị (Admin)' : 'Admin System Logs'}
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="mb-5">
        <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={lang === 'vi' ? '🔍 Tìm kiếm theo IP, Hành động hoặc Nội dung log...' : '🔍 Search by IP, Action, or log details...'}
          style={{
            width: '100%',
            padding: '12px 18px',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            color: '#f8fafc',
            fontSize: '14px',
            outline: 'none'
          }}
        />
      </div>

      {/* Logs Data Table */}
      <div className="bg-[#0f172a]/60 backdrop-blur-md border border-[#1e293b] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[#94a3b8]">
            ⏳ {lang === 'vi' ? 'Đang tải nhật ký hoạt động hệ thống...' : 'Loading system logs...'}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-10 text-center text-[#94a3b8]">
            📭 {lang === 'vi' ? 'Chưa có nhật ký hoạt động nào ghi nhận.' : 'No activity logs found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="bg-[#1e293b]/80 border-b border-[#334155] text-[#94a3b8]">
                  <th className="p-[14px_16px] w-[160px]">{lang === 'vi' ? 'Thời Gian' : 'Timestamp'}</th>
                  <th className="p-[14px_16px] w-[140px]">{lang === 'vi' ? 'Địa Chỉ IP' : 'Client IP'}</th>
                  <th className="p-[14px_16px] w-[180px]">{lang === 'vi' ? 'Hành Động' : 'Action'}</th>
                  <th style={{ padding: '14px 16px' }}>{lang === 'vi' ? 'Chi Tiết Thao Tác' : 'Activity Details'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-[#1e293b]/50 transition-colors duration-200">
                    <td className="p-[14px_16px] text-[#cbd5e1] whitespace-nowrap font-semibold">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="p-[14px_16px] text-[#00f2fe] font-mono font-bold">
                      {log.clientIp}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '0.5px',
                          ...getBadgeStyle(log.action)
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="p-[14px_16px] text-[#f1f5f9] leading-relaxed">
                      {log.details}
                      {log.userAgent && (
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
                          💻 Device: {log.userAgent.substring(0, 100)}...
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clear Logs Confirm Modal */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        title={lang === 'vi' ? 'Xác nhận xóa tất cả Nhật ký' : 'Confirm Clear Logs'}
        message={lang === 'vi' ? 'Bạn có chắc chắn muốn xóa toàn bộ nhật ký hoạt động hệ thống không? Thao tác này không thể hoàn tác!' : 'Are you sure you want to clear all system activity logs? This action cannot be undone!'}
        lang={lang}
        onConfirm={handleClearLogs}
        onCancel={() => setIsClearModalOpen(false)}
      />
    </div>
  );
}
