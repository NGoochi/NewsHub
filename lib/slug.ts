import { customAlphabet } from 'nanoid';

export function makeSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  const shortId = customAlphabet('0123456789abcdef', 6)();
  return `${base}-${shortId}`;
}
