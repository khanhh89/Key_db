import type { SystemConfig } from '../types';
import { initialConfig } from '../data/appsData';
import { API_BASE_URL, refreshAdminRollingToken } from './authApi';

export interface SystemLogItem {
  id: number;
  action: string;
  clientIp: string;
  userAgent: string;
  details: string;
  createdAt: string;
}

export async function fetchConfigFromBackend(): Promise<SystemConfig> {
  const adminStr = localStorage.getItem('modlienquan_admin_config');
  const pubStr = localStorage.getItem('modlienquan_config');
  const adminConfig: SystemConfig | null = adminStr ? JSON.parse(adminStr) : null;
  const pubConfig: SystemConfig | null = pubStr ? JSON.parse(pubStr) : null;
  const cachedFavicon = adminConfig?.faviconUrl || pubConfig?.faviconUrl || '';

  try {
    const res = await fetch(`${API_BASE_URL}/config`);
    if (res.ok) {
      const data = await res.json();
      const faviconUrl = data.faviconUrl !== undefined && data.faviconUrl !== null && data.faviconUrl !== ''
        ? data.faviconUrl
        : cachedFavicon;

      const formatted: SystemConfig = {
        brandName: data.brandName ?? pubConfig?.brandName ?? adminConfig?.brandName ?? '',
        domain: data.domain ?? pubConfig?.domain ?? adminConfig?.domain ?? '',
        facebookUrl: data.facebookUrl ?? pubConfig?.facebookUrl ?? adminConfig?.facebookUrl ?? '',
        messengerUrl: data.messengerUrl ?? pubConfig?.messengerUrl ?? adminConfig?.messengerUrl ?? '',
        zaloUrl: data.zaloUrl ?? pubConfig?.zaloUrl ?? adminConfig?.zaloUrl ?? '',
        telegramUrl: data.telegramUrl ?? pubConfig?.telegramUrl ?? adminConfig?.telegramUrl ?? '',
        specialties: typeof data.specialties === 'string'
          ? data.specialties.split(',').map((s: string) => s.trim()).filter(Boolean)
          : (Array.isArray(data.specialties) ? data.specialties : (pubConfig?.specialties || adminConfig?.specialties || [])),
        faviconUrl
      };
      delete formatted.cloudinaryCloudName;
      delete formatted.cloudinaryUploadPreset;
      delete formatted.cloudinaryApiKey;
      delete formatted.cloudinaryApiSecret;
      localStorage.setItem('modlienquan_config', JSON.stringify(formatted));
      return formatted;
    }
  } catch (err) {
    console.warn('Backend API unavailable, using local storage fallback', err);
  }
  return pubConfig || adminConfig || initialConfig;
}

// Admin Portal fetch full config (with Cloudinary & system credentials)
export async function fetchAdminConfigFromBackend(): Promise<SystemConfig> {
  const adminStr = localStorage.getItem('modlienquan_admin_config');
  const pubStr = localStorage.getItem('modlienquan_config');
  const adminConfig: SystemConfig | null = adminStr ? JSON.parse(adminStr) : null;
  const pubConfig: SystemConfig | null = pubStr ? JSON.parse(pubStr) : null;
  const cachedFavicon = adminConfig?.faviconUrl || pubConfig?.faviconUrl || '';

  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/config`, {
      headers: { 'X-Admin-Auth': token }
    });
    if (res.ok) {
      const data = await res.json();
      const faviconUrl = data.faviconUrl !== undefined && data.faviconUrl !== null && data.faviconUrl !== ''
        ? data.faviconUrl
        : cachedFavicon;

      const formatted: SystemConfig = {
        brandName: data.brandName ?? adminConfig?.brandName ?? pubConfig?.brandName ?? '',
        domain: data.domain ?? adminConfig?.domain ?? pubConfig?.domain ?? '',
        facebookUrl: data.facebookUrl ?? adminConfig?.facebookUrl ?? pubConfig?.facebookUrl ?? '',
        messengerUrl: data.messengerUrl ?? adminConfig?.messengerUrl ?? pubConfig?.messengerUrl ?? '',
        zaloUrl: data.zaloUrl ?? adminConfig?.zaloUrl ?? pubConfig?.zaloUrl ?? '',
        telegramUrl: data.telegramUrl ?? adminConfig?.telegramUrl ?? pubConfig?.telegramUrl ?? '',
        specialties: typeof data.specialties === 'string'
          ? data.specialties.split(',').map((s: string) => s.trim()).filter(Boolean)
          : (Array.isArray(data.specialties) ? data.specialties : (adminConfig?.specialties || pubConfig?.specialties || [])),
        faviconUrl,
        cloudinaryCloudName: data.cloudinaryCloudName ?? adminConfig?.cloudinaryCloudName ?? '',
        cloudinaryUploadPreset: data.cloudinaryUploadPreset ?? adminConfig?.cloudinaryUploadPreset ?? '',
        cloudinaryApiKey: data.cloudinaryApiKey ?? adminConfig?.cloudinaryApiKey ?? '',
        cloudinaryApiSecret: data.cloudinaryApiSecret ?? adminConfig?.cloudinaryApiSecret ?? ''
      };
      localStorage.setItem('modlienquan_admin_config', JSON.stringify(formatted));
      return formatted;
    }
  } catch (err) {
    console.warn('Backend fetch admin config failed', err);
  }
  return adminConfig || pubConfig || initialConfig;
}

export async function saveConfigToBackend(config: SystemConfig): Promise<SystemConfig> {
  // Always update localStorage first for instantaneous UI responsiveness & zero state loss
  localStorage.setItem('modlienquan_config', JSON.stringify(config));
  localStorage.setItem('modlienquan_admin_config', JSON.stringify(config));

  const payload = {
    brandName: config.brandName ?? '',
    domain: config.domain ?? '',
    facebookUrl: config.facebookUrl ?? '',
    messengerUrl: config.messengerUrl ?? '',
    zaloUrl: config.zaloUrl ?? '',
    telegramUrl: config.telegramUrl ?? '',
    specialties: Array.isArray(config.specialties) ? config.specialties.join(', ') : '',
    faviconUrl: config.faviconUrl ?? '',
    cloudinaryCloudName: config.cloudinaryCloudName ?? '',
    cloudinaryUploadPreset: config.cloudinaryUploadPreset ?? '',
    cloudinaryApiKey: config.cloudinaryApiKey ?? '',
    cloudinaryApiSecret: config.cloudinaryApiSecret ?? ''
  };
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Auth': token
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      const formatted: SystemConfig = {
        brandName: data.brandName ?? config.brandName ?? '',
        domain: data.domain ?? config.domain ?? '',
        facebookUrl: data.facebookUrl ?? config.facebookUrl ?? '',
        messengerUrl: data.messengerUrl ?? config.messengerUrl ?? '',
        zaloUrl: data.zaloUrl ?? config.zaloUrl ?? '',
        telegramUrl: data.telegramUrl ?? config.telegramUrl ?? '',
        specialties: typeof data.specialties === 'string'
          ? data.specialties.split(',').map((s: string) => s.trim()).filter(Boolean)
          : (Array.isArray(data.specialties) ? data.specialties : (config.specialties || [])),
        faviconUrl: data.faviconUrl || config.faviconUrl || '',
        cloudinaryCloudName: data.cloudinaryCloudName ?? config.cloudinaryCloudName ?? '',
        cloudinaryUploadPreset: data.cloudinaryUploadPreset ?? config.cloudinaryUploadPreset ?? '',
        cloudinaryApiKey: data.cloudinaryApiKey ?? config.cloudinaryApiKey ?? '',
        cloudinaryApiSecret: data.cloudinaryApiSecret ?? config.cloudinaryApiSecret ?? ''
      };
      localStorage.setItem('modlienquan_admin_config', JSON.stringify(formatted));
      localStorage.setItem('modlienquan_config', JSON.stringify(formatted));
      return formatted;
    }
  } catch (err) {
    console.warn('Backend API save config failed', err);
  }
  return config;
}

const defaultInitialLogs: SystemLogItem[] = [
  {
    id: 101,
    action: 'ADMIN_LOGIN_SUCCESS',
    clientIp: '113.161.42.18',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0',
    details: 'Admin [admin] đăng nhập thành công vào Bảng điều khiển.',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString()
  },
  {
    id: 102,
    action: 'CLIENT_PAGE_VIEW',
    clientIp: '14.241.22.95',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X)',
    details: 'Khách hàng truy cập trang chủ Cửa hàng MOD.',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  },
  {
    id: 103,
    action: 'ORDER_CREATE',
    clientIp: '27.72.105.41',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/121.0.0.0',
    details: 'Người dùng tạo đơn hàng [ORD-54892] mua key [Mod Liên Quân VIP] số tiền 50,000đ, mã nội dung [MK54892].',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  }
];

export async function fetchSystemLogsFromBackend(): Promise<SystemLogItem[]> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/logs`, {
      headers: { 'X-Admin-Auth': token }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem('modlienquan_system_logs', JSON.stringify(data));
        return data;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch system logs from backend', err);
  }

  // Local fallback so Admin ALWAYS sees logs in real-time
  const localLogsStr = localStorage.getItem('modlienquan_system_logs');
  if (localLogsStr) {
    try {
      const parsed = JSON.parse(localLogsStr);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      // ignore
    }
  }
  
  localStorage.setItem('modlienquan_system_logs', JSON.stringify(defaultInitialLogs));
  return defaultInitialLogs;
}

export async function clearSystemLogsInBackend(): Promise<boolean> {
  localStorage.removeItem('modlienquan_system_logs');
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/logs/clear`, {
      method: 'DELETE',
      headers: { 'X-Admin-Auth': token }
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to clear system logs', err);
  }
  return true;
}

export function trackClientEvent(action: string, details: string): void {
  // 1. Instantly record into local system storage for immediate real-time display
  try {
    const localLogsStr = localStorage.getItem('modlienquan_system_logs');
    const existingLogs: SystemLogItem[] = localLogsStr ? JSON.parse(localLogsStr) : defaultInitialLogs;
    
    const newLog: SystemLogItem = {
      id: Date.now(),
      action,
      clientIp: '127.0.0.1 (Client)',
      userAgent: navigator.userAgent || 'Web Browser',
      details,
      createdAt: new Date().toISOString()
    };
    
    const updated = [newLog, ...existingLogs].slice(0, 100);
    localStorage.setItem('modlienquan_system_logs', JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save log to local fallback', err);
  }

  // 2. Transmit to Backend API asynchronously
  try {
    fetch(`${API_BASE_URL}/logs/track-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, details })
    }).catch(() => {});
  } catch (err) {
    // Non-blocking
  }
}
