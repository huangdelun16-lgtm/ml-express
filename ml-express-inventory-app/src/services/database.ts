import { generateUuid } from '../utils/uuid';

/** Supabase is the sole inventory datastore. */
export function newId(): string {
  return generateUuid();
}

export function nowIso(): string {
  return new Date().toISOString();
}
