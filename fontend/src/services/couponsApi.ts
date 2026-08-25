import type { CouponItem } from '../types';
import { API_BASE_URL, refreshAdminRollingToken } from './authApi';

export async function fetchCouponsFromBackend(): Promise<CouponItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/coupons`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend fetch coupons failed', err);
  }
  return [];
}

export async function saveCouponToBackend(coupon: Partial<CouponItem>, isEditMode: boolean): Promise<CouponItem | null> {
  try {
    const token = await refreshAdminRollingToken();
    const url = isEditMode ? `${API_BASE_URL}/coupons/${coupon.id}` : `${API_BASE_URL}/coupons`;
    const method = isEditMode ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Auth': token
      },
      body: JSON.stringify(coupon)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend save coupon failed', err);
  }
  return null;
}

export async function deleteCouponFromBackend(id: string): Promise<boolean> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/coupons/${id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Auth': token }
    });
    return res.ok;
  } catch (err) {
    console.warn('Backend delete coupon failed', err);
    return false;
  }
}

export interface CouponApplyResult {
  valid: boolean;
  code?: string;
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue?: number;
  discountAmount?: number;
  finalAmount?: number;
  message: string;
}

export async function applyCouponInBackend(code: string, orderAmount: number, appId?: string): Promise<CouponApplyResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/coupons/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, orderAmount, appId })
    });
    const data = await res.json();
    if (res.ok && data.valid) {
      return data;
    } else {
      return { valid: false, message: data.message || 'Mã giảm giá không hợp lệ!' };
    }
  } catch (err) {
    console.warn('Backend apply coupon failed', err);
  }
  return { valid: false, message: 'Không thể kết nối đến máy chủ xác thực mã giảm giá.' };
}

export async function releaseCouponInBackend(code: string): Promise<boolean> {
  if (!code) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/coupons/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    return res.ok;
  } catch (err) {
    console.warn('Backend release coupon failed', err);
    return false;
  }
}

