import type { AppItem, ServiceItem, SystemConfig } from '../types';

export const initialApps: AppItem[] = [];

export const initialServices: ServiceItem[] = [];

export const initialConfig: SystemConfig = {
  brandName: '',
  domain: '',
  facebookUrl: '',
  messengerUrl: '',
  zaloUrl: '',
  telegramUrl: '',
  specialties: []
};

// Persistence helper functions using localStorage
export function loadApps(): AppItem[] {
  try {
    const saved = localStorage.getItem('modlienquan_apps');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load apps from localStorage', e);
  }
  return initialApps;
}

export function saveApps(apps: AppItem[]) {
  try {
    localStorage.setItem('modlienquan_apps', JSON.stringify(apps));
  } catch (e) {
    console.error('Failed to save apps to localStorage', e);
  }
}

export function loadServices(): ServiceItem[] {
  try {
    const saved = localStorage.getItem('modlienquan_services');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load services from localStorage', e);
  }
  return initialServices;
}

export function saveServices(services: ServiceItem[]) {
  try {
    localStorage.setItem('modlienquan_services', JSON.stringify(services));
  } catch (e) {
    console.error('Failed to save services to localStorage', e);
  }
}

export function loadConfig(): SystemConfig {
  try {
    const saved = localStorage.getItem('modlienquan_config');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load config from localStorage', e);
  }
  return initialConfig;
}

export function saveConfig(config: SystemConfig) {
  try {
    localStorage.setItem('modlienquan_config', JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save config to localStorage', e);
  }
}
