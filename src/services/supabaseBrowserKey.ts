export function isBrowserKey(value?: string): value is string {
  if (!value) return false;
  if (value.startsWith('sb_publishable_')) return true;
  try {
    const payload = value.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon';
  } catch {
    return false;
  }
}
