/**
 * VietQR & Banking Deep Link Utility Helpers
 * Formats and parses EMVCo QR payloads and generates VietQR redirect deep links
 * with 100% pre-filled data (account number, amount, transfer code, beneficiary name).
 */

export interface ParsedEmvQr {
  bin?: string;
  accountNumber?: string;
  accountName?: string;
  amount?: number;
  paymentCode?: string;
}

/**
 * Parses an EMVCo VietQR string (Napas 247 standard TLV structure)
 */
export function parseVietQrEmvCo(qr: string): ParsedEmvQr {
  if (!qr || typeof qr !== 'string') return {};

  const result: ParsedEmvQr = {};

  const parseTlv = (str: string): Record<string, string> => {
    const tags: Record<string, string> = {};
    let idx = 0;
    while (idx < str.length - 4) {
      const tag = str.substring(idx, idx + 2);
      const len = parseInt(str.substring(idx + 2, idx + 4), 10);
      if (isNaN(len) || idx + 4 + len > str.length) break;
      const val = str.substring(idx + 4, idx + 4 + len);
      tags[tag] = val;
      idx += 4 + len;
    }
    return tags;
  };

  try {
    const rootTags = parseTlv(qr);

    // Tag 38: Merchant Account Info (NAPAS 247)
    if (rootTags['38']) {
      const tag38 = parseTlv(rootTags['38']);
      // Subtag 01: Payment Network Specific Information
      if (tag38['01']) {
        const tag01 = parseTlv(tag38['01']);
        if (tag01['00']) result.bin = tag01['00'].trim(); // Bank BIN, e.g. 970422
        if (tag01['01']) result.accountNumber = tag01['01'].trim(); // Account Number
      }
    }

    // Tag 54: Amount
    if (rootTags['54']) {
      const amt = parseFloat(rootTags['54']);
      if (!isNaN(amt) && amt > 0) result.amount = amt;
    }

    // Tag 59: Beneficiary / Merchant Name
    if (rootTags['59']) {
      result.accountName = rootTags['59'].trim();
    }

    // Tag 62: Additional Data Field (Subtag 08: Purpose of transaction / Payment Code)
    if (rootTags['62']) {
      const tag62 = parseTlv(rootTags['62']);
      if (tag62['08']) {
        result.paymentCode = tag62['08'].trim();
      }
    }
  } catch (err) {
    console.warn('Failed to parse EMVCo VietQR payload:', err);
  }

  return result;
}

/**
 * Standard Bank ID / BIN Mapping Dictionary
 */
const BANK_MAP: Record<string, string> = {
  // MB Bank
  'MB': 'mb',
  'MBBANK': 'mb',
  '970422': '970422',

  // Vietcombank
  'VCB': 'vcb',
  'VIETCOMBANK': 'vcb',
  '970436': '970436',

  // BIDV
  'BIDV': 'bidv',
  '970418': '970418',

  // VietinBank
  'ICB': 'icb',
  'VIETINBANK': 'icb',
  '970415': '970415',

  // Techcombank
  'TCB': 'tcb',
  'TECHCOMBANK': 'tcb',
  '970407': '970407',

  // ACB
  'ACB': 'acb',
  '970416': '970416',

  // VPBank
  'VPB': 'vpb',
  'VPBANK': 'vpb',
  '970432': '970432',

  // TPBank
  'TPB': 'tpb',
  'TPBANK': 'tpb',
  '970423': '970423',

  // Agribank
  'VBA': 'vba',
  'AGRIBANK': 'vba',
  '970405': '970405',

  // Sacombank
  'STB': 'stb',
  'SACOMBANK': 'stb',
  '970403': '970403',

  // MSB
  'MSB': 'msb',
  'MSBBANK': 'msb',
  '970426': '970426',

  // OCB
  'OCB': 'ocb',
  'OCBBANK': 'ocb',
  '970448': '970448',

  // SHB
  'SHB': 'shb',
  '970443': '970443',

  // HDBank
  'HDB': 'hdb',
  'HDBANK': 'hdb',
  '970437': '970437',

  // LPBank
  'LPB': 'lpb',
  'LIENVIETPOSTBANK': 'lpb',
  '970449': '970449',

  // VIB
  'VIB': 'vib',
  '970441': '970441',

  // SeABank
  'SEAB': 'seabank',
  'SEABANK': 'seabank',
  '970440': '970440',

  // Eximbank
  'EIB': 'eximbank',
  'EXIMBANK': 'eximbank',
  '970431': '970431',

  // E-wallets
  'MOMO': 'momo',
  'ZALOPAY': 'zalopay',
  'VIETTELMONEY': 'viettelmoney'
};

/**
 * Normalizes any Bank ID or BIN string to standard VietQR identifier
 */
export function normalizeBankId(rawBankId?: string): string {
  if (!rawBankId) return 'mb';
  const clean = rawBankId.trim().toUpperCase();
  if (BANK_MAP[clean]) {
    return BANK_MAP[clean];
  }
  return rawBankId.trim().toLowerCase();
}

export interface VietQrDeeplinkOptions {
  accountNo: string;
  bankIdOrBin: string;
  amount: number;
  paymentCode: string;
  accountName?: string;
}

/**
 * Builds a universal VietQR redirect deep link (dl.vietqr.io/pay)
 * with 100% pre-filled query parameters (ba, am, tn, bn)
 */
export function buildVietQrDeeplink(targetAppId: string, options: VietQrDeeplinkOptions): string {
  const cleanApp = targetAppId.trim().toLowerCase();
  const cleanAccountNo = options.accountNo.replace(/\s+/g, '');
  const cleanBankId = normalizeBankId(options.bankIdOrBin);
  const cleanAmount = Math.round(options.amount);
  const cleanCode = options.paymentCode ? options.paymentCode.trim() : '';
  const cleanName = options.accountName ? options.accountName.trim() : '';

  // ba format: <AccountNo>@<BankIdOrBin>
  const ba = `${cleanAccountNo}@${cleanBankId}`;

  let url = `https://dl.vietqr.io/pay?app=${cleanApp}&ba=${encodeURIComponent(ba)}&am=${cleanAmount}&tn=${encodeURIComponent(cleanCode)}`;

  if (cleanName) {
    url += `&bn=${encodeURIComponent(cleanName)}`;
  }

  return url;
}
