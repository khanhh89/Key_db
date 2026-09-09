import type { LicenseKeyItem } from '../types';

/**
 * Checks if a License Key belongs to a specific app.
 * This takes into account both the primary appId and the groupAppIds (for multi-app group keys).
 */
export function isKeyBelongToApp(key: LicenseKeyItem, targetAppId: string): boolean {
  if (!key) return false;
  
  // Exact match
  if (key.appId === targetAppId) return true;

  // Group match
  if (key.groupAppIds && key.groupAppIds.trim() !== '') {
    const groupIds = key.groupAppIds.split(',').map(id => id.trim()).filter(Boolean);
    if (groupIds.includes(targetAppId)) {
      return true;
    }
  }

  return false;
}
