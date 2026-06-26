import React, {useEffect} from 'react';
import {AuthProvider} from '@site/src/components/Auth/AuthContext';
import ChatWidget from '@site/src/components/ChatWidget';
import {startSelectionTracking} from '@site/src/lib/selection';

/**
 * Docusaurus theme Root wraps the entire app (including the navbar). We use it to:
 *  - provide the auth session context everywhere,
 *  - track text selection for the selected-text chat feature,
 *  - mount the floating ChatKit assistant once, site-wide.
 *
 * (The auth URL is set synchronously inside AuthProvider's render, so we no longer
 * touch it here — doing it in an effect raced the child client creation.)
 */
export default function Root({children}: {children: React.ReactNode}) {
  useEffect(() => {
    const stop = startSelectionTracking();
    return stop;
  }, []);

  return (
    <AuthProvider>
      {children}
      <ChatWidget />
    </AuthProvider>
  );
}
