import * as fs from 'fs';
import * as path from 'path';
import { Request as ExpressRequest } from 'express';

export const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

export const filenameSafe = (original: string) => {
  const base = path
    .basename(original)
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '');
  return `${Date.now()}-${base}`;
};

export const buildDestination = (
  moduleShortcode: string,
  referenceId: string,
  subdir?: string,
) => {
  const dest = path.join(
    process.cwd(),
    'uploads',
    moduleShortcode,
    referenceId,
    subdir || 'misc',
  );
  ensureDir(dest);
  return dest;
};

export const subdirFromScreenKey = (screenKey?: string | null) => {
  if (!screenKey) return 'misc';
  if (screenKey === 'logo') return 'logo';
  if (screenKey === 'document') return 'documents';
  return String(screenKey); // fallback: usa el mismo nombre
};

export const buildPublicUrl = (
  req: ExpressRequest,
  f: {
    moduleShortcode?: string | null;
    referenceId?: string | null;
    screenKey?: string | null;
    fileName?: string | null;
  },
) => {
  const origin =
    process.env.PUBLIC_BACK_URL ?? `${req.protocol}://${req.get('host')}`;
  const subdir = subdirFromScreenKey(f.screenKey);
  return `${origin}/uploads/${f.moduleShortcode}/${f.referenceId}/${subdir}/${f.fileName}`;
};
