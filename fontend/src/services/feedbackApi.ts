import { API_BASE_URL, refreshAdminRollingToken } from './authApi';
import { getDeviceHeaders } from '../utils/deviceUtils';
import type { FeedbackItem, FeedbackCreatePayload, FeedbackStatus } from '../types';

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
  const res = await fetch(`${API_BASE_URL}/v1/feedbacks`, {
    method: 'POST',
    headers: getDeviceHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Gửi phản hồi thất bại' }));
    throw new Error(errorData.error || 'Gửi phản hồi thất bại');
  }

  return res.json();
}

export async function fetchMyFeedbacks(): Promise<FeedbackItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/feedbacks/my-feedbacks`, {
      method: 'GET',
      headers: getDeviceHeaders()
    });

    if (res.ok) {
      return res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch user feedbacks from backend:', err);
  }
  return [];
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

  if (!res.ok) {
    throw new Error('Không thể tải danh sách phản hồi quản trị');
  }

  return res.json();
}

export async function fetchPublicApprovedFeedbacks(): Promise<FeedbackItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/feedbacks/public-approved`);
    if (res.ok) {
      return res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch public approved feedbacks:', err);
  }
  return [];
}

export async function replyAdminFeedback(
  id: number,
  status: FeedbackStatus,
  adminReply: string,
  isApprovedForHome?: boolean
): Promise<FeedbackItem> {
  const token = await refreshAdminRollingToken();
  const res = await fetch(`${API_BASE_URL}/v1/admin/feedbacks/${id}/reply`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Auth': token
    },
    body: JSON.stringify({ status, adminReply, isApprovedForHome })
  });

  if (!res.ok) {
    throw new Error('Không thể cập nhật phản hồi');
  }

  return res.json();
}

export async function setDeviceBlockedStatus(deviceId: string, isBlocked: boolean): Promise<boolean> {
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
}
