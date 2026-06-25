import {useEffect, useState} from 'react';

/**
 * Tracks the reader's current text selection across the page so the chat widget
 * can scope answers to highlighted text (a hackathon requirement). Kept in a
 * module-level variable so the ChatKit fetch override can read it synchronously
 * at request time, plus a React hook for UI affordances.
 */
let current = '';
const listeners = new Set<(s: string) => void>();

function update(text: string) {
  const trimmed = (text || '').trim();
  if (trimmed === current) return;
  current = trimmed;
  listeners.forEach((l) => l(current));
}

export function getSelectedText(): string {
  return current;
}

export function clearSelectedText(): void {
  update('');
}

/** Call once (from Root) to begin tracking selection on the document. */
export function startSelectionTracking(): () => void {
  if (typeof document === 'undefined') return () => {};
  const handler = () => {
    const sel = document.getSelection();
    update(sel ? sel.toString() : '');
  };
  document.addEventListener('selectionchange', handler);
  return () => document.removeEventListener('selectionchange', handler);
}

/** React hook returning the live selection text. */
export function useSelectedText(): string {
  const [text, setText] = useState(current);
  useEffect(() => {
    listeners.add(setText);
    setText(current);
    return () => {
      listeners.delete(setText);
    };
  }, []);
  return text;
}
