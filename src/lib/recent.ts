const KEY = 'ieg.recent';
export const getRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
export const pushRecent = (path: string) => {
  try { localStorage.setItem(KEY, JSON.stringify([path, ...getRecent().filter((p) => p !== path)].slice(0, 6))); } catch { /* ignore */ }
};
export const clearRecent = () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } };
