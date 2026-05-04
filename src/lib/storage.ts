export const Storage = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); }
    catch { return null; }
  },
  getJson<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      try { localStorage.removeItem(key); } catch {}
      return fallback;
    }
  },
  set(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch {}
  },
  remove(key: string): void {
    try { localStorage.removeItem(key); } catch {}
  },
};
