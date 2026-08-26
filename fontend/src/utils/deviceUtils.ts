const DEVICE_ID_KEY = 'APP_DEVICE_ID';

export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId || deviceId.trim() === '') {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      deviceId = crypto.randomUUID();
    } else {
      deviceId = 'dev-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    }
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function getDeviceHeaders(): Record<string, string> {
  const deviceId = getOrCreateDeviceId();
  return {
    'X-Device-Id': deviceId,
    'Content-Type': 'application/json'
  };
}
