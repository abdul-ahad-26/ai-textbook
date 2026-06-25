import React, {useEffect} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {AuthProvider} from '@site/src/components/Auth/AuthContext';
import ChatWidget from '@site/src/components/ChatWidget';
import {startSelectionTracking} from '@site/src/lib/selection';
import {setAuthUrl} from '@site/src/lib/runtimeConfig';

/**
 * Docusaurus theme Root wraps the entire app (including the navbar). We use it to:
 *  - provide the auth session context everywhere,
 *  - track text selection for the selected-text chat feature,
 *  - mount the floating ChatKit assistant once, site-wide.
 */
export default function Root({children}: {children: React.ReactNode}) {
  const {siteConfig} = useDocusaurusContext();

  useEffect(() => {
    const cf = (siteConfig.customFields ?? {}) as {authUrl?: string};
    setAuthUrl(cf.authUrl || 'http://localhost:3001');
    const stop = startSelectionTracking();
    return stop;
  }, [siteConfig]);

  return (
    <AuthProvider>
      {children}
      <ChatWidget />
    </AuthProvider>
  );
}
