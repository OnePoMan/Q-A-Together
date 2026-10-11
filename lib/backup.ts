// Backup & restore of on-device data as a JSON file the user keeps.

import { DATA_KEYS, isPlainObject, merge } from './transfer';

const APP_ID = 'qa-together';
const MAX_BYTES = 5_000_000;
// Regenerable cache, not worth carrying around. qa-adult-ok is not in DATA_KEYS.
const SKIP_KEYS: readonly string[] = ['qa-cache-v2'];
const BACKUP_KEYS = DATA_KEYS.filter(key => !SKIP_KEYS.includes(key));

export interface BackupPayload {
  app: typeof APP_ID;
  v: 1;
  exportedAt: string;
  data: Record<string, string>;
}

export function createBackup(): BackupPayload {
  const data: Record<string, string> = {};
  for (const key of BACKUP_KEYS) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) data[key] = value;
    } catch {
      // storage unavailable
    }
  }
  return { app: APP_ID, v: 1, exportedAt: new Date().toISOString(), data };
}

export function backupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `qa-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

export function parseBackup(text: string): BackupPayload {
  if (text.length > MAX_BYTES) throw new Error('That file is too large to be a backup.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!isPlainObject(parsed) || parsed.app !== APP_ID || parsed.v !== 1) {
    throw new Error('That file is not a backup from this app.');
  }
  if (!isPlainObject(parsed.data)) throw new Error('That backup has no data in it.');
  return {
    app: APP_ID,
    v: 1,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '',
    data: parsed.data as Record<string, string>,
  };
}

export function restoreBackup(payload: BackupPayload, mode: 'merge' | 'replace'): number {
  let restored = 0;
  for (const key of BACKUP_KEYS) {
    const raw = payload.data[key];
    if (typeof raw !== 'string') continue;
    try {
      const incoming = JSON.parse(raw);
      const current = mode === 'merge' ? localStorage.getItem(key) : null;
      const value = current === null ? incoming : merge(JSON.parse(current), incoming);
      localStorage.setItem(key, JSON.stringify(value));
      restored++;
    } catch {
      // skip malformed entry
    }
  }
  return restored;
}

export function downloadBackup(): void {
  const blob = new Blob([JSON.stringify(createBackup(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = backupFileName();
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
