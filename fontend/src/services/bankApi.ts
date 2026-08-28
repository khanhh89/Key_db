import type { BankConfig } from '../types';
import { API_BASE_URL, refreshAdminRollingToken } from './authApi';

const DEFAULT_BANK_PAYOS_CONFIG: BankConfig = {
  bankId: '',
  accountNo: '',
  accountName: '',
  payosClientId: '',
  payosApiKey: '',
  payosChecksumKey: '',
  payosEnabled: false,
  enableStaticQr: true
};

// Bank & PayOS Config API Helpers
export async function fetchBankConfigFromBackend(): Promise<BankConfig> {
  try {
    const res = await fetch(`${API_BASE_URL}/bank-config`);
    if (res.ok) {
      const data = await res.json();
      const publicBankConfig: BankConfig = {
        bankId: data.bankId ?? '',
        accountNo: data.accountNo ?? '',
        accountName: data.accountName ?? '',
        payosEnabled: data.payosEnabled ?? false,
        enableStaticQr: data.enableStaticQr ?? true
      };
      localStorage.setItem('modlienquan_bank_config', JSON.stringify(publicBankConfig));
      return publicBankConfig;
    }
  } catch (err) {
    console.warn('Backend fetch bank config failed, reading from localStorage', err);
  }
  const local = localStorage.getItem('modlienquan_bank_config');
  return local ? JSON.parse(local) : DEFAULT_BANK_PAYOS_CONFIG;
}

// Fetch Full Bank & PayOS Config for Admin Panel (Includes Unmasked API Keys)
export async function fetchAdminBankConfigFromBackend(): Promise<BankConfig> {
  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/bank-config`, {
      headers: { 'X-Admin-Auth': token }
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('modlienquan_admin_bank_config', JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Backend fetch admin bank config failed, reading from localStorage', err);
  }
  const local = localStorage.getItem('modlienquan_admin_bank_config');
  return local ? JSON.parse(local) : DEFAULT_BANK_PAYOS_CONFIG;
}

export async function saveBankConfigToBackend(bankConfig: BankConfig): Promise<BankConfig> {
  // Always save to localStorage immediately for instant persistence
  localStorage.setItem('modlienquan_admin_bank_config', JSON.stringify(bankConfig));
  localStorage.setItem('modlienquan_bank_config', JSON.stringify({
    bankId: bankConfig.bankId,
    accountNo: bankConfig.accountNo,
    accountName: bankConfig.accountName,
    payosEnabled: bankConfig.payosEnabled,
    enableStaticQr: bankConfig.enableStaticQr
  }));

  try {
    const token = await refreshAdminRollingToken();
    const res = await fetch(`${API_BASE_URL}/bank-config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Auth': token
      },
      body: JSON.stringify(bankConfig)
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('modlienquan_admin_bank_config', JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Backend save bank config failed, persisted to localStorage', err);
  }
  return bankConfig;
}