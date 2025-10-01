export const PUBLIC_BASE_URL = (
  process.env.PUBLIC_BASE_URL ?? 'http://localhost:3500'
).replace(/\/$/, '');

export const buildUrl = (path: string) =>
  `${PUBLIC_BASE_URL}/${path.replace(/^\//, '')}`;
