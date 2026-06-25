import {createAuthClient} from 'better-auth/react';
import {inferAdditionalFields} from 'better-auth/client/plugins';
import {getAuthUrl} from './runtimeConfig';

/**
 * Better-Auth client singleton. The book is a static site served from a different
 * site (github.io) than the auth server (hf.space), so the session cookie would be
 * third-party and blocked by modern browsers. We use BEARER TOKENS instead:
 *  - after sign-in/up the server returns a `set-auth-token` header,
 *  - we store it in localStorage,
 *  - and send it as `Authorization: Bearer` on every request.
 * This works cross-site without cookies. (`credentials: 'include'` is kept as a
 * harmless same-site fallback.)
 */
const TOKEN_KEY = 'pai_bearer_token';

export function getStoredToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(TOKEN_KEY) || '';
}

export function clearStoredToken(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(TOKEN_KEY);
}

/**
 * Force `credentials: 'omit'` for every Better-Auth request by patching the global
 * fetch (Better-Auth uses the global fetch and ignores fetchOptions.credentials).
 * Cross-site requests with credentials require the CORS Allow-Credentials handshake
 * and get blocked; we use bearer tokens, so cookies/credentials aren't needed.
 * Scoped to /api/auth/ URLs so it never affects ChatKit or the backend.
 */
function patchAuthFetch() {
  if (typeof window === 'undefined') return;
  const w = window as unknown as {__paiAuthFetchPatched?: boolean};
  if (w.__paiAuthFetchPatched) return;
  const orig = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    let url = '';
    try {
      url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    } catch {
      /* ignore */
    }
    if (url.includes('/api/auth/')) {
      return orig(input, {...(init ?? {}), credentials: 'omit'});
    }
    return orig(input, init);
  };
  w.__paiAuthFetchPatched = true;
}

let _client: ReturnType<typeof createAuthClient> | null = null;
let _clientUrl = '';

export function getAuthClient() {
  const url = getAuthUrl();
  // Recreate if the configured auth URL changed (e.g. it was the localhost default
  // when first read, then updated from the deployed config).
  if (_client && _clientUrl === url) return _client;
  patchAuthFetch();
  _clientUrl = url;
  _client = createAuthClient({
    baseURL: url,
    fetchOptions: {
      auth: {
        type: 'Bearer',
        token: () => getStoredToken(),
      },
      onSuccess: (ctx) => {
        const authToken = ctx.response.headers.get('set-auth-token');
        if (authToken && typeof window !== 'undefined') {
          window.localStorage.setItem(TOKEN_KEY, authToken);
        }
      },
    },
    plugins: [
      inferAdditionalFields({
        user: {
          softwareBackground: {type: 'string', required: false},
          hardwareBackground: {type: 'string', required: false},
          experienceLevel: {type: 'string', required: false},
        },
      }),
    ],
  });
  return _client;
}

export type UserProfile = {
  softwareBackground?: string;
  hardwareBackground?: string;
  experienceLevel?: string;
};

export type SessionUser = {
  id: string;
  name?: string;
  email?: string;
} & UserProfile;

/** Extract the personalization profile from a session user object. */
export function profileFromUser(user: SessionUser | null | undefined): UserProfile {
  if (!user) return {};
  return {
    softwareBackground: user.softwareBackground,
    hardwareBackground: user.hardwareBackground,
    experienceLevel: user.experienceLevel,
  };
}
