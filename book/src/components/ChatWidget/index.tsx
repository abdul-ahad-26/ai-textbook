import React, {useState} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useSelectedText} from '@site/src/lib/selection';
import styles from './styles.module.css';

function RobotIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="7" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="13" r="1.6" fill="currentColor" />
      <circle cx="15" cy="13" r="1.6" fill="currentColor" />
      <path d="M12 4v3M9 19v2M15 19v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Widget() {
  const [open, setOpen] = useState(false);
  const selection = useSelectedText();
  const hasSelection = selection.length > 0;

  return (
    <>
      <button
        className={styles.launcher}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        aria-expanded={open}>
        <RobotIcon />
        {hasSelection && !open && <span className={styles.selDot} title="Will use your selected text" />}
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Textbook assistant">
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>
              <span className={styles.pulse} /> Physical AI Tutor
            </span>
            <button className={styles.panelClose} onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>
          {hasSelection && (
            <div className={styles.selBanner}>
              <strong>Scoped to your selection</strong>
              <span>{selection.length > 90 ? selection.slice(0, 90) + '…' : selection}</span>
            </div>
          )}
          <div className={styles.panelBody}>
            <BrowserOnly>
              {() => {
                const ChatKitPanel = require('./ChatKitPanel').default;
                return <ChatKitPanel />;
              }}
            </BrowserOnly>
          </div>
        </div>
      )}
    </>
  );
}

/** Global floating assistant. Mounted once from theme/Root. */
export default function ChatWidget() {
  return <BrowserOnly>{() => <Widget />}</BrowserOnly>;
}
