import type { AppItem } from '../types';
import { initialApps } from '../data/appsData';
import { API_BASE_URL, refreshAdminRollingToken } from './authApi';

export async function fetchAppsFromBackend(): Promise<AppItem[]> {
  const localStr = localStorage.getItem('modlienquan_apps');
  const localApps: AppItem[] = localStr ? JSON.parse(localStr) : initialApps;
  const localMap = new Map<string, AppItem>(localApps.map((a) => [a.id, a]));

  try {
    const res = await fetch(`${API_BASE_URL}/apps`);
    if (res.ok) {
      const data = await res.json();
      const formatted = data.map((item: any) => {
        const localItem = localMap.get(item.id);
        const allowSellKey = item.allowSellKey !== undefined && item.allowSellKey !== null
          ? Boolean(item.allowSellKey)
          : (localItem && localItem.allowSellKey !== undefined ? localItem.allowSellKey : true);
        const allowFreeKey = item.allowFreeKey !== undefined && item.allowFreeKey !== null
          ? Boolean(item.allowFreeKey)
          : (localItem && localItem.allowFreeKey !== undefined ? localItem.allowFreeKey : true);
        const freeKey = item.freeKey !== undefined && item.freeKey !== null && item.freeKey !== ''
          ? item.freeKey
          : (localItem?.freeKey || '');
        const tags = item.tags
          ? item.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : (localItem?.tags || undefined);

        return {
          ...item,
          allowSellKey,
          allowFreeKey,
          freeKey,
          tags,
          updatedAt: item.updatedAt || new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          shots: item.shots ? item.shots.split(',').map((s: string) => s.trim()).filter(Boolean) : null
        };
      }).reverse();
      localStorage.setItem('modlienquan_apps', JSON.stringify(formatted));
      return formatted;
    }
  } catch (err) {
    console.warn('Backend API unavailable, using local storage fallback', err);
  }
  return localApps;
}

export async function saveAppToBackend(app: AppItem, isEditMode: boolean): Promise<AppItem> {
  const payload = {
    id: isEditMode && app.id ? app.id : null,
    name: app.name,
    sub: app.sub || '',
    icon: app.icon || '',
    cls: app.cls || '',
    note: app.note || '',
    shots: app.shots && app.shots.length > 0 ? app.shots.join(', ') : '',
    downloadUrl: app.downloadUrl || '',
    ipaUrl: app.ipaUrl || '',
    platform: app.platform || 'both',
    allowSellKey: app.allowSellKey !== undefined ? app.allowSellKey : true,
    allowFreeKey: app.allowFreeKey !== undefined ? app.allowFreeKey : true,
    freeKey: app.freeKey || '',
    tags: app.tags && app.tags.length > 0 ? app.tags.join(', ') : '',
    updatedAt: app.updatedAt || new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  };

  // Always update localStorage first for instantaneous UI responsiveness
  const localStr = localStorage.getItem('modlienquan_apps');
  const currentApps: AppItem[] = localStr ? JSON.parse(localStr) : initialApps;
  const appId = isEditMode && app.id ? app.id : (app.id || `app-${Date.now()}`);
  const formattedApp: AppItem = { ...app, id: appId };
  const idx = currentApps.findIndex(a => a.id === appId);
  let updatedList: AppItem[];
  if (idx >= 0) {
    updatedList = [...currentApps];
    updatedList[idx] = formattedApp;
  } else {
    updatedList = [formattedApp, ...currentApps];
  }
  localStorage.setItem('modlienquan_apps', JSON.stringify(updatedList));

  try {
    const token = await refreshAdminRollingToken();
    const url = isEditMode && app.id ? `${API_BASE_URL}/apps/${app.id}` : `${API_BASE_URL}/apps`;
    const method = isEditMode && app.id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Auth': token
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      const serverFormatted: AppItem = {
        ...data,
        allowSellKey: data.allowSellKey !== undefined && data.allowSellKey !== null ? Boolean(data.allowSellKey) : app.allowSellKey,
        allowFreeKey: data.allowFreeKey !== undefined && data.allowFreeKey !== null ? Boolean(data.allowFreeKey) : app.allowFreeKey,
        freeKey: data.freeKey || app.freeKey || '',
        tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : app.tags,
        updatedAt: data.updatedAt || new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        shots: data.shots ? data.shots.split(',').map((s: string) => s.trim()).filter(Boolean) : null
      };

      const finalIdx = updatedList.findIndex(a => a.id === serverFormatted.id);
      if (finalIdx >= 0) {
        updatedList[finalIdx] = serverFormatted;
        localStorage.setItem('modlienquan_apps', JSON.stringify(updatedList));
      }
      return serverFormatted;
    }
  } catch (err) {
    console.warn('Backend API save failed', err);
  }
  return formattedApp;
}


export async function deleteAppFromBackend(id: string): Promise<{ success: boolean; message?: string; blocked?: boolean; reason?: string }> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/apps/${id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Auth': token }
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      // Xóa thành công → cập nhật localStorage
      const local = localStorage.getItem('modlienquan_apps');
      const currentApps: AppItem[] = local ? JSON.parse(local) : initialApps;
      const filtered = currentApps.filter((a) => a.id !== id);
      localStorage.setItem('modlienquan_apps', JSON.stringify(filtered));
      return { success: true, message: data.message };
    }

    // Bị block (409) hoặc lỗi khác
    return {
      success: false,
      blocked: data.blocked ?? false,
      reason: data.reason,
      message: data.message ?? 'Không thể xóa app này.',
    };
  } catch (err) {
    console.warn('Backend API delete failed', err);
    return { success: false, message: 'Lỗi kết nối server.' };
  }
}


/**
 * Gán cùng 1 mã Key Free cho nhiều App cùng lúc.
 * @param appIds - Danh sách app IDs muốn cập nhật
 * @param freeKey - Mã Key Free (để trống = xóa key free)
 */
export async function batchSetFreeKey(appIds: string[], freeKey: string): Promise<{ success: boolean; updatedCount?: number; message?: string }> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/apps/batch-free-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Auth': token
      },
      body: JSON.stringify({ appIds, freeKey })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { success: true, updatedCount: data.updatedCount, message: data.message };
    return { success: false, message: data.message ?? 'Lỗi cập nhật batch free key.' };
  } catch (err) {
    console.warn('batchSetFreeKey failed', err);
    return { success: false, message: 'Lỗi kết nối server.' };
  }
}
