import type { LicenseKeyItem } from '../types';
import { API_BASE_URL, refreshAdminRollingToken } from './authApi';

// Fetch Keys inventory for Public site (Masked keyCode strings)
export async function fetchKeysFromBackend(): Promise<LicenseKeyItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/keys`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend fetch keys failed', err);
  }
  return [];
}

// Fetch Keys inventory for Admin Panel (Unmasked full keyCode strings)
export async function fetchAdminKeysFromBackend(): Promise<LicenseKeyItem[]> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/keys`, {
      headers: { 'X-Admin-Auth': token }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend fetch admin keys failed', err);
  }
  return [];
}

// Create new Key in MySQL DB
export async function saveKeyToBackend(keyItem: Partial<LicenseKeyItem>): Promise<LicenseKeyItem | null> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Auth': token
      },
      body: JSON.stringify(keyItem)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend save key failed', err);
  }
  return null;
}

// Update existing Key in MySQL DB
export async function updateKeyInBackend(id: string, keyItem: Partial<LicenseKeyItem>): Promise<LicenseKeyItem | null> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/keys/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Auth': token
      },
      body: JSON.stringify(keyItem)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend update key failed', err);
  }
  return null;
}

// Bulk update prices by package duration / appId category
export async function updateKeyPricesByCategoryInBackend(
  durationDays: number | null,
  price: number,
  appId?: string,
  onlyAvailable: boolean = true
): Promise<{ success: boolean; count: number; message: string }> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/keys/bulk-update-price`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Auth': token
      },
      body: JSON.stringify({
        durationDays: durationDays || null,
        appId: appId && appId !== 'ALL' ? appId : null,
        price,
        onlyAvailable
      })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend bulk update price failed', err);
  }
  return { success: false, count: 0, message: 'Lỗi khi kết nối đến máy chủ hệ thống.' };
}

// Delete key from MySQL DB
export async function deleteKeyFromBackend(id: string): Promise<boolean> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/keys/${id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Auth': token }
    });
    return res.ok;
  } catch (err) {
    console.warn('Backend delete key failed', err);
    return false;
  }
}

// Batch delete keys from MySQL DB
export async function batchDeleteKeysFromBackend(ids: string[]): Promise<{ success: boolean; count: number; message: string }> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/keys/batch-delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Auth': token
      },
      body: JSON.stringify(ids)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend batch delete keys failed', err);
  }
  return { success: false, count: 0, message: 'Lỗi khi xóa hàng loạt key.' };
}

// Batch update key status (AVAILABLE / SOLD)
export async function batchUpdateKeyStatusInBackend(ids: string[], status: 'AVAILABLE' | 'SOLD'): Promise<{ success: boolean; count: number; message: string }> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/keys/batch-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Auth': token
      },
      body: JSON.stringify({ ids, status })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend batch status key update failed', err);
  }
  return { success: false, count: 0, message: 'Lỗi khi đổi trạng thái hàng loạt.' };
}
