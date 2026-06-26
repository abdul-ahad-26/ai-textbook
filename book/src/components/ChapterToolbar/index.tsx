import React, {useCallback, useEffect, useRef, useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {useLocation} from '@docusaurus/router';
import {useRuntimeConfig} from '@site/src/lib/runtimeConfig';
import {useAuth} from '@site/src/components/Auth/AuthContext';
import {getStoredToken, type UserProfile} from '@site/src/lib/authClient';
import AuthModal from '@site/src/components/Auth/AuthModal';
import styles from './styles.module.css';

type Mode = 'personalize' | 'translate';

/**
 * Session-lifetime cache of transform results, shared across the toolbar's
 * per-chapter remounts (the component is keyed by pathname, see DocItem/Content).
 *
 * The key is `mode :: chapterId :: profileSignature`, so a cached result can never
 * leak to a different chapter or a different reader profile. Translate is
 * profile-independent, so its signature slot is empty. This lives only in memory —
 * a full page reload starts fresh, which is the right scope for paid, per-chapter
 * AI output (no quota or staleness concerns from persisting big markdown blobs).
 */
const resultCache = new Map<string, string>();

function cacheKey(mode: Mode, chapterId: string, profileSig: string): string {
  return `${mode}::${chapterId}::${mode === 'personalize' ? profileSig : ''}`;
}

/** Order-stable signature of the personalization profile (JSON.stringify isn't). */
function profileSignature(p: UserProfile): string {
  return [p.experienceLevel, p.softwareBackground, p.hardwareBackground]
    .map((v) => v ?? '')
    .join('|');
}

function readChapterMarkdown(): string {
  if (typeof document === 'undefined') return '';
  const el = document.querySelector('.theme-doc-markdown') as HTMLElement | null;
  // innerText preserves visible structure well enough for the model to re-author.
  return el ? el.innerText : '';
}

function setOriginalHidden(hidden: boolean) {
  const el = document.querySelector('.theme-doc-markdown') as HTMLElement | null;
  if (el) el.style.display = hidden ? 'none' : '';
}

export default function ChapterToolbar() {
  const {backendUrl} = useRuntimeConfig();
  const {user, profile} = useAuth();
  const location = useLocation();
  const chapterId = location.pathname;

  const [mode, setMode] = useState<Mode | null>(null);
  const [loading, setLoading] = useState<Mode | null>(null);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  // The chapter's untransformed text, captured while it is still on screen — a
  // hidden element's innerText reads as empty, so we must grab it before hiding.
  const originalRef = useRef<string>('');
  const loadingRef = useRef<Mode | null>(null);

  // On unmount (e.g. navigating to another chapter) always restore the original's
  // visibility, in case Docusaurus reuses the .theme-doc-markdown element and our
  // display:none would otherwise carry over to the next chapter.
  useEffect(() => () => setOriginalHidden(false), []);

  const captureOriginal = useCallback(() => {
    if (!originalRef.current) originalRef.current = readChapterMarkdown();
    return originalRef.current;
  }, []);

  const close = useCallback(() => {
    setOriginalHidden(false);
    setMode(null);
    setResult('');
    setError(null);
  }, []);

  const show = useCallback((which: Mode, markdown: string) => {
    setResult(markdown);
    setMode(which);
    setOriginalHidden(true);
  }, []);

  const run = useCallback(
    async (which: Mode) => {
      // Guard against rapid double-clicks / re-entry while a request is in flight.
      if (loadingRef.current) return;
      setError(null);
      // Both AI tools are logged-in only (personalize uses your profile; the brief
      // scopes Urdu translation to signed-in readers too).
      if (!user) {
        setShowAuth(true);
        return;
      }

      // Grab the source text now, while the original is visible.
      const content = captureOriginal();
      const key = cacheKey(which, chapterId, profileSignature(profile));

      // Serve from the session cache on a repeat press — no second (paid) API call.
      const cached = resultCache.get(key);
      if (cached !== undefined) {
        show(which, cached);
        return;
      }

      loadingRef.current = which;
      setLoading(which);
      try {
        const token = getStoredToken();
        const res = await fetch(`${backendUrl}/${which}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? {Authorization: `Bearer ${token}`} : {}),
          },
          body: JSON.stringify({content, chapter_id: chapterId}),
        });
        if (res.status === 401) throw new Error('Please sign in again to use this tool');
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        const markdown = data.markdown || '';
        resultCache.set(key, markdown);
        show(which, markdown);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Request failed');
      } finally {
        loadingRef.current = null;
        setLoading(null);
      }
    },
    [backendUrl, user, profile, chapterId, captureOriginal, show],
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <span className={styles.tag}>AI&nbsp;TOOLS</span>
        <button
          className={`${styles.btn} ${styles.personalize} ${mode === 'personalize' ? styles.active : ''}`}
          onClick={() => (mode === 'personalize' ? close() : run('personalize'))}
          disabled={loading !== null}>
          {loading === 'personalize' ? 'Personalizing…' : mode === 'personalize' ? '✕ Show original' : '✦ Personalize'}
        </button>
        <button
          className={`${styles.btn} ${styles.translate} ${mode === 'translate' ? styles.active : ''}`}
          onClick={() => (mode === 'translate' ? close() : run('translate'))}
          disabled={loading !== null}>
          {loading === 'translate' ? 'ترجمہ ہو رہا ہے…' : mode === 'translate' ? '✕ Show original' : 'اردو میں ترجمہ کریں'}
        </button>
        {!user && (
          <span className={styles.hint}>Sign in to use AI tools</span>
        )}
      </div>

      {error && <p className={styles.error}>⚠ {error} — is the backend running at {backendUrl}?</p>}

      {mode && (
        <div className={styles.result} dir={mode === 'translate' ? 'rtl' : 'ltr'}>
          <div className={styles.resultLabel}>
            {mode === 'personalize' ? '✦ Personalized for your background' : '🌐 اردو ترجمہ'}
          </div>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
