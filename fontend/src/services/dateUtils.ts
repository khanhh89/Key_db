// Helper to format ISO Date string to standard Vietnam Local Time (HH:mm:ss dd/MM/yyyy)
export function formatDateTime(dateStr?: string | number | any): string {
  if (!dateStr) return '-';
  try {
    if (Array.isArray(dateStr)) {
      const [y, m, d, hh, mm, ss] = dateStr;
      const pad = (n: number) => (n < 10 ? '0' + n : n);
      return `${pad(hh || 0)}:${pad(mm || 0)}:${pad(ss || 0)} ${pad(d)}/${pad(m)}/${y}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour12: false
    });
  } catch (e) {
    return String(dateStr);
  }
}
