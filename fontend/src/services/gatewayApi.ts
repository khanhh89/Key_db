import { API_BASE_URL, refreshAdminRollingToken } from './authApi';

export interface BypassProvider {
  id?: string;
  name: string;
  apiUrl: string;
  apiToken: string;
  paramTokenName?: string;
  paramUrlName?: string;
  requestType?: string;
  weight?: number;
  priority?: number;
  isActive?: boolean;
  bypassSteps?: number;
  totalClicks?: number;
  totalCompleted?: number;
  conversionRate?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BypassGatewayStats {
  totalSessions: number;
  completedSessions: number;
  pendingSessions: number;
  blockedSessions: number;
  overallConversionRate: number;
  todaySessions: number;
  todayCompleted: number;
  activeProvidersCount: number;
  providers: BypassProvider[];
}

export interface CreateBypassSessionResponse {
  success: boolean;
  alreadyEntitled?: boolean;
  sessionId?: string;
  providerId?: string;
  providerName?: string;
  shortenedUrl?: string;
  callbackUrl?: string;
  expiresAt?: string;
  message?: string;
}

export interface VerifyBypassSessionResponse {
  success: boolean;
  status: string; // COMPLETED, ALREADY_VERIFIED, EXPIRED, BLOCKED
  message: string;
  entitlementExpiresAt?: string;
  targetAppId?: string;
  targetAppName?: string;
  freeKey?: string;
  downloadUrl?: string;
}

export interface TestProviderResponse {
  success: boolean;
  httpStatus?: number;
  shortenedUrl?: string;
  responseTimeMs?: number;
  rawResponse?: string;
  message: string;
}

// ==========================================
// CLIENT APIS
// ==========================================

export async function checkDeviceEntitlement(deviceId: string): Promise<{ isEntitled: boolean; expiresAt?: string; bypassCount?: number }> {
  try {
    const res = await fetch(`${API_BASE_URL}/gateway/check-device?deviceId=${encodeURIComponent(deviceId)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('checkDeviceEntitlement failed', err);
  }
  return { isEntitled: false };
}

export async function createBypassSession(deviceId: string, appId?: string, providerId?: string): Promise<CreateBypassSessionResponse> {
  try {
    const baseUrl = window.location.origin;
    const res = await fetch(`${API_BASE_URL}/gateway/create-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, appId, providerId, baseUrl })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || 'Lỗi kết nối máy chủ tạo link vượt.' };
  }
}

export async function verifyBypassSession(sessionId: string, deviceId: string): Promise<VerifyBypassSessionResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/gateway/verify-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, deviceId })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, status: 'ERROR', message: err.message || 'Lỗi kết nối máy chủ xác thực.' };
  }
}

// ==========================================
// ADMIN APIS
// ==========================================

export async function fetchAdminProviders(): Promise<BypassProvider[]> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/gateway/admin/providers`, {
      headers: { 'X-Admin-Auth': token }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('fetchAdminProviders failed', err);
  }
  return [];
}

export async function saveAdminProvider(provider: BypassProvider): Promise<{ success: boolean; data?: BypassProvider; message?: string }> {
  try {
    const token = await refreshAdminRollingToken();
    const isEdit = Boolean(provider.id);
    const url = isEdit ? `${API_BASE_URL}/gateway/admin/providers/${provider.id}` : `${API_BASE_URL}/gateway/admin/providers`;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Auth': token
      },
      body: JSON.stringify(provider)
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { success: true, data };
    return { success: false, message: data.message || 'Lỗi lưu nhà mạng.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Lỗi kết nối server.' };
  }
}

export async function deleteAdminProvider(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/gateway/admin/providers/${id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Auth': token }
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { success: true, message: data.message };
    return { success: false, message: data.message || 'Lỗi xóa nhà mạng.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Lỗi kết nối server.' };
  }
}

export async function testProviderApi(provider: BypassProvider): Promise<TestProviderResponse> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/gateway/admin/test-provider`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Auth': token
      },
      body: JSON.stringify(provider)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || 'Lỗi kết nối thử nghiệm API.' };
  }
}

export async function fetchGatewayStats(): Promise<BypassGatewayStats | null> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/gateway/admin/stats`, {
      headers: { 'X-Admin-Auth': token }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('fetchGatewayStats failed', err);
  }
  return null;
}
