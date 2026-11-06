/**
 * Utility functions & hooks for Flash Sale feature
 */

export const FLASH_SALE_DISCOUNT_PERCENT = 30; // 30% discount displayed

/**
 * Calculates the pseudo-original price before the 30% discount.
 * The configured price (realPrice) is the actual price customer pays.
 * Original price = realPrice / (1 - 0.3) = realPrice / 0.7, rounded to thousands.
 */
export function getFlashSaleOriginalPrice(realPrice: number): number {
  if (!realPrice || realPrice <= 0) return 0;
  const rawOriginal = realPrice / 0.7;
  // Round to nearest 1,000 VND
  return Math.round(rawOriginal / 1000) * 1000;
}

/**
 * Gets remaining seconds for the current day's Flash Sale (counts down to midnight).
 */
export function getFlashSaleSecondsRemaining(): number {
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const diff = Math.floor((endOfDay.getTime() - now.getTime()) / 1000);
  return Math.max(0, diff);
}

/**
 * Format seconds to 2-digit HH, MM, SS
 */
export function formatFlashSaleTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
    formatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  };
}

