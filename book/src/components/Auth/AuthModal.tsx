import React, {useState} from 'react';
import {createPortal} from 'react-dom';
import {getAuthClient} from '@site/src/lib/authClient';
import {useAuth} from './AuthContext';
import styles from './auth.module.css';

type Mode = 'signin' | 'signup';

const EXPERIENCE = ['Beginner', 'Intermediate', 'Advanced'];
const SOFTWARE = [
  'New to programming',
  'Web / app development',
  'Python & data/ML',
  'Systems / C++ / embedded',
  'AI agents & LLMs',
];
const HARDWARE = [
  'None yet',
  'Hobbyist (Arduino / Raspberry Pi)',
  'Some robotics (ROS, sensors)',
  'Professional robotics / mechatronics',
];

export default function AuthModal({onClose}: {onClose: () => void}) {
  const {refresh} = useAuth();
  const [mode, setMode] = useState<Mode>('signup');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // shared
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // signup-only
  const [name, setName] = useState('');
  const [experienceLevel, setExperienceLevel] = useState(EXPERIENCE[0]);
  const [softwareBackground, setSoftwareBackground] = useState(SOFTWARE[0]);
  const [hardwareBackground, setHardwareBackground] = useState(HARDWARE[0]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const client = getAuthClient();
      if (mode === 'signup') {
        const {error: err} = await client.signUp.email({
          email,
          password,
          name: name || email.split('@')[0],
          // Extra fields used to personalize content (Better-Auth additionalFields).
          softwareBackground,
          hardwareBackground,
          experienceLevel,
        } as never);
        if (err) throw new Error(err.message || 'Sign up failed');
      } else {
        const {error: err} = await client.signIn.email({email, password});
        if (err) throw new Error(err.message || 'Sign in failed');
      }
      await refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const modal = (
    <div className={styles.overlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose} aria-label="Close">×</button>

        <p className={styles.eyebrow}>
          {mode === 'signup' ? 'COMMISSION A NEW UNIT' : 'RESUME SESSION'}
        </p>
        <h2 className={styles.title}>
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h2>
        <p className={styles.subtitle}>
          {mode === 'signup'
            ? 'Tell us your background so every chapter can be tuned to you.'
            : 'Sign in to personalize and save your progress.'}
        </p>

        <form onSubmit={submit} className={styles.form}>
          {mode === 'signup' && (
            <label className={styles.field}>
              <span>Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
            </label>
          )}
          <label className={styles.field}>
            <span>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className={styles.field}>
            <span>Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </label>

          {mode === 'signup' && (
            <>
              <div className={styles.divider}>
                <span>YOUR BACKGROUND</span>
              </div>
              <label className={styles.field}>
                <span>Overall experience</span>
                <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
                  {EXPERIENCE.map((o) => <option key={o}>{o}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>Software background</span>
                <select value={softwareBackground} onChange={(e) => setSoftwareBackground(e.target.value)}>
                  {SOFTWARE.map((o) => <option key={o}>{o}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>Hardware / robotics background</span>
                <select value={hardwareBackground} onChange={(e) => setHardwareBackground(e.target.value)}>
                  {HARDWARE.map((o) => <option key={o}>{o}</option>)}
                </select>
              </label>
            </>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submit} disabled={busy}>
            {busy ? 'Working…' : mode === 'signup' ? 'Create account →' : 'Sign in →'}
          </button>
        </form>

        <p className={styles.switch}>
          {mode === 'signup' ? 'Already have an account?' : 'New here?'}{' '}
          <button onClick={() => {setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null);}}>
            {mode === 'signup' ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  );

  // Render into <body> so the fixed overlay escapes the navbar's stacking /
  // containing block (the navbar's backdrop-filter would otherwise trap it).
  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}
