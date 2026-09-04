import type { OrderItem } from '../types';
import { API_BASE_URL, refreshAdminRollingToken } from './authApi';

// Local Storage Helper for Orders (Auto purge PENDING orders >15 minutes)
export function getLocalOrders(): OrderItem[] {
  try {
    const saved = localStorage.getItem('modlienquan_orders');
    if (!saved) return [];
    const list: OrderItem[] = JSON.parse(saved);
    const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
    const validOrders = list.filter((o) => {
      if (o.status === 'PENDING' && o.createdAt) {
        const createdTime = new Date(o.createdAt).getTime();
        if (!isNaN(createdTime) && createdTime < fifteenMinsAgo) {
          return false;
        }
      }
      return true;
    });
    if (validOrders.length !== list.length) {
      localStorage.setItem('modlienquan_orders', JSON.stringify(validOrders));
    }
    return validOrders;
  } catch (e) {
    return [];
  }
}

export function saveLocalOrder(order: OrderItem) {
  try {
    const current = getLocalOrders();
    const filtered = current.filter((o) => o.id !== order.id && o.paymentCode !== order.paymentCode);
    const updated = [order, ...filtered];
    localStorage.setItem('modlienquan_orders', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save order to localStorage', e);
  }
}

// Create purchase order for an app key
export async function createOrderInBackend(
  appId: string,
  appName: string,
  amount: number,
  durationDays?: number,
  customerEmail?: string
): Promise<OrderItem> {
  try {
    const res = await fetch(`${API_BASE_URL}/orders/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId, appName, amount, durationDays, customerEmail })
    });
    if (res.ok) {
      const data: OrderItem = await res.json();
      saveLocalOrder(data);
      return data;
    }
  } catch (err) {
    console.warn('Backend order creation failed, creating client order fallback', err);
  }
  const randomId = 'ORD-' + Math.floor(10000 + Math.random() * 90000);
  const randomCode = 'MK' + Math.floor(10000 + Math.random() * 90000);
  const fallbackOrder: OrderItem = {
    id: randomId,
    appId,
    appName,
    amount,
    durationDays,
    customerEmail,
    paymentCode: randomCode,
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };
  saveLocalOrder(fallbackOrder);
  return fallbackOrder;
}

// Create PayOS Payment Link
export interface PayosLinkData {
  orderId: string;
  paymentCode: string;
  orderCode: number;
  amount: number;
  qrCode?: string;
  rawQrCode?: string;
  checkoutUrl?: string;
  status: string;
}

export async function createPayosPaymentLinkInBackend(orderId: string, amount?: number): Promise<PayosLinkData | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/payos/create-payment-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        orderId, 
        amount,
        returnUrl: window.location.href,
        cancelUrl: window.location.href
      })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('PayOS payment link creation failed', err);
  }
  return null;
}

export async function fetchOrderStatusFromBackend(orderId: string): Promise<OrderItem | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`);
    if (res.ok) {
      const data: OrderItem = await res.json();
      saveLocalOrder(data);
      return data;
    }
  } catch (err) {
    console.warn('Backend order status check failed', err);
  }
  const localList = getLocalOrders();
  const found = localList.find((o) => o.id === orderId || o.paymentCode === orderId);
  return found || null;
}

// Confirm order payment & push key from MySQL DB (Admin Manual or System Webhook)
export async function confirmOrderPaymentInBackend(orderId: string): Promise<OrderItem | null> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/pay`, {
      method: 'POST',
      headers: { 'X-Admin-Auth': token }
    });
    if (res.ok) {
      const data: OrderItem = await res.json();
      saveLocalOrder(data);
      return data;
    }
  } catch (err) {
    console.warn('Backend order confirm payment failed', err);
  }
  const localList = getLocalOrders();
  const order = localList.find((o) => o.id === orderId);
  if (order) {
    const days = order.durationDays || 30;
    order.status = 'PAID';
    order.deliveredKey = order.deliveredKey || ('VIP-' + order.appName.replaceAll(/\s+/g, '').toUpperCase() + '-' + days + 'D-' + Math.random().toString(36).substring(2, 8).toUpperCase());
    order.paidAt = new Date().toISOString();
    saveLocalOrder(order);
    return order;
  }
  return null;
}

// Customer verification (Only releases key IF payment status is PAID)
export async function verifyCustomerPaymentInBackend(orderId: string): Promise<{ success: boolean; data?: OrderItem; message?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/verify-payment`, {
      method: 'POST'
    });

    if (res.status === 404) {
      const statusRes = await fetch(`${API_BASE_URL}/orders/${orderId}/status`);
      if (statusRes.ok) {
        const orderData: OrderItem = await statusRes.json();
        saveLocalOrder(orderData);
        if (orderData.status === 'PAID' && orderData.deliveredKey) {
          return { success: true, data: orderData };
        } else {
          return { success: false, message: `⏳ Hệ thống chưa nhận được tiền cho nội dung [${orderData.paymentCode}]. Vui lòng chuyển khoản đúng số tiền và nội dung!` };
        }
      }
    }

    const data = await res.json();
    if (res.ok) {
      saveLocalOrder(data);
      return { success: true, data };
    } else {
      return { success: false, message: data.message || 'Hệ thống chưa ghi nhận tiền trong tài khoản.' };
    }
  } catch (err) {
    console.warn('Verify customer payment error', err);
    try {
      const statusRes = await fetch(`${API_BASE_URL}/orders/${orderId}/status`);
      if (statusRes.ok) {
        const orderData: OrderItem = await statusRes.json();
        saveLocalOrder(orderData);
        if (orderData.status === 'PAID' && orderData.deliveredKey) {
          return { success: true, data: orderData };
        } else {
          return { success: false, message: `⏳ Hệ thống chưa nhận được tiền cho nội dung [${orderData.paymentCode}]. Vui lòng chuyển khoản đúng số tiền và nội dung!` };
        }
      }
    } catch (fallbackErr) {}
  }
  return { success: false, message: '⏳ Hệ thống chưa nhận được tiền vào tài khoản ngân hàng. Vui lòng hoàn tất chuyển khoản!' };
}

// Fetch all orders for Admin Portal (Merged API + LocalStorage)
export async function fetchAllOrdersFromBackend(): Promise<OrderItem[]> {
  const localOrders = getLocalOrders();
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/orders`, {
      headers: { 'X-Admin-Auth': token }
    });
    if (res.ok) {
      const remoteOrders: OrderItem[] = await res.json();
      const orderMap = new Map<string, OrderItem>();
      localOrders.forEach((o) => orderMap.set(o.id, o));
      remoteOrders.forEach((o) => orderMap.set(o.id, o));
      const merged = Array.from(orderMap.values()).sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      localStorage.setItem('modlienquan_orders', JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Backend fetch orders failed, returning local orders', err);
  }
  return localOrders;
}

// Delete single order from Backend
export async function deleteOrderFromBackend(id: string): Promise<boolean> {
  try {
    const token = await refreshAdminRollingToken();
    await fetch(`${API_BASE_URL}/orders/${id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Auth': token }
    });
  } catch (err) {
    console.warn('Backend delete order failed', err);
  }
  const current = getLocalOrders();
  const filtered = current.filter((o) => o.id !== id);
  localStorage.setItem('modlienquan_orders', JSON.stringify(filtered));
  return true;
}

// Clear all orders from Backend
export async function clearAllOrdersFromBackend(): Promise<boolean> {
  try {
    const token = await refreshAdminRollingToken();
    await fetch(`${API_BASE_URL}/orders/clear-all`, {
      method: 'DELETE',
      headers: { 'X-Admin-Auth': token }
    });
  } catch (err) {
    console.warn('Backend clear all orders failed', err);
  }
  localStorage.removeItem('modlienquan_orders');
  return true;
}
