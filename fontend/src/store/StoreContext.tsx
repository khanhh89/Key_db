import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Language, SystemConfig, AppItem, ServiceItem } from '../types';
import { initialApps, initialServices, initialConfig } from '../data/appsData';
import { getTranslation } from '../data/translations';
import {
  fetchAppsFromBackend,
  fetchServicesFromBackend,
  fetchConfigFromBackend,
  loginAdminInBackend,
  revokeAdminToken
} from '../services/api';

export interface StoreContextType {
  // Language & Translations
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: ReturnType<typeof getTranslation>;

  // Theme
  dark: boolean;
  setDark: (dark: boolean) => void;
  toggleDark: () => void;

  // Authorization
  isAuthenticated: boolean;
  loginAdmin: (user: string, pass: string) => Promise<boolean>;
  logoutAdmin: () => void;

  // Global Data
  apps: AppItem[];
  setApps: React.Dispatch<React.SetStateAction<AppItem[]>>;
  services: ServiceItem[];
  setServices: React.Dispatch<React.SetStateAction<ServiceItem[]>>;
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;

  // Toast Notifications
  toast: string | null;
  showToast: (msg: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // 1. Language State
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('modlienquan_lang') as Language;
    return saved === 'en' || saved === 'vi' ? saved : 'vi';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('modlienquan_lang', newLang);
  };

  const toggleLang = () => {
    setLang(lang === 'vi' ? 'en' : 'vi');
  };

  const t = getTranslation(lang);

  // 2. Theme State
  const [dark, setDarkState] = useState<boolean>(() => {
    const saved = localStorage.getItem('modlienquan_theme');
    return saved ? saved === 'dark' : true;
  });

  const setDark = (isDark: boolean) => {
    setDarkState(isDark);
    localStorage.setItem('modlienquan_theme', isDark ? 'dark' : 'light');
  };

  const toggleDark = () => {
    setDark(!dark);
  };

  // 3. Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('modlienquan_admin_auth') === 'true';
  });

  // 4. Data States
  const [apps, setApps] = useState<AppItem[]>(() => {
    const local = localStorage.getItem('modlienquan_apps');
    return local ? JSON.parse(local) : initialApps;
  });

  const [services, setServices] = useState<ServiceItem[]>(() => {
    const local = localStorage.getItem('modlienquan_services');
    return local ? JSON.parse(local) : initialServices;
  });

  const [config, setConfig] = useState<SystemConfig>(() => {
    const local = localStorage.getItem('modlienquan_config') || localStorage.getItem('modlienquan_admin_config');
    return local ? JSON.parse(local) : initialConfig;
  });

  // 5. Toast State
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Load backend data on mount
  useEffect(() => {
    const loadBackendData = async () => {
      try {
        const [backendApps, backendServices, backendConfig] = await Promise.all([
          fetchAppsFromBackend(),
          fetchServicesFromBackend(),
          fetchConfigFromBackend()
        ]);
        if (backendApps) setApps(backendApps);
        if (backendServices) setServices(backendServices);
        if (backendConfig) setConfig(backendConfig);
      } catch (err) {
        console.error('StoreProvider: Failed to load backend data', err);
      }
    };
    loadBackendData();
  }, []);

  // Auth Functions
  const loginAdmin = async (user: string, pass: string): Promise<boolean> => {
    localStorage.removeItem('modlienquan_admin_password'); // Clean up any legacy password key
    const result = await loginAdminInBackend(user, pass);
    if (result.success) {
      setIsAuthenticated(true);
      localStorage.setItem('modlienquan_admin_auth', 'true');
      showToast(lang === 'vi' ? '🎉 Đăng nhập Admin thành công! Đã cấp Token mới.' : 'Admin logged in! New token generated.');
      return true;
    }
    showToast(lang === 'vi' ? (result.message || '❌ Sai tài khoản hoặc mật khẩu Admin!') : 'Invalid login credentials!');
    return false;
  };

  const logoutAdmin = () => {
    revokeAdminToken();
    setIsAuthenticated(false);
    localStorage.removeItem('modlienquan_admin_auth');
    showToast(lang === 'vi' ? '🚪 Đã thu hồi Token & đăng xuất Admin' : 'Token revoked & Admin logged out');
  };

  const value: StoreContextType = {
    lang,
    setLang,
    toggleLang,
    t,
    dark,
    setDark,
    toggleDark,
    isAuthenticated,
    loginAdmin,
    logoutAdmin,
    apps,
    setApps,
    services,
    setServices,
    config,
    setConfig,
    toast,
    showToast
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// Custom Hook to access global Store
export function useStore(): StoreContextType {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}

// Shortcut Hook for Language & Translations
export function useLanguage() {
  const { lang, setLang, toggleLang, t } = useStore();
  return { lang, setLang, toggleLang, t };
}
