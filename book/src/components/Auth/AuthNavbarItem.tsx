import React, {useState} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useAuth} from './AuthContext';
import AuthModal from './AuthModal';
import styles from './auth.module.css';

function Inner() {
  const {user, loading, signOut} = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) {
    return <span className={styles.navTrigger} aria-busy="true">…</span>;
  }

  if (user) {
    const initial = (user.name || user.email || '?').charAt(0).toUpperCase();
    return (
      <span className={styles.account}>
        <span className={styles.avatar} title={user.email}>{initial}</span>
        <button className={styles.signout} onClick={() => void signOut()}>Sign out</button>
      </span>
    );
  }

  return (
    <>
      <button className={styles.navTrigger} onClick={() => setOpen(true)}>
        Sign in
      </button>
      {open && <AuthModal onClose={() => setOpen(false)} />}
    </>
  );
}

/** Navbar item registered as `custom-authNavbarItem`. */
export default function AuthNavbarItem() {
  return <BrowserOnly>{() => <Inner />}</BrowserOnly>;
}
