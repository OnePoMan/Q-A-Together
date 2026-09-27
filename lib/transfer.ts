// Moves on-device data from the old address to the new one. localStorage is
// per-address, so the old site packs it into a link's #fragment (never sent to
// any server) and the new site unpacks it after the user confirms.

const KEYS = [
  'qa-saved',
  'qa-favorites',
  'qa-journal',
  'qa-names',
  'qa-history',
  'qa-history-vibe',
  'qa-history-local',
  'qa-disliked',
  'qa-answered',
  'qa-theme',
  'qa-vibe',
  'qa-layout',
  'qa-cache-v2',
] as const;
// Deliberately not transferred: qa-adult-ok (the 18+ check is asked again).

const PREFIX = '#import=';
const MAX_ENCODED = 1_500_000;
export const IMPORTED_FLAG = 'qa-imported';

const toBase64Url = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromBase64Url = (encoded: string) => {
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
};

export function buildTransferLink(targetUrl: string): string {
  const data: Record<string, string> = {};
  for (const key of KEYS) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) data[key] = value;
    } catch {
      // storage unavailable
    }
  }
  return `${targetUrl}/${PREFIX}${toBase64Url(JSON.stringify({ v: 1, data }))}`;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function merge(existing: unknown, incoming: unknown): unknown {
  if (Array.isArray(existing) && Array.isArray(incoming)) {
    const seen = new Set(existing.map(item => JSON.stringify(item)));
    return [...existing, ...incoming.filter(item => !seen.has(JSON.stringify(item)))];
  }
  if (isPlainObject(existing) && isPlainObject(incoming)) return { ...incoming, ...existing };
  return existing;
}

/**
 * Runs before the app renders. Returns true when data was imported.
 * Unknown keys are ignored and nothing happens without the user's confirmation.
 */
export function importFromLocation(): boolean {
  const { hash, pathname, search } = window.location;
  if (!hash.startsWith(PREFIX)) return false;
  window.history.replaceState(null, '', pathname + search);

  const encoded = hash.slice(PREFIX.length);
  if (encoded.length > MAX_ENCODED) return false;
  let payload: unknown;
  try {
    payload = JSON.parse(fromBase64Url(encoded));
  } catch {
    return false;
  }
  if (!isPlainObject(payload) || payload.v !== 1 || !isPlainObject(payload.data)) return false;
  if (!window.confirm('Bring over your saved questions, memories and settings from the old address?')) return false;

  for (const key of KEYS) {
    const raw = payload.data[key];
    if (typeof raw !== 'string') continue;
    try {
      const incoming = JSON.parse(raw);
      const current = localStorage.getItem(key);
      const value = current === null ? incoming : merge(JSON.parse(current), incoming);
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // skip malformed entry
    }
  }
  try {
    sessionStorage.setItem(IMPORTED_FLAG, '1');
  } catch {
    // ignore
  }
  return true;
}
