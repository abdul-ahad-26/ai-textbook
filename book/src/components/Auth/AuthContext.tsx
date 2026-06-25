import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {getAuthClient, profileFromUser, type SessionUser, type UserProfile} from '@site/src/lib/authClient';

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
