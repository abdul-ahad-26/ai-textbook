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

let _client: ReturnType<typeof createAuthClient> | null = null;

export function getAuthClient() {
  if (_client) return _client;
  _client = createAuthClient({
    baseURL: getAuthUrl(),
    fetchOptions: {
      // No cookies — we authenticate purely with bearer tokens (set below), so we
      // deliberately omit `credentials: 'include'`. Sending credentials would force
      // the cross-site CORS "Allow-Credentials" handshake and can block requests.
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
