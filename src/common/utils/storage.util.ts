import * as fs from 'fs';
import * as path from 'path';
import { Request as ExpressRequest } from 'express';

export const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

export const getExt = (filename: string) =>
  (path.extname(filename || '').replace('.', '') || '').toLowerCase();

export const uploadBaseDir = (type: 'logo' | 'document') =>
  path.join(process.cwd(), 'uploads', type === 'logo' ? 'images' : 'documents');

export const buildPublicUrl = (
  req: ExpressRequest,
  type: 'logo' | 'document',
  fileId: string,
  ext: string,
) => {
  const origin =
    process.env.PUBLIC_BACK_URL ?? `${req.protocol}://${req.get('host')}`;
  const sub = type === 'logo' ? 'images' : 'documents';
  return `${origin}/uploads/${sub}/${fileId}.${ext}`;
};
