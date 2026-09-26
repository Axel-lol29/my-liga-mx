import { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getProfile, updateFavoriteTeam as persistFavoriteTeam } from '../services/profile/profileService';
import { UserProfile } from '../types';
interface AuthValue { session: Session | null; profile: UserProfile | null; loading: boolean; refreshProfile: () => Promise<void>; updateFavoriteTeam: (teamId: number) => Promise<void>; }
const AuthContext = createContext<AuthValue | undefined>(undefined);
export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!session) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    try {
      const metadata: unknown = session.user.user_metadata;
      const fallbackName = metadata !== null && typeof metadata === 'object' && 'name' in metadata && typeof metadata.name === 'string' ? metadata.name : 'Aficionado';
      setProfile(await getProfile(session.user.id, fallbackName));
    } finally {
      setProfileLoading(false);
    }
  }, [session]);

  const updateFavoriteTeam = useCallback(async (teamId: number): Promise<void> => {
    if (!session) throw new Error('Tu sesión no está disponible.');

    await persistFavoriteTeam(session.user.id, teamId);
    if (profile) {
      setProfile((current) => current ? { ...current, favoriteTeamId: teamId } : current);
    } else {
      await refreshProfile();
    }
  }, [profile, refreshProfile, session]);

  useEffect(() => {
    if (!supabase) {
      setSessionLoading(false);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      setProfileLoading(Boolean(data.session));
      setSession(data.session);
      setSessionLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setProfileLoading(Boolean(nextSession));
      setSession(nextSession);
      setSessionLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const loading = sessionLoading || profileLoading;
  const value = useMemo(() => ({ session, profile, loading, refreshProfile, updateFavoriteTeam }), [loading, profile, refreshProfile, session, updateFavoriteTeam]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthValue { const value = useContext(AuthContext); if (!value) throw new Error('useAuth debe utilizarse dentro de AuthProvider'); return value; }
