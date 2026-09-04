import type { ServiceItem } from '../types';
import { initialServices } from '../data/appsData';
import { API_BASE_URL, refreshAdminRollingToken } from './authApi';

export async function fetchServicesFromBackend(): Promise<ServiceItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/services`);
    if (res.ok) {
      const data = await res.json();
      const reversed = data.reverse();
      localStorage.setItem('modlienquan_services', JSON.stringify(reversed));
      return reversed;
    }
  } catch (err) {
    console.warn('Backend MySQL API unavailable, using local storage fallback', err);
  }
  const local = localStorage.getItem('modlienquan_services');
  return local ? JSON.parse(local) : initialServices;
}

export async function saveServiceToBackend(service: ServiceItem, isEditMode: boolean): Promise<ServiceItem> {
  try {
    const token = await refreshAdminRollingToken();
    const url = isEditMode ? `${API_BASE_URL}/services/${service.id}` : `${API_BASE_URL}/services`;
    const method = isEditMode ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Auth': token
      },
      body: JSON.stringify(service)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend API save service failed', err);
  }
  return service;
}

export async function deleteServiceFromBackend(id: string): Promise<boolean> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/services/${id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Auth': token }
    });
    const local = localStorage.getItem('modlienquan_services');
    const currentServices: ServiceItem[] = local ? JSON.parse(local) : initialServices;
    const filtered = currentServices.filter((s) => s.id !== id);
    localStorage.setItem('modlienquan_services', JSON.stringify(filtered));
    return res.ok;
  } catch (err) {
    console.warn('Backend API delete service failed', err);
    const local = localStorage.getItem('modlienquan_services');
    const currentServices: ServiceItem[] = local ? JSON.parse(local) : initialServices;
    const filtered = currentServices.filter((s) => s.id !== id);
    localStorage.setItem('modlienquan_services', JSON.stringify(filtered));
    return true;
  }
}
