const RENDER_API_URL = 'https://modlienquan-backend.onrender.com/api';
const LOCAL_API_URL = 'http://localhost:8080/api';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL
  : (import.meta.env.VITE_USE_LOCAL_BACKEND === 'true' ? LOCAL_API_URL : RENDER_API_URL);
export const ADMIN_AUTH_TOKEN = 'admin-secret-key-2026';

let activeAdminToken: string = sessionStorage.getItem('admin_rolling_token') || ADMIN_AUTH_TOKEN;

export function getAdminAuthToken(): string {
  return activeAdminToken || sessionStorage.getItem('admin_rolling_token') || ADMIN_AUTH_TOKEN;
}

export function revokeAdminToken(): void {
  activeAdminToken = '';
  sessionStorage.removeItem('admin_rolling_token');
  localStorage.removeItem('modlienquan_admin_password'); // Ensure zero password residual
}

export async function generateAdminTokenOnLogin(): Promise<string> {
  revokeAdminToken();
  activeAdminToken = ADMIN_AUTH_TOKEN;
  return await refreshAdminRollingToken();
}

export async function refreshAdminRollingToken(): Promise<string> {
  try {
    let currentToken = getAdminAuthToken();
    let res = await fetch(`${API_BASE_URL}/auth/rolling-token`, {
      headers: { 'X-Admin-Auth': currentToken }
    });

    if (!res.ok && currentToken !== ADMIN_AUTH_TOKEN) {
      sessionStorage.removeItem('admin_rolling_token');
      activeAdminToken = ADMIN_AUTH_TOKEN;
      currentToken = ADMIN_AUTH_TOKEN;
      res = await fetch(`${API_BASE_URL}/auth/rolling-token`, {
        headers: { 'X-Admin-Auth': ADMIN_AUTH_TOKEN }
      });
    }

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.token) {
        activeAdminToken = data.token;
        sessionStorage.setItem('admin_rolling_token', data.token);
        return data.token;
      }
    }
  } catch (err) {
    console.warn('Refresh admin rolling token failed', err);
  }
  return getAdminAuthToken();
}

export function getLanguageHeader(): Record<string, string> {
  const lang = localStorage.getItem('modlienquan_lang') || 'vi';
  return {
    'Accept-Language': lang
  };
}

export async function loginAdminInBackend(user: string, pass: string, otpCode?: string, setupSecret?: string): Promise<{ success: boolean; token?: string; message?: string; requires2FA?: boolean; requiresSetup2FA?: boolean; qrUrl?: string; setupSecret?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getLanguageHeader() },
      body: JSON.stringify({ username: user, password: pass, otpCode, setupSecret })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (data.requires2FA) {
        return { success: true, requires2FA: true, message: data.message };
      }
      if (data.requiresSetup2FA) {
        return { success: true, requiresSetup2FA: true, setupSecret: data.setupSecret, qrUrl: data.qrUrl, message: data.message };
      }
      if (data.token) {
        activeAdminToken = data.token;
        sessionStorage.setItem('admin_rolling_token', data.token);
        return { success: true, token: data.token, message: data.message };
      }
    } else {
      return { success: false, message: data.message || 'Tên đăng nhập hoặc mật khẩu không chính xác!' };
    }
  } catch (err) {
    console.warn('Login API failed', err);
  }
  return { success: false, message: 'Sai tài khoản hoặc mật khẩu Admin!' };
}

export async function changeAdminPasswordInBackend(newPassword: string): Promise<{ success: boolean; message: string }> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Auth': token,
        ...getLanguageHeader()
      },
      body: JSON.stringify({ newPassword })
    });
    const data = await res.json();
    return {
      success: res.ok && data.success,
      message: data.message || (res.ok ? 'Đã cập nhật mật khẩu Admin mới thành công!' : 'Đổi mật khẩu thất bại!')
    };
  } catch (err) {
    console.warn('Change password API call failed', err);
    return { success: false, message: 'Lỗi kết nối máy chủ! Không thể đổi mật khẩu.' };
  }
}
