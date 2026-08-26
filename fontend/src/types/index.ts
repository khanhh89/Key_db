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
  tags?: string[];
}

export interface ServiceItem {
  id: string;
  cls: string;
  icon: string;
  title: string;
  text: string;
  url: string;
}

export interface ContactChannel {
  id: string;
  name: string;
  url: string;
  logoUrl?: string;
  color?: string;
}

export interface SystemConfig {
  brandName: string;
  domain: string;
  facebookUrl: string;
  messengerUrl: string;
  zaloUrl: string;
  telegramUrl: string;
  facebookLogoUrl?: string;
  messengerLogoUrl?: string;
  zaloLogoUrl?: string;
  telegramLogoUrl?: string;
  socialChannels?: ContactChannel[];
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
  originalAmount?: number;
  couponCode?: string;
  discountAmount?: number;
  durationDays?: number;
  paymentCode: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  deliveredKey?: string;
  customerEmail?: string;
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

export interface KeyPricePreset {
  id: string;
  name: string;
  durationDays: number;
  price: number;
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
}export type FeedbackCategory = 'BUG_REPORT' | 'FEATURE_REQUEST' | 'GENERAL_FEEDBACK' | 'COMPLAINT';
export type FeedbackStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

export interface FeedbackItem {
  id: number;
  deviceId: string;
  category: FeedbackCategory;
  title: string;
  content: string;
  rating?: number;
  contactInfo?: string;
  attachmentUrls?: string;
  status: FeedbackStatus;
  adminReply?: string;
  isApprovedForHome?: boolean;
  repliedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FeedbackCreatePayload {
  category: FeedbackCategory;
  title: string;
  content: string;
  rating?: number;
  contactInfo?: string;
  attachmentUrls?: string[];
}
