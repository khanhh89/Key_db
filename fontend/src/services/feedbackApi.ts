import { API_BASE_URL, refreshAdminRollingToken } from './authApi';
import { getDeviceHeaders, getOrCreateDeviceId } from '../utils/deviceUtils';
import type { FeedbackItem, FeedbackCreatePayload, FeedbackStatus } from '../types';

const LOCAL_STORAGE_FEEDBACKS_KEY = 'modlienquan_feedbacks';

function getLocalFeedbacks(): FeedbackItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FEEDBACKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

function saveLocalFeedbacks(items: FeedbackItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_FEEDBACKS_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('Could not save feedbacks to localStorage:', err);
  }
}

export async function syncDeviceWithBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/device/sync`, {
      method: 'POST',
      headers: getDeviceHeaders(),
      body: JSON.stringify({
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language || 'vi-VN'
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to sync device with backend:', err);
    return false;
  }
}

export async function submitFeedback(payload: FeedbackCreatePayload): Promise<FeedbackItem> {
  const deviceId = getOrCreateDeviceId();
  let createdItem: FeedbackItem | null = null;

  try {
    const res = await fetch(`${API_BASE_URL}/v1/feedbacks`, {
      method: 'POST',
      headers: getDeviceHeaders(),
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      createdItem = await res.json();
    } else {
      const errorData = await res.json().catch(() => ({ error: 'Gửi phản hồi thất bại' }));
      throw new Error(errorData.error || 'Gửi phản hồi thất bại');
    }
  } catch (err: any) {
    // If backend is offline, create fallback local item
    if (err.message && err.message.includes('Gửi phản hồi thất bại')) {
      throw err;
    }
    console.warn('Backend unavailable, saving feedback locally', err);
    createdItem = {
      id: Date.now(),
      deviceId,
      category: payload.category,
      title: payload.title,
      content: payload.content,
      rating: payload.rating,
      contactInfo: payload.contactInfo,
      attachmentUrls: payload.attachmentUrls ? payload.attachmentUrls.join(',') : undefined,
      status: 'PENDING',
      isApprovedForHome: false,
      createdAt: new Date().toISOString()
    };
  }

  if (createdItem) {
    const currentLocal = getLocalFeedbacks();
    const updated = [createdItem, ...currentLocal.filter(f => f.id !== createdItem!.id)];
    saveLocalFeedbacks(updated);
  }

  return createdItem!;
}

export async function fetchMyFeedbacks(): Promise<FeedbackItem[]> {
  const deviceId = getOrCreateDeviceId();
  let serverList: FeedbackItem[] = [];

  try {
    const res = await fetch(`${API_BASE_URL}/v1/feedbacks/my-feedbacks`, {
      method: 'GET',
      headers: getDeviceHeaders()
    });

    if (res.ok) {
      serverList = await res.json();
      // Sync local storage with latest server list
      const local = getLocalFeedbacks();
      const otherDeviceFeedbacks = local.filter(f => f.deviceId !== deviceId);
      saveLocalFeedbacks([...serverList, ...otherDeviceFeedbacks]);
      return serverList;
    }
  } catch (err) {
    console.warn('Failed to fetch user feedbacks from backend, returning local cache:', err);
  }

  // Fallback to local storage filtering by deviceId
  const local = getLocalFeedbacks();
  return local.filter(f => f.deviceId === deviceId);
}

export interface AdminFeedbackPageResult {
  content: FeedbackItem[];
  totalPages: number;
  totalElements: number;
  number: number;
}

export async function fetchAdminFeedbacks(
  status: string = 'ALL',
  category: string = 'ALL',
  page: number = 0,
  size: number = 10
): Promise<AdminFeedbackPageResult> {
  try {
    const token = await refreshAdminRollingToken();
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString()
    });
    if (status !== 'ALL') params.append('status', status);
    if (category !== 'ALL') params.append('category', category);

    const res = await fetch(`${API_BASE_URL}/v1/admin/feedbacks?${params.toString()}`, {
      headers: {
        'X-Admin-Auth': token
      }
    });

    if (res.ok) {
      const data: AdminFeedbackPageResult = await res.json();
      // Merge with local storage for seamless sync
      const local = getLocalFeedbacks();
      if (local.length > 0) {
        const existingIds = new Set(data.content.map(f => f.id));
        const mergedContent = [...data.content];
        local.forEach(l => {
          if (!existingIds.has(l.id)) {
            mergedContent.push(l);
          }
        });
        return {
          content: mergedContent,
          totalPages: Math.max(data.totalPages, 1),
          totalElements: data.totalElements + local.filter(l => !existingIds.has(l.id)).length,
          number: data.number
        };
      }
      return data;
    }
  } catch (err) {
    console.warn('Backend admin fetch failed, falling back to localStorage items', err);
  }

  // Local Storage Fallback for Admin
  let filtered = getLocalFeedbacks();
  if (status !== 'ALL') {
    filtered = filtered.filter(f => f.status === status);
  }
  if (category !== 'ALL') {
    filtered = filtered.filter(f => f.category === category);
  }

  return {
    content: filtered,
    totalPages: Math.max(1, Math.ceil(filtered.length / size)),
    totalElements: filtered.length,
    number: page
  };
}

export async function fetchPublicApprovedFeedbacks(): Promise<FeedbackItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/feedbacks/public-approved`);
    if (res.ok) {
      const serverList: FeedbackItem[] = await res.json();
      // Merge with approved local items
      const localApproved = getLocalFeedbacks().filter(f => f.isApprovedForHome);
      const existingIds = new Set(serverList.map(f => f.id));
      const combined = [...serverList];
      localApproved.forEach(l => {
        if (!existingIds.has(l.id)) {
          combined.push(l);
        }
      });
      return combined;
    }
  } catch (err) {
    console.warn('Failed to fetch public approved feedbacks from backend, returning local approved:', err);
  }

  const local = getLocalFeedbacks();
  return local.filter(f => f.isApprovedForHome);
}

export async function replyAdminFeedback(
  id: number,
  status: FeedbackStatus,
  adminReply: string,
  isApprovedForHome?: boolean
): Promise<FeedbackItem> {
  let updatedItem: FeedbackItem | null = null;

  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/v1/admin/feedbacks/${id}/reply`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Auth': token
      },
      body: JSON.stringify({ status, adminReply, isApprovedForHome })
    });

    if (res.ok) {
      updatedItem = await res.json();
    }
  } catch (err) {
    console.warn('Backend admin reply failed, updating locally', err);
  }

  // Update in local storage
  const local = getLocalFeedbacks();
  const idx = local.findIndex(f => f.id === id);
  if (idx >= 0) {
    local[idx] = {
      ...local[idx],
      status: status || local[idx].status,
      adminReply: adminReply !== undefined ? adminReply : local[idx].adminReply,
      isApprovedForHome: isApprovedForHome !== undefined ? isApprovedForHome : local[idx].isApprovedForHome,
      repliedAt: new Date().toISOString()
    };
    saveLocalFeedbacks(local);
    if (!updatedItem) {
      updatedItem = local[idx];
    }
  } else if (!updatedItem) {
    updatedItem = {
      id,
      deviceId: 'admin-manual',
      category: 'GENERAL_FEEDBACK',
      title: 'Phản hồi từ Admin',
      content: 'Cập nhật từ Admin',
      status,
      adminReply,
      isApprovedForHome,
      repliedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    saveLocalFeedbacks([updatedItem, ...local]);
  }

  return updatedItem!;
}

export async function setDeviceBlockedStatus(deviceId: string, isBlocked: boolean): Promise<boolean> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/v1/admin/devices/${deviceId}/block`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Auth': token
      },
      body: JSON.stringify({ isBlocked })
    });

    return res.ok;
  } catch (err) {
    console.warn('Backend block device call failed', err);
  }
  return true;
}
