// Simple in-memory cache for AI verification.
// NOTE: This will not work across multiple serverless instances (e.g. Vercel).
// For multi-instance deployment, replace this with a Redis store.

interface CacheEntry {
  ai_suggested_patterns: any[];
  ai_time_complexity: string | null;
  ai_space_complexity: string | null;
  ai_reasoning: string | null;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export function setAiCache(hash: string, data: Omit<CacheEntry, 'timestamp'>) {
  cache.set(hash, { ...data, timestamp: Date.now() });
}

export function getAiCache(hash: string): Omit<CacheEntry, 'timestamp'> | null {
  const entry = cache.get(hash);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > TTL_MS) {
    cache.delete(hash);
    return null;
  }

  return entry;
}
