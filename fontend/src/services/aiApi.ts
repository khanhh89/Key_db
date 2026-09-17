import { API_BASE_URL, refreshAdminRollingToken } from './authApi';
import type { AiMetricsData, AiAnalysisResponse, AiAnalysisReport, AiConfig } from '../types';

export async function fetchAiMetrics(timeframe: string = 'ALL'): Promise<AiMetricsData> {
  const token = await refreshAdminRollingToken();
  const res = await fetch(`${API_BASE_URL}/v1/admin/ai/metrics?timeframe=${encodeURIComponent(timeframe)}`, {
    headers: { 'X-Admin-Auth': token }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch AI metrics: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function triggerAiAnalysis(timeframe: string = 'ALL', customFocus?: string): Promise<AiAnalysisResponse> {
  const token = await refreshAdminRollingToken();
  const res = await fetch(`${API_BASE_URL}/v1/admin/ai/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Auth': token
    },
    body: JSON.stringify({ timeframe, customFocus })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `AI analysis failed: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchAiReports(): Promise<AiAnalysisReport[]> {
  const token = await refreshAdminRollingToken();
  const res = await fetch(`${API_BASE_URL}/v1/admin/ai/reports`, {
    headers: { 'X-Admin-Auth': token }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch AI reports: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchAiReportDetail(id: number): Promise<AiAnalysisReport> {
  const token = await refreshAdminRollingToken();
  const res = await fetch(`${API_BASE_URL}/v1/admin/ai/reports/${id}`, {
    headers: { 'X-Admin-Auth': token }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch AI report #${id}: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function deleteAiReport(id: number): Promise<boolean> {
  const token = await refreshAdminRollingToken();
  const res = await fetch(`${API_BASE_URL}/v1/admin/ai/reports/${id}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Auth': token }
  });
  return res.ok;
}

export async function fetchAiConfig(): Promise<AiConfig> {
  const token = await refreshAdminRollingToken();
  const res = await fetch(`${API_BASE_URL}/v1/admin/ai/config`, {
    headers: { 'X-Admin-Auth': token }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch AI config: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function updateAiConfig(config: Partial<AiConfig>): Promise<AiConfig> {
  const token = await refreshAdminRollingToken();
  const res = await fetch(`${API_BASE_URL}/v1/admin/ai/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Auth': token
    },
    body: JSON.stringify(config)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to update AI config: HTTP ${res.status}`);
  }
  return await res.json();
}
