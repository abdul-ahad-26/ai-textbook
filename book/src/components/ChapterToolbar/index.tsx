import React, {useCallback, useRef, useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {useLocation} from '@docusaurus/router';
import {useRuntimeConfig} from '@site/src/lib/runtimeConfig';
import {useAuth} from '@site/src/components/Auth/AuthContext';
import {getStoredToken} from '@site/src/lib/authClient';
import AuthModal from '@site/src/components/Auth/AuthModal';
import styles from './styles.module.css';

type Mode = 'personalize' | 'translate';

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

  const [mode, setMode] = useState<Mode | null>(null);
  const [loading, setLoading] = useState<Mode | null>(null);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const originalRef = useRef<string>('');
  // Cache each transform's result so re-pressing a button reuses it instead of
  // making another (paid, slow) API call. Keyed by mode + the profile snapshot,
  // so a personalize result is invalidated if the user's profile changes.
  const cacheRef = useRef<Record<string, string>>({});
  const loadingRef = useRef<Mode | null>(null);

  const close = useCallback(() => {
    setOriginalHidden(false);
    setMode(null);
    setResult('');
    setError(null);
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

      const content = originalRef.current || readChapterMarkdown();
      originalRef.current = content;

      const cacheKey =
        which === 'personalize' ? `personalize:${JSON.stringify(profile)}` : 'translate';

      // Serve from cache on a repeat press — no second API call.
      const cached = cacheRef.current[cacheKey];
      if (cached) {
        setResult(cached);
        setMode(which);
        setOriginalHidden(true);
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
          body: JSON.stringify({content, chapter_id: location.pathname}),
        });
        if (res.status === 401) throw new Error('Please sign in again to use this tool');
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        const markdown = data.markdown || '';
        cacheRef.current[cacheKey] = markdown;
        setResult(markdown);
        setMode(which);
        setOriginalHidden(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Request failed');
      } finally {
        loadingRef.current = null;
        setLoading(null);
      }
    },
    [backendUrl, user, profile, location.pathname],
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
