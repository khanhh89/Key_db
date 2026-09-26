import { useState, useEffect } from 'react';
import type { Language } from '../../types';
import {
  fetchAdminProviders,
  saveAdminProvider,
  deleteAdminProvider,
  testProviderApi,
  fetchGatewayStats,
  type BypassProvider,
  type BypassGatewayStats,
  type TestProviderResponse
} from '../../services/gatewayApi';
import { ModalPortal } from '../../components/common/ModalPortal';
import { ConfirmModal } from '../../components/common/ConfirmModal';

interface ShortlinkGatewayPageProps {
  lang: Language;
  showToast: (msg: string) => void;
}

export function ShortlinkGatewayPage({ lang, showToast }: ShortlinkGatewayPageProps) {
  const [providers, setProviders] = useState<BypassProvider[]>([]);
  const [stats, setStats] = useState<BypassGatewayStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<BypassProvider | null>(null);
  const [deletingProvider, setDeletingProvider] = useState<BypassProvider | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formApiUrl, setFormApiUrl] = useState('');
  const [formApiToken, setFormApiToken] = useState('');
  const [formParamTokenName, setFormParamTokenName] = useState('api');
  const [formParamUrlName, setFormParamUrlName] = useState('url');
  const [formWeight, setFormWeight] = useState(1);
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Test API State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestProviderResponse | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const [pList, sData] = await Promise.all([
      fetchAdminProviders(),
      fetchGatewayStats()
    ]);
    setProviders(pList);
    setStats(sData);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingProvider(null);
    setFormName('');
    setFormApiUrl('https://link1s.com/api');
    setFormApiToken('');
    setFormParamTokenName('api');
    setFormParamUrlName('url');
    setFormWeight(1);
    setFormIsActive(true);
    setTestResult(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: BypassProvider) => {
    setEditingProvider(p);
    setFormName(p.name);
    setFormApiUrl(p.apiUrl);
    setFormApiToken(p.apiToken);
    setFormParamTokenName(p.paramTokenName || 'api');
    setFormParamUrlName(p.paramUrlName || 'url');
    setFormWeight(p.weight || 1);
    setFormIsActive(p.isActive !== false);
    setTestResult(null);
    setIsModalOpen(true);
  };

  const handleTestApi = async () => {
    if (!formApiUrl.trim() || !formApiToken.trim()) {
      showToast(lang === 'vi' ? '⚠️ Vui lòng nhập API URL và API Token trước khi test!' : '⚠️ Please enter API URL and Token!');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    const res = await testProviderApi({
      id: editingProvider?.id,
      name: formName,
      apiUrl: formApiUrl,
      apiToken: formApiToken,
      paramTokenName: formParamTokenName,
      paramUrlName: formParamUrlName
    });
    setTestResult(res);
    setIsTesting(false);
    if (res.success) {
      showToast(lang === 'vi' ? '✅ Kết nối API rút gọn link thành công!' : '✅ API connection successful!');
    } else {
      showToast(`❌ ${res.message}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formApiUrl.trim() || !formApiToken.trim()) {
      showToast(lang === 'vi' ? '⚠️ Vui lòng điền đầy đủ Tên, URL và Token!' : '⚠️ Please fill all required fields!');
      return;
    }

    setIsSaving(true);
    const payload: BypassProvider = {
      id: editingProvider?.id,
      name: formName.trim(),
      apiUrl: formApiUrl.trim(),
      apiToken: formApiToken.trim(),
      paramTokenName: formParamTokenName.trim(),
      paramUrlName: formParamUrlName.trim(),
      weight: Number(formWeight) || 1,
      isActive: formIsActive
    };

    const res = await saveAdminProvider(payload);
    setIsSaving(false);
    if (res.success) {
      showToast(lang === 'vi' ? '✅ Đã lưu nhà mạng thành công!' : '✅ Saved provider successfully!');
      setIsModalOpen(false);
      loadData();
    } else {
      showToast(`❌ ${res.message}`);
    }
  };

  const confirmDelete = async () => {
    if (!deletingProvider?.id) return;
    const res = await deleteAdminProvider(deletingProvider.id);
    if (res.success) {
      showToast(lang === 'vi' ? `🗑️ Đã xóa nhà mạng [${deletingProvider.name}]` : `Deleted provider [${deletingProvider.name}]`);
      setDeletingProvider(null);
      loadData();
    } else {
      showToast(`❌ ${res.message}`);
    }
  };

  const totalWeight = providers.filter(p => p.isActive).reduce((acc, p) => acc + (p.weight || 1), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-heading font-extrabold text-white m-0 flex items-center gap-2.5">
            🚀 {lang === 'vi' ? 'Quản Lý Cổng Link Vượt (Bypass Gateway)' : 'Bypass Shortlink Gateway'}
          </h2>
          <p className="text-xs text-[#94a3b8] m-0 mt-1">
            {lang === 'vi' ? 'Tích hợp API nhiều nhà mạng rút gọn link, chia % traffic thông minh, chống bot bypass.' : 'Multi-provider API gateway, weighted traffic split, and anti-bypass protection.'}
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white px-5 py-2.5 rounded-xl font-heading font-extrabold text-xs cursor-pointer shadow-[0_4px_14px_rgba(14,165,233,0.35)] hover:brightness-110 transition-all flex items-center gap-2 border-0"
        >
          + {lang === 'vi' ? 'Thêm Nhà Mạng Mới' : 'Add New Provider'}
        </button>
      </div>

      {/* Stats Cards Row */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0f172a]/70 border border-[#1e293b] rounded-2xl p-4 flex flex-col gap-1 backdrop-blur-md">
            <span className="text-xs text-[#94a3b8] font-bold">
              📊 {lang === 'vi' ? 'TỔNG PHIÊN VƯỢT LINK' : 'TOTAL SESSIONS'}
            </span>
            <div className="text-2xl font-mono font-extrabold text-[#38bdf8]">
              {stats.totalSessions.toLocaleString()}
            </div>
            <div className="text-[11px] text-[#22c55e]">
              Hôm nay: +{stats.todaySessions} lượt
            </div>
          </div>

          <div className="bg-[#0f172a]/70 border border-[#1e293b] rounded-2xl p-4 flex flex-col gap-1 backdrop-blur-md">
            <span className="text-xs text-[#94a3b8] font-bold">
              ✅ {lang === 'vi' ? 'VƯỢT THÀNH CÔNG' : 'COMPLETED SESSIONS'}
            </span>
            <div className="text-2xl font-mono font-extrabold text-[#22c55e]">
              {stats.completedSessions.toLocaleString()}
            </div>
            <div className="text-[11px] text-[#22c55e]">
              Hôm nay: +{stats.todayCompleted} lượt
            </div>
          </div>

          <div className="bg-[#0f172a]/70 border border-[#1e293b] rounded-2xl p-4 flex flex-col gap-1 backdrop-blur-md">
            <span className="text-xs text-[#94a3b8] font-bold">
              📈 {lang === 'vi' ? 'TỈ LỆ HOÀN THÀNH (CR)' : 'CONVERSION RATE'}
            </span>
            <div className="text-2xl font-mono font-extrabold text-[#f59e0b]">
              {stats.overallConversionRate}%
            </div>
            <div className="text-[11px] text-[#94a3b8]">
              {stats.blockedSessions} lượt bị chặn (Anti-Bot)
            </div>
          </div>

          <div className="bg-[#0f172a]/70 border border-[#1e293b] rounded-2xl p-4 flex flex-col gap-1 backdrop-blur-md">
            <span className="text-xs text-[#94a3b8] font-bold">
              🔌 {lang === 'vi' ? 'NHÀ MẠNG ĐANG BẬT' : 'ACTIVE PROVIDERS'}
            </span>
            <div className="text-2xl font-mono font-extrabold text-[#a855f7]">
              {stats.activeProvidersCount} / {providers.length}
            </div>
            <div className="text-[11px] text-[#a855f7]">
              Tự động Failover khi lỗi
            </div>
          </div>
        </div>
      )}

      {/* Providers Table */}
      <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="p-4 border-b border-white/10 flex justify-between items-center flex-wrap gap-2">
          <h3 className="text-base font-heading font-extrabold text-white m-0 flex items-center gap-2">
            🌐 {lang === 'vi' ? 'Danh Sách Nhà Cung Cấp API Rút Gọn' : 'Shortlink API Providers'}
          </h3>
          <span className="text-xs text-[#94a3b8]">
            {lang === 'vi' ? 'Phân chia lưu lượng dựa trên trọng số %' : 'Traffic allocated by weight ratio'}
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-[#94a3b8] text-sm">
            ⏳ {lang === 'vi' ? 'Đang tải dữ liệu cổng link...' : 'Loading providers...'}
          </div>
        ) : providers.length === 0 ? (
          <div className="p-12 text-center text-[#94a3b8] flex flex-col items-center gap-3">
            <div className="text-4xl">🔌</div>
            <div>{lang === 'vi' ? 'Chưa có nhà mạng link vượt nào được kết nối.' : 'No shortlink providers added yet.'}</div>
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl bg-[#38bdf8]/20 text-[#38bdf8] font-bold text-xs border border-[#38bdf8]/30 cursor-pointer"
            >
              + {lang === 'vi' ? 'Thêm Nhà Mạng Đầu Tiên' : 'Add First Provider'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#1e293b]/80 text-[#94a3b8] uppercase font-bold tracking-wider border-b border-white/10">
                  <th className="p-3.5">Trạng thái</th>
                  <th className="p-3.5">Tên Nhà Mạng</th>
                  <th className="p-3.5">API Endpoint</th>
                  <th className="p-3.5">API Token</th>
                  <th className="p-3.5">Tỉ lệ Traffic</th>
                  <th className="p-3.5">Lượt Click</th>
                  <th className="p-3.5">Hoàn Thành (CR)</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {providers.map((p) => {
                  const weightPercent = totalWeight > 0 && p.isActive ? Math.round(((p.weight || 1) / totalWeight) * 100) : 0;
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            p.isActive ? 'bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30' : 'bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
                          {p.isActive ? 'Hoạt động' : 'Tạm tắt'}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-white">
                        {p.name}
                      </td>
                      <td className="p-3.5 font-mono text-[#7dd3fc] truncate max-w-[200px]">
                        {p.apiUrl}
                      </td>
                      <td className="p-3.5 font-mono text-[#94a3b8]">
                        {p.apiToken}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-xs">{weightPercent}%</span>
                          <span className="text-[11px] text-[#64748b]">(Trọng số: {p.weight})</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-white">
                        {(p.totalClicks || 0).toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[#22c55e] font-bold">
                            {(p.totalCompleted || 0).toLocaleString()}
                          </span>
                          <span className="text-[11px] bg-white/10 px-1.5 py-0.5 rounded text-[#cbd5e1] font-bold">
                            {p.conversionRate || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="p-1.5 px-2.5 rounded-lg bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30 hover:bg-[#38bdf8]/25 cursor-pointer transition-all font-bold"
                          >
                            ✏️ Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingProvider(p)}
                            className="p-1.5 px-2.5 rounded-lg bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30 hover:bg-[#ef4444]/25 cursor-pointer transition-all font-bold"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-[14px] flex justify-center items-start z-[999999] p-[20px_16px] overflow-y-auto animate-[fadeIn_0.25s_ease-out]"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="w-[min(600px,94vw)] bg-[#0f172a] border border-[#38bdf8]/35 rounded-[24px] p-7 backdrop-blur-[24px] shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(56,189,248,0.15)] relative flex flex-col gap-4 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="m-0 text-[#38bdf8] text-lg font-heading font-extrabold flex items-center gap-2">
                  🔌 {editingProvider ? (lang === 'vi' ? 'Chỉnh Sửa Nhà Mạng API' : 'Edit Provider API') : (lang === 'vi' ? 'Thêm Nhà Mạng Rút Gọn Mới' : 'Add New Shortlink Provider')}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-transparent border-0 text-[#94a3b8] text-2xl cursor-pointer hover:text-white"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#e2e8f0]">
                      Tên Nhà Mạng (*):
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="VD: Link1s VIP, Link4m, Yeumoney..."
                      className="px-3.5 py-2.5 rounded-xl border border-[#38bdf8]/30 bg-[#080c14] text-white text-xs outline-none focus:border-[#38bdf8]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#e2e8f0]">
                      Trọng số phân chia (%):
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={formWeight}
                      onChange={(e) => setFormWeight(Number(e.target.value))}
                      placeholder="VD: 50, 30, 20"
                      className="px-3.5 py-2.5 rounded-xl border border-[#38bdf8]/30 bg-[#080c14] text-white text-xs outline-none focus:border-[#38bdf8]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#e2e8f0]">
                    API Endpoint URL (*):
                  </label>
                  <input
                    type="text"
                    value={formApiUrl}
                    onChange={(e) => setFormApiUrl(e.target.value)}
                    placeholder="https://link1s.com/api"
                    className="px-3.5 py-2.5 rounded-xl border border-[#38bdf8]/30 bg-[#080c14] text-white text-xs font-mono outline-none focus:border-[#38bdf8]"
                  />
                  <small className="text-[11px] text-[#64748b]">
                    Hầu hết các trang rút gọn đều có endpoint dạng: https://domain.com/api
                  </small>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#e2e8f0]">
                    API Token / API Key (*):
                  </label>
                  <input
                    type="text"
                    value={formApiToken}
                    onChange={(e) => setFormApiToken(e.target.value)}
                    placeholder="Nhập API Token lấy từ tài khoản của bạn..."
                    className="px-3.5 py-2.5 rounded-xl border border-[#38bdf8]/30 bg-[#080c14] text-white text-xs font-mono outline-none focus:border-[#38bdf8]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#94a3b8]">
                      Param Token (Mặc định: api):
                    </label>
                    <input
                      type="text"
                      value={formParamTokenName}
                      onChange={(e) => setFormParamTokenName(e.target.value)}
                      className="px-3.5 py-2 rounded-xl border border-white/10 bg-[#080c14] text-white text-xs font-mono outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#94a3b8]">
                      Param URL (Mặc định: url):
                    </label>
                    <input
                      type="text"
                      value={formParamUrlName}
                      onChange={(e) => setFormParamUrlName(e.target.value)}
                      className="px-3.5 py-2 rounded-xl border border-white/10 bg-[#080c14] text-white text-xs font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 accent-[#38bdf8] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-white cursor-pointer" onClick={() => setFormIsActive(!formIsActive)}>
                    Bật kích hoạt nhà mạng này trong hệ thống xoay link
                  </span>
                </div>

                {/* Test API Box */}
                <div className="bg-[#080c14] border border-white/10 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[#38bdf8]">
                      🧪 Kiểm tra kết nối API thực tế:
                    </span>
                    <button
                      type="button"
                      onClick={handleTestApi}
                      disabled={isTesting}
                      className="px-3 py-1 rounded-lg bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30 hover:bg-[#38bdf8]/30 font-bold text-xs cursor-pointer transition-all disabled:opacity-50"
                    >
                      {isTesting ? '⏳ Đang test...' : '⚡ Bấm Test Ngay'}
                    </button>
                  </div>

                  {testResult && (
                    <div
                      className={`p-2.5 rounded-lg text-xs flex flex-col gap-1 ${
                        testResult.success ? 'bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e]' : 'bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#ef4444]'
                      }`}
                    >
                      <div className="font-bold">{testResult.message}</div>
                      {testResult.shortenedUrl && (
                        <div className="font-mono text-white text-[11px] break-all">
                          Link mẫu: {testResult.shortenedUrl} ({testResult.responseTimeMs}ms)
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2.5 justify-end pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-[#334155] bg-[#1e293b] text-[#e2e8f0] font-bold text-xs cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl border-0 bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white font-extrabold text-xs cursor-pointer shadow-[0_4px_14px_rgba(56,189,248,0.3)] hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {isSaving ? '⏳ Đang lưu...' : '💾 Lưu Nhà Mạng'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Confirm Delete Modal */}
      {deletingProvider && (
        <ConfirmModal
          isOpen={true}
          title={lang === 'vi' ? 'Xác Nhận Xóa Nhà Mạng' : 'Confirm Delete Provider'}
          message={lang === 'vi' ? `Bạn có chắc chắn muốn xóa nhà mạng [${deletingProvider.name}] khỏi hệ thống?` : `Are you sure to delete [${deletingProvider.name}]?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingProvider(null)}
          lang={lang}
        />
      )}
    </div>
  );
}
