export type Language = 'vi' | 'en';

export interface AppItem {
  id: string;
  name: string;
  sub: string;
  icon: string;
  cls: string;
  note: string;
  shots: string[] | null;
  downloadUrl?: string;
  ipaUrl?: string;
  allowSellKey?: boolean;
  allowFreeKey?: boolean;
  freeKey?: string;
  updatedAt?: string;
}

export interface ServiceItem {
  id: string;
  cls: string;
  icon: string;
  title: string;
  text: string;
  url: string;
}

export interface SystemConfig {
  brandName: string;
  domain: string;
  facebookUrl: string;
  messengerUrl: string;
  zaloUrl: string;
  telegramUrl: string;
  specialties: string[];
  faviconUrl?: string;
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
}

export interface LightboxItem {
  label: string;
  caption: string;
  imageSrc?: string;
}

export interface OrderItem {
  id: string;
  appId: string;
  appName: string;
  keyId?: string;
  amount: number;
  durationDays?: number;
  paymentCode: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  deliveredKey?: string;
  createdAt?: string;
  paidAt?: string;
}

export interface LicenseKeyItem {
  id: string;
  appId: string;
  keyCode: string;
  durationDays: number;
  price: number;
  status: 'AVAILABLE' | 'SOLD';
  createdAt?: string;
  soldAt?: string;
}

export interface BankConfig {
  id?: number;
  bankId: string;
  accountNo: string;
  accountName: string;
  payosClientId?: string;
  payosApiKey?: string;
  payosChecksumKey?: string;
  payosEnabled?: boolean;
  enableStaticQr?: boolean;
}

export interface CouponItem {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  maxUses?: number;
  usedCount?: number;
  appId?: string;
  active?: boolean;
  createdAt?: string;
  validUntil?: string;
}

