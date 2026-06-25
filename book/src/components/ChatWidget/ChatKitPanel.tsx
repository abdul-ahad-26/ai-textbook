import React, {useRef} from 'react';
import {ChatKit, useChatKit} from '@openai/chatkit-react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useRuntimeConfig} from '@site/src/lib/runtimeConfig';
import {getSelectedText} from '@site/src/lib/selection';
import {useAuth} from '@site/src/components/Auth/AuthContext';

// The widget is mounted in theme/Root, which is ABOVE Docusaurus's ColorModeProvider,
// so we can't use useColorMode() here. Read the theme from the <html data-theme> attr.
function currentColorScheme(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

/**
 * The actual ChatKit surface. Self-hosted: points at our FastAPI /chatkit
 * endpoint with the dev/prod domain key. A custom fetch injects the reader's
 * current selection + background profile as headers on every request, which is
 * how the agent scopes answers to highlighted text and personalizes them.
 */
export default function ChatKitPanel() {
  const {backendUrl, chatkitDomainKey} = useRuntimeConfig();
  const {siteConfig} = useDocusaurusContext();
  const siteBaseUrl = siteConfig.baseUrl;
  const colorMode = currentColorScheme();
  const {user, profile} = useAuth();

  // Keep latest auth context in refs so the fetch override reads current values.
  const userRef = useRef(user);
  const profileRef = useRef(profile);
  userRef.current = user;
  profileRef.current = profile;

  const injectingFetch: typeof fetch = (input, init = {}) => {
    const headers = new Headers(init.headers || {});
    const selected = getSelectedText();
    if (selected) headers.set('X-Selected-Text', selected);
    if (userRef.current?.id) headers.set('X-User-Id', userRef.current.id);
    if (profileRef.current && Object.keys(profileRef.current).length) {
      headers.set('X-User-Profile', JSON.stringify(profileRef.current));
    }
    // Tell the backend where the book is served so citations become absolute,
    // clickable links (relative links can't work inside ChatKit's iframe).
    if (typeof window !== 'undefined') {
      const base = (siteBaseUrl || '/').replace(/\/$/, '');
      headers.set('X-Site-Base', window.location.origin + base);
    }
    return fetch(input, {...init, headers});
  };

  const {control} = useChatKit({
    api: {
      url: `${backendUrl}/chatkit`,
      domainKey: chatkitDomainKey,
      fetch: injectingFetch,
    },
    theme: {
      colorScheme: colorMode === 'dark' ? 'dark' : 'light',
      radius: 'soft', // ChatKit allows: 'pill' | 'round' | 'soft' | 'sharp'
      color: {accent: {primary: '#14b8a3', level: 1}},
    },
    startScreen: {
      greeting: 'Ask the textbook anything',
      prompts: [
        {label: 'What is embodied intelligence?', prompt: 'What is embodied intelligence?'},
        {label: 'Explain ROS 2 topics vs services', prompt: 'Explain ROS 2 topics vs services'},
        {label: 'How does VSLAM work?', prompt: 'How does VSLAM work?'},
      ],
    },
    composer: {
      placeholder: 'Ask about the book…',
    },
    onError: ({error}: {error: unknown}) => {
      // Surface ChatKit's own errors (e.g. domain verification) — otherwise the
      // widget can render blank with nothing in the console.
      // eslint-disable-next-line no-console
      console.error('[ChatKit] error event:', error);
    },
  });

  return <ChatKit control={control} style={{height: '100%', width: '100%'}} />;
}
