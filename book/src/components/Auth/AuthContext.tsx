import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {getAuthClient, clearStoredToken, profileFromUser, type SessionUser, type UserProfile} from '@site/src/lib/authClient';
import {useRuntimeConfig, setAuthUrl} from '@site/src/lib/runtimeConfig';

type AuthState = {
  user: SessionUser | null;
  loading: boolean;
  profile: UserProfile;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState>({
  user: null,
  loading: true,
  profile: {},
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({children}: {children: React.ReactNode}) {
  // Sync the auth URL from the build-time config BEFORE any effect creates the
  // client. Child-component effects run before parent (Root) effects, so relying on
  // Root's effect to set the URL left the client pointing at the localhost default.
  const {authUrl} = useRuntimeConfig();
  setAuthUrl(authUrl);

  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const client = getAuthClient();
      const {data} = await client.getSession();
      setUser((data?.user as SessionUser) ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await getAuthClient().signOut();
    } finally {
      clearStoredToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthState>(
    () => ({user, loading, profile: profileFromUser(user), refresh, signOut}),
    [user, loading, refresh, signOut],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthCtx);
}
