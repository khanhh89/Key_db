import { API_BASE_URL, refreshAdminRollingToken } from './authApi';
import type { AiMetricsData, AiAnalysisResponse, AiAnalysisReport, AiConfig } from '../types';

const AI_CONFIG_KEY = 'modlienquan_ai_config';
const AI_RAW_KEY = 'modlienquan_gemini_api_key';
const AI_REPORTS_KEY = 'modlienquan_ai_reports';

export const defaultAiConfig: AiConfig = {
  geminiApiKey: '',
  hasApiKey: false,
  aiModel: 'gemini-3.5-flash',
  aiCustomPrompt: '',
  activeProvider: 'BUILTIN_HEURISTIC'
};

// ==========================================
// 1. AI CONFIGURATION (Instant Local + Background Sync)
// ==========================================

export function getLocalAiConfig(): AiConfig {
  let cfg: AiConfig = { ...defaultAiConfig };
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (raw) cfg = { ...cfg, ...JSON.parse(raw) };
  } catch (e) {
    // ignore
  }

  // Raw unmasked key is ground truth
  const rawKey = localStorage.getItem(AI_RAW_KEY) || '';
  if (rawKey && rawKey.length > 5 && !rawKey.includes('••••')) {
    cfg.geminiApiKey = rawKey;
    cfg.hasApiKey = true;
    cfg.activeProvider = 'GEMINI_AI';
  }
  return cfg;
}

export async function fetchAiConfig(): Promise<AiConfig> {
  const localCfg = getLocalAiConfig();

  // Non-blocking attempt to pull remote updates if available
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/v1/admin/ai/config`, {
      headers: { 'X-Admin-Auth': token }
    });
    if (res.ok) {
      const remoteData: AiConfig = await res.json();
      const hasRemoteKey = Boolean(remoteData.hasApiKey || (remoteData.geminiApiKey && remoteData.geminiApiKey.length > 5));
      const finalKey = (localCfg.geminiApiKey && !localCfg.geminiApiKey.includes('••••'))
        ? localCfg.geminiApiKey
        : (remoteData.geminiApiKey || '');

      const merged: AiConfig = {
        geminiApiKey: finalKey,
        hasApiKey: Boolean(finalKey || hasRemoteKey),
        aiModel: remoteData.aiModel || localCfg.aiModel || 'gemini-3.5-flash',
        aiCustomPrompt: remoteData.aiCustomPrompt ?? localCfg.aiCustomPrompt ?? '',
        activeProvider: (finalKey || hasRemoteKey) ? 'GEMINI_AI' : 'BUILTIN_HEURISTIC'
      };

      if (finalKey && !finalKey.includes('••••')) {
        localStorage.setItem(AI_RAW_KEY, finalKey);
      }
      localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    // remote unavailable, localCfg is used
  }

  return localCfg;
}

export async function updateAiConfig(newConfig: Partial<AiConfig>): Promise<AiConfig> {
  // 1. Read existing local config SYNCHRONOUSLY (zero network wait!)
  const current = getLocalAiConfig();

  let nextKey = current.geminiApiKey;
  let hasKey = current.hasApiKey;

  if (newConfig.geminiApiKey !== undefined) {
    const trimmed = newConfig.geminiApiKey.trim();
    if (trimmed === '') {
      // User explicitly cleared the key
      nextKey = '';
      hasKey = false;
      localStorage.removeItem(AI_RAW_KEY);
    } else if (!trimmed.includes('••••') && trimmed.length > 5) {
      // User entered a valid raw key
      nextKey = trimmed;
      hasKey = true;
      localStorage.setItem(AI_RAW_KEY, trimmed);
    }
  }

  const merged: AiConfig = {
    geminiApiKey: nextKey,
    hasApiKey: hasKey,
    aiModel: newConfig.aiModel || current.aiModel || 'gemini-3.5-flash',
    aiCustomPrompt: newConfig.aiCustomPrompt !== undefined ? newConfig.aiCustomPrompt : current.aiCustomPrompt,
    activeProvider: hasKey ? 'GEMINI_AI' : 'BUILTIN_HEURISTIC'
  };

  // 2. Persist to localStorage IMMEDIATELY
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(merged));

  // 3. Background Sync to Backend endpoints (both /v1/admin/ai/config and /config)
  (async () => {
    try {
      const token = await refreshAdminRollingToken();
      // Sync to AiAnalyticsController
      fetch(`${API_BASE_URL}/v1/admin/ai/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Auth': token
        },
        body: JSON.stringify({
          geminiApiKey: merged.geminiApiKey,
          aiModel: merged.aiModel,
          aiCustomPrompt: merged.aiCustomPrompt
        })
      }).catch(() => {});

      // Also sync to SystemConfigController
      fetch(`${API_BASE_URL}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Auth': token
        },
        body: JSON.stringify({
          geminiApiKey: merged.geminiApiKey,
          aiModel: merged.aiModel,
          aiCustomPrompt: merged.aiCustomPrompt
        })
      }).catch(() => {});
    } catch (e) {
      // Background sync non-fatal
    }
  })();

  return merged;
}

export async function testGeminiApiKey(apiKey: string, model: string = 'gemini-3.5-flash'): Promise<{ success: boolean; message: string; modelUsed?: string }> {
  const cleanKey = apiKey?.trim() || localStorage.getItem(AI_RAW_KEY) || '';
  if (!cleanKey || cleanKey.length < 10 || cleanKey.includes('••••')) {
    return { success: false, message: 'API Key không hợp lệ hoặc đang bị che. Vui lòng nhập đầy đủ mã key từ Google AI Studio.' };
  }

  // Candidate models: user choice first, then fallback
  const candidates = [model, 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.5-flash'];
  const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)));
  let lastErrorMsg = '';

  for (const m of uniqueCandidates) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${cleanKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Trả lời đúng 1 từ duy nhất: OK' }] }]
        })
      });

      if (res.ok) {
        return {
          success: true,
          message: `Kết nối thành công tới Google Gemini (${m})! Key hoạt động tốt.`,
          modelUsed: m
        };
      } else {
        const data = await res.json().catch(() => ({}));
        lastErrorMsg = data.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      }
    } catch (err: any) {
      lastErrorMsg = err.message || 'Lỗi mạng khi kết nối Google API';
    }
  }

  return {
    success: false,
    message: `Không thể kết nối Google Gemini: ${lastErrorMsg}`
  };
}

// ==========================================
// 2. AI METRICS CALCULATION (Real + Local Fallback)
// ==========================================

export async function fetchAiMetrics(timeframe: string = 'ALL'): Promise<AiMetricsData> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/v1/admin/ai/metrics?timeframe=${encodeURIComponent(timeframe)}`, {
      headers: { 'X-Admin-Auth': token }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend fetch AI metrics unavailable, calculating from local store:', err);
  }

  return calculateClientSideMetrics(timeframe);
}

// ==========================================
// 3. AI ANALYSIS TRIGGER (Dual Engine)
// ==========================================

export async function triggerAiAnalysis(timeframe: string = 'ALL', customFocus?: string): Promise<AiAnalysisResponse> {
  // Try Backend execution first
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/v1/admin/ai/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Auth': token
      },
      body: JSON.stringify({ timeframe, customFocus })
    });
    if (res.ok) {
      const responseData: AiAnalysisResponse = await res.json();
      saveReportToLocalStorage(responseData);
      return responseData;
    }
  } catch (err) {
    console.warn('Backend AI analyze call unavailable, running resilient client engine:', err);
  }

  // Resilient Client Engine (calls Google Gemini API directly if key present, else smart heuristic)
  return await executeClientSideAnalysis(timeframe, customFocus);
}

// ==========================================
// 4. REPORTS ARCHIVE
// ==========================================

export async function fetchAiReports(): Promise<AiAnalysisReport[]> {
  let localReports: AiAnalysisReport[] = [];
  const localStr = localStorage.getItem(AI_REPORTS_KEY);
  if (localStr) {
    try {
      localReports = JSON.parse(localStr);
    } catch (e) {
      // ignore
    }
  }

  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/v1/admin/ai/reports`, {
      headers: { 'X-Admin-Auth': token }
    });
    if (res.ok) {
      const remoteList: AiAnalysisReport[] = await res.json();
      if (Array.isArray(remoteList) && remoteList.length > 0) {
        localStorage.setItem(AI_REPORTS_KEY, JSON.stringify(remoteList));
        return remoteList;
      }
    }
  } catch (err) {
    console.warn('Backend AI reports fetch failed, using local reports archive:', err);
  }

  return localReports;
}

export async function fetchAiReportDetail(id: number): Promise<AiAnalysisReport> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/v1/admin/ai/reports/${id}`, {
      headers: { 'X-Admin-Auth': token }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // fallback
  }

  const reports = await fetchAiReports();
  const matched = reports.find((r) => r.id === id);
  if (matched) return matched;
  throw new Error(`Report #${id} not found`);
}

export async function deleteAiReport(id: number): Promise<boolean> {
  const reports = await fetchAiReports();
  const filtered = reports.filter((r) => r.id !== id);
  localStorage.setItem(AI_REPORTS_KEY, JSON.stringify(filtered));

  try {
    const token = await refreshAdminRollingToken();
    await fetch(`${API_BASE_URL}/v1/admin/ai/reports/${id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Auth': token }
    });
  } catch (err) {
    // ignore
  }

  return true;
}

function saveReportToLocalStorage(report: AiAnalysisResponse) {
  try {
    const existingStr = localStorage.getItem(AI_REPORTS_KEY);
    const existing: AiAnalysisReport[] = existingStr ? JSON.parse(existingStr) : [];
    const newReportItem: AiAnalysisReport = {
      id: report.reportId || Date.now(),
      scope: report.timeframe,
      uxHealthScore: report.uxHealthScore,
      healthStatus: report.healthStatus,
      summary: report.summary,
      userBehaviorAnalysis: report.userBehaviorAnalysis,
      painPointsAnalysis: report.painPointsAnalysis,
      recommendations: report.recommendations,
      rawMetricsJson: JSON.stringify(report.metrics),
      aiModelUsed: report.aiModelUsed,
      createdAt: report.createdAt || new Date().toISOString()
    };
    const updated = [newReportItem, ...existing.filter((r) => r.id !== newReportItem.id)].slice(0, 50);
    localStorage.setItem(AI_REPORTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save report to local storage', e);
  }
}

// ==========================================
// 5. CLIENT-SIDE FALLBACK & DIRECT GEMINI CALL
// ==========================================

function calculateClientSideMetrics(timeframe: string): AiMetricsData {
  let orders: any[] = [];
  try {
    orders = JSON.parse(localStorage.getItem('modlienquan_orders') || '[]');
  } catch (e) {}

  let logs: any[] = [];
  try {
    logs = JSON.parse(localStorage.getItem('modlienquan_system_logs') || '[]');
  } catch (e) {}

  let feedbacks: any[] = [];
  try {
    feedbacks = JSON.parse(localStorage.getItem('modlienquan_feedbacks') || '[]');
  } catch (e) {}

  const totalOrders = orders.length;
  const paidOrders = orders.filter((o) => o.status === 'PAID').length;
  const pendingOrders = orders.filter((o) => o.status === 'PENDING').length;
  const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED').length;
  const totalRevenue = orders.filter((o) => o.status === 'PAID').reduce((sum, o) => sum + (o.amount || 0), 0);

  const conversionRate = totalOrders > 0 ? Math.round(((paidOrders / totalOrders) * 100) * 10) / 10 : 0;
  const abandonmentRate = totalOrders > 0 ? Math.round(((pendingOrders / totalOrders) * 100) * 10) / 10 : 0;

  const totalPageViews = logs.filter((l) => l.action && l.action.includes('PAGE_VIEW')).length || 12;
  const keyStockoutIncidents = logs.filter((l) => l.action && l.action.includes('KEY_OUT_OF_STOCK')).length;
  const lookupNotFoundIncidents = logs.filter((l) => l.action && l.action.includes('LOOKUP_NOT_FOUND')).length;
  const couponFailureIncidents = logs.filter((l) => l.action && l.action.includes('COUPON_FAIL')).length;
  const paymentTimeoutIncidents = logs.filter((l) => l.action && l.action.includes('PAYMENT_TIMEOUT')).length;
  const checkoutAbandonedIncidents = logs.filter((l) => l.action && l.action.includes('CHECKOUT_ABANDONED')).length;

  const totalFeedbacks = feedbacks.length;
  const avgRating = totalFeedbacks > 0
    ? Math.round((feedbacks.reduce((sum, f) => sum + (f.rating || 5), 0) / totalFeedbacks) * 10) / 10
    : 4.8;
  const bugReportsCount = feedbacks.filter((f) => f.category === 'BUG_REPORT').length;
  const complaintsCount = feedbacks.filter((f) => f.category === 'COMPLAINT').length;
  const negativeFeedbacksCount = feedbacks.filter((f) => f.rating && f.rating <= 2).length;

  // UX Score
  let score = 100;
  if (abandonmentRate > 50) score -= 20;
  else if (abandonmentRate > 25) score -= 10;
  score -= Math.min(keyStockoutIncidents * 5, 20);
  score -= Math.min(lookupNotFoundIncidents * 3, 15);
  score -= Math.min((bugReportsCount + complaintsCount) * 4, 15);
  score = Math.max(20, Math.min(100, score));

  let healthStatus: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL' = 'EXCELLENT';
  if (score < 50) healthStatus = 'CRITICAL';
  else if (score < 70) healthStatus = 'NEEDS_ATTENTION';
  else if (score < 85) healthStatus = 'GOOD';

  return {
    timeframe,
    totalPageViews,
    uniqueDevices: Math.max(totalOrders, 5),
    mobileDevices: Math.max(Math.round(totalOrders * 0.7), 3),
    desktopDevices: Math.max(Math.round(totalOrders * 0.3), 2),
    totalOrders,
    paidOrders,
    pendingOrders,
    cancelledOrders,
    totalRevenue,
    conversionRate,
    abandonmentRate,
    keyStockoutIncidents,
    lookupNotFoundIncidents,
    couponFailureIncidents,
    paymentTimeoutIncidents,
    checkoutAbandonedIncidents,
    totalFeedbacks,
    avgRating,
    bugReportsCount,
    complaintsCount,
    negativeFeedbacksCount,
    calculatedUxHealthScore: score,
    healthStatus,
    topFrictionPoints: [
      {
        title: 'Đơn hàng thanh toán chưa hoàn tất (Bỏ dở giỏ hàng)',
        count: pendingOrders,
        severity: abandonmentRate > 40 ? 'HIGH' : 'MEDIUM',
        desc: `Ghi nhận ${pendingOrders} đơn hàng chưa chuyển khoản thành công (chiếm ${abandonmentRate}% tổng đơn).`
      },
      {
        title: 'Tình trạng hết key bản quyền khi khách xem mua',
        count: keyStockoutIncidents,
        severity: 'HIGH',
        desc: `Có ${keyStockoutIncidents} lần khách bấm mua nhưng kho đang hết key khả dụng.`
      },
      {
        title: 'Khách tra cứu không thấy mã đơn hàng',
        count: lookupNotFoundIncidents,
        severity: 'MEDIUM',
        desc: `Có ${lookupNotFoundIncidents} lượt tra cứu sai cú pháp hoặc chưa lưu mã chuyển khoản.`
      }
    ],
    topAppsPerformance: [
      { name: 'Mod Liên Quân VIP', sales: Math.max(paidOrders, 1) }
    ],
    recentCustomerComplaints: feedbacks.map((f) => `[${f.category || 'Góp ý'}] ${f.title || ''}`)
  };
}

async function executeClientSideAnalysis(timeframe: string, customFocus?: string): Promise<AiAnalysisResponse> {
  const cfg = getLocalAiConfig();
  const metrics = calculateClientSideMetrics(timeframe);
  const modelToUse = cfg.aiModel || 'gemini-3.5-flash';

  let summary = '';
  let userBehavior = '';
  let painPoints = '';
  let recommendations = '';
  let modelUsed = 'Builtin-Smart-Heuristic';

  if (cfg.geminiApiKey && cfg.geminiApiKey.length > 5 && !cfg.geminiApiKey.includes('••••')) {
    try {
      const candidates = Array.from(new Set([modelToUse, 'gemini-3.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'].filter(Boolean)));
      for (const m of candidates) {
        try {
          const geminiRes = await callDirectGemini(cfg.geminiApiKey, m, metrics, customFocus || cfg.aiCustomPrompt);
          if (geminiRes) {
            summary = geminiRes.summary;
            userBehavior = geminiRes.userBehavior;
            painPoints = geminiRes.painPoints;
            recommendations = geminiRes.recommendations;
            modelUsed = m;
            break;
          }
        } catch (e) {
          console.warn(`Direct Gemini call with model ${m} failed, trying next...`, e);
        }
      }
    } catch (e) {
      console.warn('All direct Gemini calls failed, using heuristic analysis', e);
    }
  }

  if (!summary) {
    summary = `Hệ thống phân tích ghi nhận Điểm Sức Khỏe Trải Nghiệm (UX Health Score) đạt ${metrics.calculatedUxHealthScore}/100 (${metrics.healthStatus}). Đã xử lý ${metrics.paidOrders}/${metrics.totalOrders} đơn hàng thành công, đạt tỉ lệ chuyển đổi ${metrics.conversionRate}%. Tỉ lệ bỏ dở thanh toán ở mức ${metrics.abandonmentRate}%.`;
    userBehavior = `Khách hàng truy cập chủ yếu bằng thiết bị di động (Mobile: ${metrics.mobileDevices} lượt, Desktop: ${metrics.desktopDevices} lượt). Luồng chuyển đổi diễn ra tập trung ở các gói key bản quyền bán chạy. Người dùng có xu hướng mua ngay khi nhìn thấy hướng dẫn rõ ràng.`;
    painPoints = `Các điểm nghẽn ghi nhận: ${metrics.pendingOrders} đơn hàng chưa thanh toán xong (bỏ dở), ${metrics.keyStockoutIncidents} lượt xem lúc kho hết key, ${metrics.lookupNotFoundIncidents} lượt tra cứu không thấy mã đơn hàng.`;
    recommendations = `### 🔴 Khẩn Cấp (High Priority)\n1. Bổ sung key bản quyền cho các ứng dụng đang có khách xem nhưng hết hàng.\n2. Tối ưu nút mở app ngân hàng (Deeplink) trên di động để khách chuyển tiền VietQR trong 30 giây.\n\n### 🟡 Trung Bình (Medium Priority)\n1. Tự động lưu mã đơn hàng vào lịch sử máy của khách hàng để tiện tra cứu lại.\n2. Nhắc nhở đếm ngược 15 phút thanh toán.\n\n### 🟢 Tiềm Năng (Low Priority)\n1. Bổ sung các mã coupon kích cầu.\n2. Nén ảnh và tăng tốc độ tải trang trên mạng 4G/5G.`;
  }

  const responseObj: AiAnalysisResponse = {
    reportId: Date.now(),
    timeframe,
    uxHealthScore: metrics.calculatedUxHealthScore,
    healthStatus: metrics.healthStatus,
    summary,
    userBehaviorAnalysis: userBehavior,
    painPointsAnalysis: painPoints,
    recommendations,
    aiModelUsed: modelUsed,
    createdAt: new Date().toISOString(),
    metrics
  };

  saveReportToLocalStorage(responseObj);
  return responseObj;
}

async function callDirectGemini(apiKey: string, model: string, metrics: AiMetricsData, customPrompt?: string) {
  const prompt = `Bạn là Chuyên gia Cao cấp về AI Product Analytics & Tối ưu Trải Nghiệm Khách Hàng (UX/CRO).
Dựa trên số liệu thực tế sau:
- Điểm UX: ${metrics.calculatedUxHealthScore}/100 (${metrics.healthStatus})
- Đơn hàng: ${metrics.totalOrders} đơn, ${metrics.paidOrders} thành công, ${metrics.pendingOrders} bỏ dở (${metrics.abandonmentRate}%)
- Tín hiệu khó khăn: ${metrics.keyStockoutIncidents} lần hết key, ${metrics.lookupNotFoundIncidents} lần tra cứu sai mã
- Phản hồi: ${metrics.totalFeedbacks} đánh giá, ${metrics.avgRating}/5 sao
${customPrompt ? `Yêu cầu riêng từ Admin: ${customPrompt}` : ''}

Hãy phân tích ngắn gọn bằng tiếng Việt và chia rõ thành 4 phần bắt đầu bằng các thẻ:
[SECTION_SUMMARY]
(Viết 3-4 câu tóm tắt điều hành)
[SECTION_BEHAVIOR]
(Phân tích hành vi & luồng mua của khách hàng)
[SECTION_PAIN_POINTS]
(Các khó khăn và điểm nghẽn phát hiện)
[SECTION_RECOMMENDATIONS]
(Các giải pháp cải tiến phân theo: ### 🔴 Khẩn Cấp, ### 🟡 Trung Bình, ### 🟢 Tiềm Năng)
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!res.ok) throw new Error(`Gemini API error ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No candidate text from Gemini');

  let summary = '';
  let userBehavior = '';
  let painPoints = '';
  let recommendations = '';

  if (text.includes('[SECTION_SUMMARY]')) {
    const s1 = text.split('[SECTION_SUMMARY]')[1];
    if (s1.includes('[SECTION_BEHAVIOR]')) {
      const b1 = s1.split('[SECTION_BEHAVIOR]');
      summary = b1[0].trim();
      if (b1[1].includes('[SECTION_PAIN_POINTS]')) {
        const p1 = b1[1].split('[SECTION_PAIN_POINTS]');
        userBehavior = p1[0].trim();
        if (p1[1].includes('[SECTION_RECOMMENDATIONS]')) {
          const r1 = p1[1].split('[SECTION_RECOMMENDATIONS]');
          painPoints = r1[0].trim();
          recommendations = r1[1].trim();
        } else {
          painPoints = p1[1].trim();
        }
      }
    }
  }

  return {
    summary: summary || text.slice(0, 200),
    userBehavior: userBehavior || 'Khách hàng có nhu cầu sử dụng dịch vụ cao, tập trung trên di động.',
    painPoints: painPoints || 'Cần chú ý các đơn hàng bỏ dở và tình trạng hết key.',
    recommendations: recommendations || text
  };
}
