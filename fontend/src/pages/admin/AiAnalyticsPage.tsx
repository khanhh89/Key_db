import { useState, useEffect } from 'react';
import type { Language, AiMetricsData, AiAnalysisResponse, AiAnalysisReport, AiConfig } from '../../types';
import {
  fetchAiMetrics,
  triggerAiAnalysis,
  fetchAiReports,
  deleteAiReport,
  fetchAiConfig,
  updateAiConfig,
  testGeminiApiKey,
  formatDateTime
} from '../../services/api';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { ModalPortal } from '../../components/common/ModalPortal';

interface AiAnalyticsPageProps {
  lang: Language;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

type TabType = 'OVERVIEW' | 'HISTORY' | 'SETTINGS';

export function AiAnalyticsPage({ lang, showToast }: AiAnalyticsPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [timeframe, setTimeframe] = useState<string>('ALL');

  // Metrics & Active Report
  const [metrics, setMetrics] = useState<AiMetricsData | null>(null);
  const [activeReport, setActiveReport] = useState<AiAnalysisResponse | null>(null);
  const [reportsList, setReportsList] = useState<AiAnalysisReport[]>([]);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);

  // Loading & Action States
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [deleteReportId, setDeleteReportId] = useState<number | null>(null);
  const [isQuickConfigOpen, setIsQuickConfigOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Form State for AI Settings
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelSelect, setModelSelect] = useState('gemini-3.5-flash');
  const [customModelInput, setCustomModelInput] = useState('');
  const [customPromptInput, setCustomPromptInput] = useState('');
  const [customFocusInput, setCustomFocusInput] = useState('');

  const openQuickConfigModal = () => {
    if (aiConfig?.geminiApiKey && !aiConfig.geminiApiKey.includes('••••')) {
      setApiKeyInput(aiConfig.geminiApiKey);
    } else {
      const raw = localStorage.getItem('modlienquan_gemini_api_key');
      if (raw) setApiKeyInput(raw);
    }
    setIsQuickConfigOpen(true);
  };

  // Initial Data Load
  useEffect(() => {
    loadDashboardData();
    loadReports();
    loadConfig();
  }, [timeframe]);

  const loadDashboardData = async () => {
    setIsLoadingMetrics(true);
    try {
      const data = await fetchAiMetrics(timeframe);
      setMetrics(data);
    } catch (err: any) {
      console.warn('Failed to load metrics:', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const loadReports = async () => {
    try {
      const reports = await fetchAiReports();
      setReportsList(reports);
      // Auto display latest report if available and not set yet
      if (reports.length > 0 && !activeReport) {
        const latest = reports[0];
        setActiveReport({
          reportId: latest.id,
          timeframe: latest.scope,
          uxHealthScore: latest.uxHealthScore,
          healthStatus: latest.healthStatus,
          summary: latest.summary,
          userBehaviorAnalysis: latest.userBehaviorAnalysis,
          painPointsAnalysis: latest.painPointsAnalysis,
          recommendations: latest.recommendations,
          aiModelUsed: latest.aiModelUsed,
          createdAt: latest.createdAt,
          metrics: metrics || (latest.rawMetricsJson ? JSON.parse(latest.rawMetricsJson) : null)
        });
      }
    } catch (err) {
      console.warn('Failed to load reports:', err);
    }
  };

  const loadConfig = async () => {
    try {
      const cfg = await fetchAiConfig();
      setAiConfig(cfg);
      if (cfg.geminiApiKey && !cfg.geminiApiKey.includes('••••')) {
        setApiKeyInput(cfg.geminiApiKey);
      } else {
        const raw = localStorage.getItem('modlienquan_gemini_api_key');
        if (raw) setApiKeyInput(raw);
      }
      const m = cfg.aiModel || 'gemini-3.5-flash';
      const standardModels = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
      if (standardModels.includes(m)) {
        setModelSelect(m);
        setCustomModelInput('');
      } else {
        setModelSelect('CUSTOM');
        setCustomModelInput(m);
      }
      setCustomPromptInput(cfg.aiCustomPrompt || '');
    } catch (err) {
      console.warn('Failed to load AI config:', err);
    }
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    showToast(
      lang === 'vi'
        ? '🤖 Đang tổng hợp dữ liệu và kích hoạt AI phân tích...'
        : '🤖 Aggregating telemetry & running AI analysis...',
      'info'
    );
    try {
      const result = await triggerAiAnalysis(timeframe, customFocusInput.trim() || undefined);
      setActiveReport(result);
      if (result.metrics) setMetrics(result.metrics);
      await loadReports();
      showToast(
        lang === 'vi'
          ? '🎉 Hoàn tất phân tích AI! Báo cáo chiến lược đã được cập nhật.'
          : '🎉 AI Analysis completed! Strategic report updated.',
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Phân tích AI thất bại', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTestKey = async () => {
    const keyToTest = apiKeyInput.trim() || aiConfig?.geminiApiKey || localStorage.getItem('modlienquan_gemini_api_key') || '';
    if (!keyToTest || keyToTest.includes('••••')) {
      showToast(
        lang === 'vi'
          ? '⚠️ Vui lòng nhập đầy đủ Google Gemini API Key trước khi kiểm tra!'
          : 'Please paste full Gemini API Key before testing!',
        'warning'
      );
      return;
    }

    setIsTestingKey(true);
    showToast(
      lang === 'vi' ? '⏳ Đang kiểm tra kết nối Google Gemini API...' : 'Testing connection to Google Gemini API...',
      'info'
    );

    try {
      const finalModel = modelSelect === 'CUSTOM' ? (customModelInput.trim() || 'gemini-3.5-flash') : modelSelect;
      const res = await testGeminiApiKey(keyToTest, finalModel);
      if (res.success) {
        showToast(`✅ ${res.message}`, 'success');
      } else {
        showToast(`❌ ${res.message}`, 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Kiểm tra thất bại', 'error');
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleClearKey = async () => {
    if (!window.confirm(lang === 'vi' ? 'Bạn có chắc chắn muốn xóa API Key và quay về chế độ Smart Heuristic mặc định?' : 'Clear API Key and revert to Smart Heuristic?')) {
      return;
    }
    setIsSavingConfig(true);
    try {
      const updated = await updateAiConfig({ geminiApiKey: '' });
      setAiConfig(updated);
      setApiKeyInput('');
      showToast(lang === 'vi' ? '🗑️ Đã xóa API Key. Hệ thống đang dùng Smart Heuristic.' : 'API Key removed.', 'info');
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi xóa key', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const enteredKey = apiKeyInput.trim();
    if (!enteredKey && !aiConfig?.hasApiKey) {
      showToast(lang === 'vi' ? '⚠️ Vui lòng dán Google Gemini API Key trước khi lưu!' : 'Please paste Google Gemini API Key before saving!', 'warning');
      return;
    }
    setIsSavingConfig(true);
    try {
      const finalModel = modelSelect === 'CUSTOM' ? (customModelInput.trim() || 'gemini-3.5-flash') : modelSelect;
      const payload: Partial<AiConfig> = {
        aiModel: finalModel,
        aiCustomPrompt: customPromptInput.trim()
      };
      if (enteredKey) {
        payload.geminiApiKey = enteredKey;
      } else if (aiConfig?.geminiApiKey && !aiConfig.geminiApiKey.includes('••••')) {
        payload.geminiApiKey = aiConfig.geminiApiKey;
      }
      const updated = await updateAiConfig(payload);
      setAiConfig(updated);
      if (updated.geminiApiKey && !updated.geminiApiKey.includes('••••')) {
        setApiKeyInput(updated.geminiApiKey);
      }
      setIsQuickConfigOpen(false);
      showToast(
        lang === 'vi' ? '🎉 Đã lưu API Key & nâng cấp Gemini Flash 3.5 thành công!' : '✅ API Key & Gemini Flash 3.5 saved successfully!',
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Lưu cấu hình thất bại', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!deleteReportId) return;
    try {
      await deleteAiReport(deleteReportId);
      showToast(lang === 'vi' ? '🗑️ Đã xóa báo cáo AI.' : 'Report deleted.', 'success');
      if (activeReport?.reportId === deleteReportId) {
        setActiveReport(null);
      }
      loadReports();
    } catch (err: any) {
      showToast(err.message || 'Không thể xóa báo cáo', 'error');
    } finally {
      setDeleteReportId(null);
    }
  };

  const handleExportMarkdown = () => {
    if (!activeReport) {
      showToast(lang === 'vi' ? 'Chưa có báo cáo để xuất!' : 'No report to export!', 'warning');
      return;
    }
    const content = `# BÁO CÁO PHÂN TÍCH AI & TRẢI NGHIỆM NGƯỜI DÙNG
- Thời gian phân tích: ${formatDateTime(activeReport.createdAt)}
- Phạm vi thống kê: ${activeReport.timeframe}
- Điểm Sức Khỏe UX: ${activeReport.uxHealthScore}/100 (${activeReport.healthStatus})
- AI Engine: ${activeReport.aiModelUsed}

---

## 📌 Tóm Tắt Điều Hành (Executive Summary)
${activeReport.summary}

---

## 👥 1. Phân Tích Hành Vi Người Dùng & Xu Hướng Sử Dụng
${activeReport.userBehaviorAnalysis}

---

## ⚠️ 2. Các Khó Khăn & Điểm Nghẽn Phát Hiện (Pain Points & Friction)
${activeReport.painPointsAnalysis}

---

## 💡 3. Kế Hoạch & Đề Xuất Cải Tiến Hệ Thống
${activeReport.recommendations}
`;

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AI_Analysis_Report_${activeReport.timeframe}_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(lang === 'vi' ? '📥 Đã xuất báo cáo Markdown thành công!' : 'Markdown report downloaded!', 'success');
  };

  // Helper colors for UX Health Score
  const getScoreColor = (score: number) => {
    if (score >= 85) return { text: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', label: 'Xuất Sắc (Optimal)' };
    if (score >= 70) return { text: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.3)', label: 'Tốt (Good)' };
    if (score >= 50) return { text: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', label: 'Cần Cải Thiện (Needs Attention)' };
    return { text: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', label: 'Báo Động (Critical)' };
  };

  const currentScore = activeReport?.uxHealthScore ?? metrics?.calculatedUxHealthScore ?? 85;
  const scoreInfo = getScoreColor(currentScore);

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in-up p-4 md:p-6 text-[#f8fafc]">
      {/* 1. TOP WELCOME & AI LAUNCH BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] border border-[#4338ca]/50 rounded-3xl p-6 md:p-8 shadow-[0_10px_40px_rgba(79,70,229,0.15)] flex flex-col lg:flex-row justify-between lg:items-center gap-6">
        {/* Glow Spheres */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-80 h-80 bg-[#8b5cf6] rounded-full blur-[110px] opacity-25 pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-80 h-80 bg-[#06b6d4] rounded-full blur-[110px] opacity-20 pointer-events-none" />

        <div className="flex flex-col gap-2 z-10 max-w-2xl">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#c084fc] flex items-center gap-1.5 shadow-[0_0_12px_rgba(139,92,246,0.3)]">
              <span className="w-2 h-2 rounded-full bg-[#c084fc] animate-ping" />
              AI Intelligence Engine
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-[#cbd5e1] border border-white/10">
              Provider: {aiConfig?.activeProvider === 'GEMINI_AI' ? '⚡ Google Gemini AI' : '🧠 Built-in Smart Heuristic'}
            </span>
          </div>

          <h2 className="m-0 text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-[#e2e8f0] to-[#c7d2fe] flex items-center gap-3">
            🤖 {lang === 'vi' ? 'Phân Tích Hành Vi & Điểm Nghẽn Người Dùng' : 'AI User Behavior & Pain Points Analytics'}
          </h2>
          <p className="m-0 text-sm text-[#94a3b8] font-medium leading-relaxed">
            {lang === 'vi'
              ? 'Tự động phát hiện các khó khăn, sự cố gián đoạn mua hàng, phân tích tâm lý phản hồi của khách và đề xuất giải pháp cải tiến hệ thống.'
              : 'Automatically identify user friction, abandoned checkouts, complaint sentiments, and get prioritized AI system improvements.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap z-10">
          <button
            onClick={openQuickConfigModal}
            className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm cursor-pointer transition-all duration-300 flex items-center gap-2 hover:-translate-y-0.5 shadow-lg backdrop-blur-md"
            title="Gắn API Key và thay đổi phiên bản Gemini Model"
          >
            <span>🔑</span>
            <span>{lang === 'vi' ? 'Gắn API Key / Flash 3.5' : 'API Key / Flash 3.5'}</span>
          </button>

          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className={`px-6 py-3.5 rounded-2xl font-bold text-sm text-white shadow-[0_4px_20px_rgba(139,92,246,0.4)] transition-all duration-300 flex items-center gap-2.5 cursor-pointer hover:-translate-y-0.5 ${
              isAnalyzing
                ? 'bg-gradient-to-r from-[#6366f1] to-[#a855f7] opacity-80 cursor-wait animate-pulse'
                : 'bg-gradient-to-r from-[#8b5cf6] via-[#6366f1] to-[#38bdf8] hover:shadow-[0_6px_25px_rgba(139,92,246,0.6)]'
            }`}
          >
            {isAnalyzing ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>{lang === 'vi' ? 'Đang Phân Tích AI...' : 'AI Analyzing...'}</span>
              </>
            ) : (
              <>
                <span className="text-lg">🚀</span>
                <span>{lang === 'vi' ? 'Kích Hoạt Phân Tích AI' : 'Run AI Analysis'}</span>
              </>
            )}
          </button>

          {activeReport && (
            <button
              onClick={handleExportMarkdown}
              className="px-4 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm cursor-pointer transition-all duration-300 flex items-center gap-2 hover:-translate-y-0.5"
              title="Xuất file Markdown"
            >
              <span>📥</span>
              <span>{lang === 'vi' ? 'Xuất Báo Cáo' : 'Export'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. TIMEFRAME SELECTOR & NAVIGATION TABS */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-[#0f172a]/60 border border-[#1e293b] rounded-2xl p-3 backdrop-blur-md">
        {/* Navigation Tabs */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer flex items-center gap-2 ${
              activeTab === 'OVERVIEW'
                ? 'bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white shadow-[0_4px_12px_rgba(139,92,246,0.35)]'
                : 'bg-[#1e293b]/50 text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#cbd5e1]'
            }`}
          >
            <span>📊</span>
            <span>{lang === 'vi' ? 'Báo Cáo & Số Liệu AI' : 'AI Insights & Metrics'}</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer flex items-center gap-2 ${
              activeTab === 'HISTORY'
                ? 'bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white shadow-[0_4px_12px_rgba(139,92,246,0.35)]'
                : 'bg-[#1e293b]/50 text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#cbd5e1]'
            }`}
          >
            <span>📜</span>
            <span>{lang === 'vi' ? 'Lịch Sử Báo Cáo' : 'Reports Archive'} ({reportsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer flex items-center gap-2 ${
              activeTab === 'SETTINGS'
                ? 'bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white shadow-[0_4px_12px_rgba(139,92,246,0.35)]'
                : 'bg-[#1e293b]/50 text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#cbd5e1]'
            }`}
          >
            <span>⚙️</span>
            <span>{lang === 'vi' ? 'Cấu Hình AI Engine' : 'AI Engine Settings'}</span>
          </button>
        </div>

        {/* Timeframe Filter Bar */}
        <div className="flex items-center gap-2 bg-[#0b0f19] p-1.5 rounded-xl border border-white/5 self-start md:self-auto">
          <span className="text-xs text-[#94a3b8] font-bold px-2 whitespace-nowrap flex items-center gap-1.5">
            🗓️ Phạm vi:
            {isLoadingMetrics && (
              <span className="w-3 h-3 rounded-full border border-[#38bdf8] border-t-transparent animate-spin inline-block" />
            )}
          </span>
          {['ALL', 'TODAY', '7DAYS', '30DAYS'].map((tf) => {
            const labels: any = { ALL: 'Tất cả', TODAY: '24 Giờ', '7DAYS': '7 Ngày', '30DAYS': '30 Ngày' };
            const labelsEn: any = { ALL: 'All Time', TODAY: '24h', '7DAYS': '7 Days', '30DAYS': '30 Days' };
            const isSelected = timeframe === tf;
            return (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-[#38bdf8] text-[#0f172a] font-bold shadow-[0_0_10px_rgba(56,189,248,0.4)]'
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                }`}
              >
                {lang === 'vi' ? labels[tf] : labelsEn[tf]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. TAB 1 CONTENT: OVERVIEW, UX HEALTH GAUGE, FRICTION CARDS & AI REPORT */}
      {activeTab === 'OVERVIEW' && (
        <div className="flex flex-col gap-6">
          {/* Top Metrics Row: UX Health Gauge + Traffic/Friction Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* CARD 1: UX HEALTH SCORE GAUGE */}
            <div
              className="relative overflow-hidden rounded-2xl p-5 border flex flex-col justify-between"
              style={{
                background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))',
                borderColor: scoreInfo.border,
                boxShadow: `0 8px 30px ${scoreInfo.bg}`
              }}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
                  {lang === 'vi' ? 'Điểm Sức Khỏe UX' : 'UX Health Score'}
                </span>
                <span className="text-xl">🎯</span>
              </div>

              <div className="my-3 flex items-baseline gap-2">
                <span className="text-5xl font-black" style={{ color: scoreInfo.text }}>
                  {currentScore}
                </span>
                <span className="text-sm text-[#64748b] font-bold">/ 100</span>
              </div>

              <div>
                <div
                  className="px-3 py-1 rounded-lg text-xs font-extrabold inline-block tracking-wide mb-1.5"
                  style={{ background: scoreInfo.bg, color: scoreInfo.text, border: `1px solid ${scoreInfo.border}` }}
                >
                  {scoreInfo.label}
                </div>
                <p className="text-[11.5px] text-[#94a3b8] m-0">
                  {lang === 'vi'
                    ? 'Đo lường độ mượt mà khi mua key và tỉ lệ hài lòng của khách.'
                    : 'Measuring smoothness of checkout and customer satisfaction.'}
                </p>
              </div>
            </div>

            {/* CARD 2: CONVERSION FUNNEL & REVENUE */}
            <div className="bg-[#0f172a]/70 border border-[#1e293b] rounded-2xl p-5 flex flex-col justify-between shadow-md backdrop-blur-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
                  {lang === 'vi' ? 'Hoàn Tất / Bỏ Dở' : 'Conversion / Drop-off'}
                </span>
                <span className="text-xl">📈</span>
              </div>

              <div className="my-2 flex flex-col gap-1">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-[#10b981]">✓ Thành công (Paid):</span>
                  <strong className="text-white">{metrics?.paidOrders ?? 0} ({metrics?.conversionRate ?? 0}%)</strong>
                </div>
                <div className="w-full bg-[#1e293b] h-2 rounded-full overflow-hidden flex">
                  <div
                    className="bg-[#10b981] h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, metrics?.conversionRate ?? 0)}%` }}
                  />
                  <div
                    className="bg-[#ef4444] h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, metrics?.abandonmentRate ?? 0)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-sm font-semibold mt-1">
                  <span className="text-[#f87171]">⚠️ Bỏ dở (Drop-off):</span>
                  <strong className="text-white">{metrics?.pendingOrders ?? 0} ({metrics?.abandonmentRate ?? 0}%)</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1e293b] flex justify-between items-center text-xs">
                <span className="text-[#94a3b8]">{lang === 'vi' ? 'Doanh thu thu về:' : 'Total Revenue:'}</span>
                <strong className="text-[#38bdf8] font-mono font-bold text-sm">
                  {metrics?.totalRevenue ? `${metrics.totalRevenue.toLocaleString()}đ` : '0đ'}
                </strong>
              </div>
            </div>

            {/* CARD 3: USER DEVICES & TRAFFIC */}
            <div className="bg-[#0f172a]/70 border border-[#1e293b] rounded-2xl p-5 flex flex-col justify-between shadow-md backdrop-blur-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
                  {lang === 'vi' ? 'Thiết Bị & Lưu Lượng' : 'Devices & Traffic'}
                </span>
                <span className="text-xl">📱</span>
              </div>

              <div className="my-2 flex flex-col gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white">{metrics?.uniqueDevices ?? 0}</span>
                  <span className="text-xs text-[#94a3b8]">{lang === 'vi' ? 'thiết bị độc nhất' : 'unique devices'}</span>
                </div>

                <div className="flex items-center gap-3 text-xs font-medium text-[#cbd5e1]">
                  <div className="flex items-center gap-1.5">
                    <span>📲 Mobile:</span>
                    <strong className="text-[#38bdf8]">{metrics?.mobileDevices ?? 0}</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>💻 Desktop:</span>
                    <strong className="text-[#c084fc]">{metrics?.desktopDevices ?? 0}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1e293b] flex justify-between items-center text-xs text-[#94a3b8]">
                <span>{lang === 'vi' ? 'Tổng lượt xem trang:' : 'Page views:'}</span>
                <strong className="text-white font-mono">{metrics?.totalPageViews ?? 0}</strong>
              </div>
            </div>

            {/* CARD 4: FRICTION SIGNALS & FEEDBACK */}
            <div className="bg-[#0f172a]/70 border border-[#1e293b] rounded-2xl p-5 flex flex-col justify-between shadow-md backdrop-blur-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
                  {lang === 'vi' ? 'Phản Hồi & Sự Cố' : 'Feedback & Friction'}
                </span>
                <span className="text-xl">💬</span>
              </div>

              <div className="my-2 flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#94a3b8]">Đánh giá trung bình:</span>
                  <strong className="text-[#f59e0b] font-bold">
                    ⭐ {metrics?.avgRating ?? 5.0} / 5 ({metrics?.totalFeedbacks ?? 0})
                  </strong>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#94a3b8]">Khách phản ánh / báo lỗi:</span>
                  <strong className="text-[#ef4444] font-bold">
                    {(metrics?.bugReportsCount ?? 0) + (metrics?.complaintsCount ?? 0)} lượt
                  </strong>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#94a3b8]">Khách xem lúc hết key:</span>
                  <strong className={metrics?.keyStockoutIncidents ? 'text-[#ef4444] font-bold' : 'text-[#10b981]'}>
                    {metrics?.keyStockoutIncidents ?? 0} lần
                  </strong>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1e293b] flex justify-between items-center text-xs text-[#94a3b8]">
                <span>Tra cứu sai mã:</span>
                <strong className="text-[#f59e0b] font-mono">{metrics?.lookupNotFoundIncidents ?? 0} lần</strong>
              </div>
            </div>
          </div>

          {/* Friction Points Identified Bar */}
          {metrics?.topFrictionPoints && metrics.topFrictionPoints.length > 0 && (
            <div className="bg-[#0f172a]/60 border border-[#334155]/60 rounded-2xl p-5 backdrop-blur-md">
              <h3 className="m-0 text-base font-bold text-[#f1f5f9] flex items-center gap-2 mb-3">
                <span className="text-lg">⚠️</span>
                <span>{lang === 'vi' ? 'Các Điểm Nghẽn Trải Nghiệm Phát Hiện Thực Tế' : 'Detected User Friction Points'}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {metrics.topFrictionPoints.map((fp, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border bg-[#1e293b]/40 flex flex-col justify-between gap-2"
                    style={{
                      borderColor:
                        fp.severity === 'HIGH'
                          ? 'rgba(239, 68, 68, 0.4)'
                          : fp.severity === 'MEDIUM'
                          ? 'rgba(245, 158, 11, 0.4)'
                          : 'rgba(56, 189, 248, 0.3)'
                    }}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <strong className="text-xs text-white leading-snug">{fp.title}</strong>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0"
                        style={{
                          background:
                            fp.severity === 'HIGH'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : fp.severity === 'MEDIUM'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(56, 189, 248, 0.15)',
                          color:
                            fp.severity === 'HIGH'
                              ? '#ef4444'
                              : fp.severity === 'MEDIUM'
                              ? '#f59e0b'
                              : '#38bdf8'
                        }}
                      >
                        {fp.severity}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#94a3b8] m-0 leading-relaxed">{fp.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MAIN AI STRATEGIC REPORT DISPLAY */}
          <div className="bg-[#0f172a]/80 border border-[#1e293b] rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md flex flex-col gap-6">
            <div className="flex justify-between items-center flex-wrap gap-4 border-b border-[#1e293b] pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/20 text-[#c084fc] flex items-center justify-center text-xl shrink-0">
                  🧠
                </div>
                <div>
                  <h3 className="m-0 text-xl font-bold text-white flex items-center gap-2">
                    {lang === 'vi' ? 'Bản Đồ Phân Tích Chiến Lược Của AI' : 'AI Strategic Insight & Recommendations'}
                  </h3>
                  <p className="m-0 text-xs text-[#94a3b8] mt-0.5">
                    {activeReport
                      ? `Phân tích lúc ${formatDateTime(activeReport.createdAt)} bởi [${activeReport.aiModelUsed}]`
                      : 'Chưa có báo cáo AI. Hãy bấm nút "Kích Hoạt Phân Tích AI" ở trên.'}
                  </p>
                </div>
              </div>

              {activeReport && (
                <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[#cbd5e1]">
                  <span>Phạm vi:</span>
                  <strong className="text-[#38bdf8]">{activeReport.timeframe}</strong>
                </div>
              )}
            </div>

            {/* Custom Focus Prompt Box */}
            <div className="flex flex-col sm:flex-row gap-3 bg-[#080c14] p-3 rounded-2xl border border-[#1e293b]">
              <input
                type="text"
                value={customFocusInput}
                onChange={(e) => setCustomFocusInput(e.target.value)}
                placeholder={
                  lang === 'vi'
                    ? '🎯 Nhập yêu cầu tập trung riêng cho AI (Ví dụ: "Tập trung phân tích vì sao đơn bị hủy nhiều nhất vào buổi tối")...'
                    : '🎯 Optional AI focus (e.g., "Analyze why checkout drops happen at night")...'
                }
                className="flex-1 bg-transparent border-0 text-xs md:text-sm text-white outline-none px-2"
              />
              <button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className="px-4 py-2 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-bold cursor-pointer transition-colors whitespace-nowrap"
              >
                {lang === 'vi' ? 'Phân Tích Với Yêu Cầu Này' : 'Analyze With Focus'}
              </button>
            </div>

            {/* Report Sections */}
            {activeReport ? (
              <div className="flex flex-col gap-6">
                {/* SECTION: SUMMARY */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-[#6366f1]/10 via-[#8b5cf6]/10 to-transparent border border-[#6366f1]/30">
                  <h4 className="m-0 text-sm font-extrabold uppercase tracking-wider text-[#a5b4fc] mb-2 flex items-center gap-2">
                    <span>📌</span>
                    <span>{lang === 'vi' ? 'Tóm Tắt Điều Hành' : 'Executive Summary'}</span>
                  </h4>
                  <p className="m-0 text-sm text-[#e2e8f0] leading-relaxed font-medium">
                    {activeReport.summary}
                  </p>
                </div>

                {/* 2-COLUMN: USER BEHAVIOR VS PAIN POINTS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Behavior */}
                  <div className="p-6 rounded-2xl bg-[#1e293b]/50 border border-[#334155]/60 flex flex-col gap-3">
                    <h4 className="m-0 text-sm font-extrabold uppercase tracking-wider text-[#38bdf8] flex items-center gap-2">
                      <span>👥</span>
                      <span>{lang === 'vi' ? '1. Hành Vi Người Dùng & Xu Hướng' : '1. User Behavior Insights'}</span>
                    </h4>
                    <div className="text-sm text-[#cbd5e1] leading-relaxed whitespace-pre-line">
                      {activeReport.userBehaviorAnalysis}
                    </div>
                  </div>

                  {/* Right Column: Pain Points */}
                  <div className="p-6 rounded-2xl bg-[#1e293b]/50 border border-[#334155]/60 flex flex-col gap-3">
                    <h4 className="m-0 text-sm font-extrabold uppercase tracking-wider text-[#f87171] flex items-center gap-2">
                      <span>⚠️</span>
                      <span>{lang === 'vi' ? '2. Khó Khăn & Điểm Nghẽn Phát Hiện' : '2. Identified Pain Points & Friction'}</span>
                    </h4>
                    <div className="text-sm text-[#cbd5e1] leading-relaxed whitespace-pre-line">
                      {activeReport.painPointsAnalysis}
                    </div>
                  </div>
                </div>

                {/* FULL WIDTH: ACTIONABLE RECOMMENDATIONS */}
                <div className="p-6 md:p-7 rounded-2xl bg-[#1e293b]/60 border border-[#10b981]/30 flex flex-col gap-3 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
                  <h4 className="m-0 text-base font-extrabold uppercase tracking-wider text-[#34d399] flex items-center gap-2">
                    <span>💡</span>
                    <span>{lang === 'vi' ? '3. Đề Xuất Cải Tiến Hệ Thống Theo Thứ Tự Ưu Tiên' : '3. Prioritized Actionable Improvements'}</span>
                  </h4>
                  <div className="text-sm text-[#f1f5f9] leading-relaxed whitespace-pre-line bg-[#080c14]/40 p-5 rounded-xl border border-white/5 font-mono text-[13px]">
                    {activeReport.recommendations}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-16 text-center text-[#94a3b8] flex flex-col items-center gap-3">
                <span className="text-4xl">🤖</span>
                <p className="text-sm max-w-md m-0">
                  {lang === 'vi'
                    ? 'Chưa có bản phân tích nào được tạo. Hãy bấm nút "Kích Hoạt Phân Tích AI" để hệ thống tự động tổng hợp toàn bộ dữ liệu thực tế và xuất báo cáo.'
                    : 'No AI analysis generated yet. Click "Run AI Analysis" to generate comprehensive insights.'}
                </p>
                <button
                  onClick={handleRunAnalysis}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-[#8b5cf6] text-white font-bold text-xs cursor-pointer hover:bg-[#7c3aed] transition-colors"
                >
                  🚀 {lang === 'vi' ? 'Phân Tích Ngay' : 'Run Analysis Now'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. TAB 2 CONTENT: REPORTS ARCHIVE */}
      {activeTab === 'HISTORY' && (
        <div className="bg-[#0f172a]/70 border border-[#1e293b] rounded-2xl p-6 backdrop-blur-md flex flex-col gap-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <h3 className="m-0 text-lg font-bold text-white">📜 {lang === 'vi' ? 'Lịch Sử Các Lần Phân Tích AI' : 'AI Analysis Reports Archive'}</h3>
              <p className="m-0 text-xs text-[#94a3b8] mt-1">
                {lang === 'vi'
                  ? 'Xem lại các báo cáo đã phân tích trong quá khứ để theo dõi sự cải thiện của hệ thống.'
                  : 'Review past reports to track UX improvement over time.'}
              </p>
            </div>
            <button
              onClick={loadReports}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#cbd5e1] border border-white/10 cursor-pointer"
            >
              🔄 {lang === 'vi' ? 'Làm Mới' : 'Refresh'}
            </button>
          </div>

          {reportsList.length === 0 ? (
            <div className="p-12 text-center text-[#94a3b8]">
              {lang === 'vi' ? 'Chưa có bản lưu báo cáo nào trong cơ sở dữ liệu.' : 'No saved reports in database.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-[#1e293b]/80 border-b border-[#334155] text-[#94a3b8]">
                    <th className="p-3.5">ID</th>
                    <th className="p-3.5">{lang === 'vi' ? 'Thời Gian Phân Tích' : 'Timestamp'}</th>
                    <th className="p-3.5">{lang === 'vi' ? 'Phạm Vi' : 'Scope'}</th>
                    <th className="p-3.5">{lang === 'vi' ? 'Điểm UX' : 'UX Score'}</th>
                    <th className="p-3.5">{lang === 'vi' ? 'Trạng Thái' : 'Status'}</th>
                    <th className="p-3.5">{lang === 'vi' ? 'AI Model' : 'Model'}</th>
                    <th className="p-3.5 text-right">{lang === 'vi' ? 'Thao Tác' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {reportsList.map((r) => {
                    const rColor = getScoreColor(r.uxHealthScore);
                    return (
                      <tr key={r.id} className="border-b border-[#1e293b]/60 hover:bg-white/[0.02] transition-colors">
                        <td className="p-3.5 font-mono text-[#94a3b8]">#{r.id}</td>
                        <td className="p-3.5 text-white font-semibold">{formatDateTime(r.createdAt)}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-white/10 text-[#cbd5e1] font-bold">
                            {r.scope}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-extrabold text-sm" style={{ color: rColor.text }}>
                            {r.uxHealthScore}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className="px-2 py-0.5 rounded text-[11px] font-bold"
                            style={{ background: rColor.bg, color: rColor.text, border: `1px solid ${rColor.border}` }}
                          >
                            {r.healthStatus}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-[#94a3b8]">{r.aiModelUsed}</td>
                        <td className="p-3.5 text-right flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setActiveReport({
                                reportId: r.id,
                                timeframe: r.scope,
                                uxHealthScore: r.uxHealthScore,
                                healthStatus: r.healthStatus,
                                summary: r.summary,
                                userBehaviorAnalysis: r.userBehaviorAnalysis,
                                painPointsAnalysis: r.painPointsAnalysis,
                                recommendations: r.recommendations,
                                aiModelUsed: r.aiModelUsed,
                                createdAt: r.createdAt,
                                metrics: r.rawMetricsJson ? JSON.parse(r.rawMetricsJson) : (metrics || null)
                              });
                              setActiveTab('OVERVIEW');
                              showToast(lang === 'vi' ? `Đã tải báo cáo #${r.id}` : `Loaded report #${r.id}`, 'info');
                            }}
                            className="px-3 py-1 rounded-lg bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30 font-semibold cursor-pointer"
                          >
                            👁️ {lang === 'vi' ? 'Xem' : 'View'}
                          </button>
                          <button
                            onClick={() => setDeleteReportId(r.id)}
                            className="px-3 py-1 rounded-lg bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30 font-semibold cursor-pointer"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 3 CONTENT: AI CONFIGURATION */}
      {activeTab === 'SETTINGS' && (
        <div className="bg-[#0f172a]/70 border border-[#1e293b] rounded-3xl p-6 md:p-8 backdrop-blur-md flex flex-col gap-6 max-w-3xl">
          <div>
            <h3 className="m-0 text-xl font-bold text-white flex items-center gap-2">
              ⚙️ {lang === 'vi' ? 'Cấu Hình Google Gemini AI & Engine Phân Tích' : 'AI Engine & Gemini API Configuration'}
            </h3>
            <p className="m-0 text-xs text-[#94a3b8] mt-1 leading-relaxed">
              {lang === 'vi'
                ? 'Nhập Google Gemini API Key để kích hoạt khả năng phân tích ngôn ngữ tự nhiên cấp độ cao. Nếu để trống, hệ thống sẽ tự động sử dụng Smart Heuristic Engine tích hợp sẵn.'
                : 'Enter your Google Gemini API key. If left blank, the built-in smart heuristic engine will be used automatically.'}
            </p>
          </div>

          {/* Status Alert Box */}
          <div className="p-4 rounded-2xl border flex items-center gap-3 bg-[#1e293b]/40 border-white/10">
            <span className="text-2xl">{aiConfig?.hasApiKey ? '🟢' : '🟡'}</span>
            <div className="flex flex-col text-xs">
              <strong className="text-white text-sm">
                {aiConfig?.hasApiKey
                  ? (lang === 'vi' ? 'Đã kích hoạt Google Gemini AI' : 'Google Gemini AI Connected')
                  : (lang === 'vi' ? 'Đang chạy chế độ Smart Heuristic Engine (Mặc định)' : 'Running Built-in Smart Heuristic')}
              </strong>
              <span className="text-[#94a3b8] mt-0.5">
                {aiConfig?.hasApiKey
                  ? `API Key hiện tại: ${aiConfig.geminiApiKey} (Model: ${aiConfig.aiModel})`
                  : (lang === 'vi' ? 'Bạn có thể lấy API Key miễn phí từ Google AI Studio để có phân tích AI thông minh hơn.' : 'Get a free API Key at Google AI Studio for deeper LLM insights.')}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className="flex flex-col gap-5">
            {/* API Key Input */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-[#cbd5e1]">
                  {lang === 'vi' ? 'Google Gemini API Key' : 'Google Gemini API Key'}
                </label>
                {aiConfig?.hasApiKey && (
                  <span className="text-[#10b981] font-bold text-xs bg-[#10b981]/15 px-2.5 py-0.5 rounded-lg border border-[#10b981]/30 flex items-center gap-1">
                    ✓ Đã lưu key trong hệ thống
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Dán mã API Key tại đây (bắt đầu bằng AIzaSy...)"
                  className="w-full px-4 py-3 rounded-xl border border-[#334155] bg-[#080c14] text-white text-sm outline-none focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/20 font-mono pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 text-[#94a3b8] hover:text-white text-sm cursor-pointer p-1"
                  title={showApiKey ? 'Ẩn Key' : 'Hiện Key'}
                >
                  {showApiKey ? '🙈' : '👁️'}
                </button>
              </div>
              <div className="flex justify-between items-center flex-wrap gap-2">
                <small className="text-[11px] text-[#94a3b8]">
                  💡 {lang === 'vi' ? 'Lấy key miễn phí tại:' : 'Get free API key at:'}{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#38bdf8] underline font-bold"
                  >
                    https://aistudio.google.com/app/apikey
                  </a>
                </small>
                {aiConfig?.hasApiKey && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="text-[11px] text-[#ef4444] hover:underline cursor-pointer bg-transparent border-0 p-0"
                  >
                    🗑️ Gỡ bỏ API Key này
                  </button>
                )}
              </div>
            </div>

            {/* Model Version Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#cbd5e1]">
                {lang === 'vi' ? 'Phiên Bản AI Model' : 'AI Model Version'}
              </label>
              <select
                value={modelSelect}
                onChange={(e) => setModelSelect(e.target.value)}
                className="px-4 py-3 rounded-xl border border-[#334155] bg-[#080c14] text-white text-sm outline-none focus:border-[#8b5cf6]"
              >
                <option value="gemini-3.5-flash">⚡ gemini-3.5-flash (Mới Nhất - Khuyên Dùng)</option>
                <option value="gemini-3.8-flash">🚀 gemini-3.8-flash (High Performance)</option>
                <option value="gemini-2.0-flash">⚡ gemini-2.0-flash (Tốc độ phản hồi cao)</option>
                <option value="gemini-1.5-flash">🛡️ gemini-1.5-flash (Bản ổn định tiêu chuẩn)</option>
                <option value="gemini-1.5-pro">🧠 gemini-1.5-pro (Chuyên sâu - Suy luận phức tạp)</option>
                <option value="CUSTOM">✏️ Tùy chỉnh model khác (Nhập thủ công)...</option>
              </select>

              {modelSelect === 'CUSTOM' && (
                <input
                  type="text"
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                  placeholder="Nhập chính xác tên Model (ví dụ: gemini-3.5-flash, gemini-3.8-flash)..."
                  className="px-4 py-3 rounded-xl border border-[#8b5cf6] bg-[#080c14] text-white text-xs font-mono outline-none mt-1"
                />
              )}
            </div>

            {/* Custom System Prompt */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#cbd5e1]">
                {lang === 'vi' ? 'Prompt Chỉ Đạo Tùy Biến (Tùy chọn)' : 'Custom System Prompt (Optional)'}
              </label>
              <textarea
                rows={4}
                value={customPromptInput}
                onChange={(e) => setCustomPromptInput(e.target.value)}
                placeholder={
                  lang === 'vi'
                    ? 'Ví dụ: "Hãy tập trung vào giải pháp tăng tỉ lệ chuyển đổi mua key 1 tháng và giảm thiểu khiếu nại về tốc độ cấp key..."'
                    : 'e.g., Focus on increasing 1-month key conversion and reducing delivery complaints...'
                }
                className="px-4 py-3 rounded-xl border border-[#334155] bg-[#080c14] text-white text-xs md:text-sm outline-none focus:border-[#8b5cf6] font-sans leading-relaxed"
              />
            </div>

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <button
                type="submit"
                disabled={isSavingConfig}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-bold text-sm cursor-pointer shadow-[0_4px_20px_rgba(139,92,246,0.3)] hover:opacity-95 transition-all"
              >
                {isSavingConfig
                  ? (lang === 'vi' ? 'Đang lưu...' : 'Saving...')
                  : (lang === 'vi' ? '💾 Lưu Cấu Hình AI' : '💾 Save AI Configuration')}
              </button>
              <button
                type="button"
                onClick={handleTestKey}
                disabled={isTestingKey}
                className="px-5 py-3.5 rounded-2xl bg-[#0284c7]/20 border border-[#0284c7]/50 text-[#38bdf8] font-bold text-sm cursor-pointer hover:bg-[#0284c7]/30 transition-all flex items-center gap-2"
              >
                {isTestingKey ? '⏳ Đang test...' : '🧪 Kiểm Tra Kết Nối Key'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick API Key & Model Configuration Modal */}
      {isQuickConfigOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-lg bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] border border-[#6366f1]/50 rounded-3xl p-6 md:p-7 shadow-[0_15px_50px_rgba(99,102,241,0.25)] flex flex-col gap-5 text-white animate-scale-up">
              <div className="flex justify-between items-start border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/20 text-[#c084fc] flex items-center justify-center text-xl shrink-0">
                    🔑
                  </div>
                  <div>
                    <h3 className="m-0 text-lg font-bold text-white">
                      {lang === 'vi' ? 'Gắn Google Gemini API Key' : 'Connect Google Gemini API'}
                    </h3>
                    <p className="m-0 text-xs text-[#94a3b8] mt-0.5">
                      {lang === 'vi' ? 'Nâng cấp lên Gemini 3.5 Flash để có phân tích AI tối tân nhất' : 'Upgrade to Gemini 3.5 Flash for deep UX analytics'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsQuickConfigOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#94a3b8] hover:text-white flex items-center justify-center text-sm cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {/* API Key Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#cbd5e1] flex justify-between items-center">
                    <span>Google Gemini API Key:</span>
                    {aiConfig?.hasApiKey && (
                      <span className="text-[#10b981] font-normal text-[11px] bg-[#10b981]/15 px-2 py-0.5 rounded-md border border-[#10b981]/30">
                        ● Đã lưu key trong hệ thống
                      </span>
                    )}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Dán mã API Key tại đây (bắt đầu bằng AIzaSy...)"
                      className="w-full px-4 py-3 rounded-xl border border-[#334155] bg-[#080c14] text-white text-sm outline-none focus:border-[#8b5cf6] font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 text-[#94a3b8] hover:text-white text-sm cursor-pointer p-1"
                      title={showApiKey ? 'Ẩn Key' : 'Hiện Key'}
                    >
                      {showApiKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <div className="flex justify-between items-center flex-wrap gap-1">
                    <small className="text-[11px] text-[#94a3b8]">
                      💡 Chưa có key? Lấy miễn phí tại:{' '}
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#38bdf8] underline font-bold"
                      >
                        Google AI Studio
                      </a>
                    </small>
                    {aiConfig?.hasApiKey && (
                      <button
                        type="button"
                        onClick={handleClearKey}
                        className="text-[11px] text-[#ef4444] hover:underline cursor-pointer bg-transparent border-0 p-0"
                      >
                        🗑️ Xóa key
                      </button>
                    )}
                  </div>
                </div>

                {/* Model Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#cbd5e1]">
                    Chọn Phiên Bản Model AI:
                  </label>
                  <select
                    value={modelSelect}
                    onChange={(e) => setModelSelect(e.target.value)}
                    className="px-4 py-3 rounded-xl border border-[#334155] bg-[#080c14] text-white text-sm outline-none focus:border-[#8b5cf6]"
                  >
                    <option value="gemini-3.5-flash">⚡ gemini-3.5-flash (Mới Nhất - Khuyên Dùng)</option>
                    <option value="gemini-3.8-flash">🚀 gemini-3.8-flash (High Performance)</option>
                    <option value="gemini-2.0-flash">⚡ gemini-2.0-flash (Tốc độ phản hồi cao)</option>
                    <option value="gemini-1.5-flash">🛡️ gemini-1.5-flash (Bản ổn định tiêu chuẩn)</option>
                    <option value="gemini-1.5-pro">🧠 gemini-1.5-pro (Chuyên sâu)</option>
                    <option value="CUSTOM">✏️ Tùy chỉnh model khác (Nhập tay)...</option>
                  </select>

                  {modelSelect === 'CUSTOM' && (
                    <input
                      type="text"
                      value={customModelInput}
                      onChange={(e) => setCustomModelInput(e.target.value)}
                      placeholder="Nhập tên Model chính xác (vd: gemini-3.5-flash)..."
                      className="px-4 py-2.5 rounded-xl border border-[#8b5cf6] bg-[#080c14] text-white text-xs font-mono outline-none mt-1"
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center gap-3 pt-3 border-t border-white/10 flex-wrap">
                <button
                  type="button"
                  onClick={handleTestKey}
                  disabled={isTestingKey}
                  className="px-4 py-2.5 rounded-xl bg-[#0284c7]/20 border border-[#0284c7]/40 text-[#38bdf8] font-bold text-xs cursor-pointer hover:bg-[#0284c7]/30 flex items-center gap-1.5"
                >
                  {isTestingKey ? '⏳ Đang test...' : '🧪 Kiểm Tra Kết Nối'}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsQuickConfigOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs cursor-pointer"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveConfig()}
                    disabled={isSavingConfig}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-bold text-xs cursor-pointer shadow-[0_4px_15px_rgba(139,92,246,0.4)] hover:opacity-95 flex items-center gap-2"
                  >
                    {isSavingConfig ? 'Đang lưu...' : '💾 Lưu & Kích Hoạt Ngay'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteReportId !== null}
        title={lang === 'vi' ? 'Xác nhận xóa báo cáo AI' : 'Confirm Delete Report'}
        message={
          lang === 'vi'
            ? `Bạn có chắc chắn muốn xóa báo cáo phân tích #${deleteReportId}? Thao tác này không thể hoàn tác.`
            : `Are you sure you want to delete report #${deleteReportId}?`
        }
        lang={lang}
        onConfirm={handleDeleteReport}
        onCancel={() => setDeleteReportId(null)}
      />
    </div>
  );
}
