import type { FreeKeyNoteItem } from '../types';
import { API_BASE_URL, refreshAdminRollingToken } from './authApi';

// ==========================================
// PUBLIC APIS
// ==========================================

export async function fetchPublicNoteFromBackend(slug: string, password?: string): Promise<FreeKeyNoteItem | null> {
  try {
    const url = new URL(`${API_BASE_URL}/notes/public/${encodeURIComponent(slug)}`);
    if (password) {
      url.searchParams.set('password', password);
    }
    const res = await fetch(url.toString());
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Backend fetch public note failed', err);
    return null;
  }
}

export async function verifyNotePasswordInBackend(slug: string, password: string): Promise<FreeKeyNoteItem | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/notes/public/${encodeURIComponent(slug)}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Backend verify note password failed', err);
    return null;
  }
}

// ==========================================
// ADMIN APIS
// ==========================================

export async function fetchAdminNotesFromBackend(): Promise<FreeKeyNoteItem[]> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/notes/admin`, {
      headers: { 'X-Admin-Auth': token }
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('Backend fetch admin notes failed', err);
  }
  return [];
}

export async function saveAdminNoteToBackend(
  note: Partial<FreeKeyNoteItem>,
  isEditMode: boolean
): Promise<{ success: boolean; data?: FreeKeyNoteItem; message?: string }> {
  try {
    const token = await refreshAdminRollingToken();
    const url = isEditMode ? `${API_BASE_URL}/notes/admin/${note.id}` : `${API_BASE_URL}/notes/admin`;
    const method = isEditMode ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Auth': token
      },
      body: JSON.stringify(note)
    });

    const data = await res.json();
    if (res.ok) {
      return { success: true, data };
    } else {
      return { success: false, message: data.message || 'Lưu ghi chú thất bại' };
    }
  } catch (err: any) {
    console.warn('Backend save note failed', err);
    return { success: false, message: err?.message || 'Lỗi kết nối máy chủ' };
  }
}

export async function deleteAdminNoteFromBackend(id: string): Promise<boolean> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/notes/admin/${id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Auth': token }
    });
    return res.ok;
  } catch (err) {
    console.warn('Backend delete note failed', err);
    return false;
  }
}

export async function toggleAdminNoteActiveInBackend(id: string): Promise<boolean> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/notes/admin/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'X-Admin-Auth': token }
    });
    return res.ok;
  } catch (err) {
    console.warn('Backend toggle note active failed', err);
    return false;
  }
}
