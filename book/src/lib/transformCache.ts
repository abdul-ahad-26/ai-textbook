/**
 * Persistent cache for AI chapter transforms (Personalize / Translate).
 *
 * Backed by localStorage, so a result survives client-side navigation AND full
 * page reloads (and browser restarts). Once we've paid OpenAI to transform a
 * chapter, we never pay again for the same chapter + reader profile + content.
 *
 * The key embeds a hash of the source text, so when a chapter is edited (new
 * deploy) the old cached result is naturally invalidated and re-generated.
 *
 * A small LRU index caps total entries and evicts the oldest on quota pressure,
 * so the cache can never wedge localStorage.
 */
const PREFIX = 'pai_xf::';
const INDEX_KEY = 'pai_xf_index';
const MAX_ENTRIES = 80;

type Mode = 'personalize' | 'translate';

function ls(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null; // localStorage can throw in private mode / when disabled
  }
}

/** FNV-1a → base36. Cheap, dependency-free; enough to detect content changes. */
export function hashText(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function makeKey(
  mode: Mode,
  chapterId: string,
  profileSig: string,
  contentHash: string,
): string {
  // Translate is profile-independent, so its signature slot stays empty.
  const sig = mode === 'personalize' ? profileSig : '';
  return `${PREFIX}${mode}::${chapterId}::${sig}::${contentHash}`;
}

function readIndex(s: Storage): string[] {
  try {
    const v = JSON.parse(s.getItem(INDEX_KEY) || '[]');
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(s: Storage, idx: string[]): void {
  try {
    s.setItem(INDEX_KEY, JSON.stringify(idx));
  } catch {
    /* ignore */
  }
}

export function getCached(key: string): string | null {
  const s = ls();
  if (!s) return null;
  try {
    return s.getItem(key);
  } catch {
    return null;
  }
}

export function setCached(key: string, value: string): void {
  const s = ls();
  if (!s) return;

  // Most-recently-used goes to the end; enforce the cap up front.
  const idx = readIndex(s).filter((k) => k !== key);
  idx.push(key);
  while (idx.length > MAX_ENTRIES) {
    const old = idx.shift();
    if (old) s.removeItem(old);
  }

  // Write, evicting the oldest entries if we hit the quota.
  for (;;) {
    try {
      s.setItem(key, value);
      break;
    } catch {
      const old = idx.shift();
      if (!old || old === key) {
        writeIndex(s, idx);
        return; // value larger than everything else combined — give up quietly
      }
      s.removeItem(old);
    }
  }
  writeIndex(s, idx);
}
