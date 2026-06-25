import {createAuthClient} from 'better-auth/react';
import {inferAdditionalFields} from 'better-auth/client/plugins';
import {getAuthUrl} from './runtimeConfig';

/**
 * Better-Auth client singleton. The book is a static site, so the client talks
 * to the standalone Better-Auth Node server (see /auth) over CORS with cookies.
 *
 * `inferAdditionalFields` mirrors the server's extra user fields so they are
 * accepted by signUp.email() and returned on the session user.
 */
let _client: ReturnType<typeof createAuthClient> | null = null;

export function getAuthClient() {
  if (_client) return _client;
  _client = createAuthClient({
    baseURL: getAuthUrl(),
    fetchOptions: {credentials: 'include'},
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
