import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Team, ThemePreference } from '../types';

const STORAGE_KEY = '@my-liga-mx/theme';

interface ThemeColorTokens {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderSubtle: string;
  text: string;
  muted: string;
  mutedSubtle: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
}

const DARK_COLORS: ThemeColorTokens = {
  background: '#0B0F14',
  surface: '#171E29',
  surfaceElevated: '#121821',
  border: '#1F2937',
  borderSubtle: '#18212E',
  text: '#F8FAFC',
  muted: '#94A3B8',
  mutedSubtle: '#64748B',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',
  accent: '#60A5FA',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
};

const LIGHT_COLORS: ThemeColorTokens = {
  background: '#F8FAFC',
  surface: '#F1F5F9',
  surfaceElevated: '#FFFFFF',
  border: '#E2E8F0',
  borderSubtle: '#E2E8F0',
  text: '#0F172A',
  muted: '#475569',
  mutedSubtle: '#64748B',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',
  accent: '#60A5FA',
  success: '#15803D',
  warning: '#B45309',
  danger: '#DC2626',
};

const TEAM_ACCENTS = {
  red: '#D8494F',
  blue: '#3C8FD9',
  gold: '#D5A634',
  green: '#2EAF78',
  purple: '#9367D8',
} as const;

export type AppColors = ThemeColorTokens & {
  teamAccent: string;
  teamAccentSoft: string;
  teamAccentBorder: string;
};

export interface AppTheme {
  preference: ThemePreference;
  mode: 'light' | 'dark';
  colors: AppColors;
  setPreference: (value: ThemePreference) => void;
}

function accentFor(team?: Team | null): string {
  const name = team?.name.toLocaleLowerCase('es-MX') ?? '';
  if (['atlas', 'toluca', 'chivas', 'guadalajara', 'necaxa', 'tijuana', 'san luis'].some((namePart) => name.includes(namePart))) return TEAM_ACCENTS.red;
  if (['monterrey', 'rayados', 'cruz azul', 'queretaro', 'querétaro', 'pachuca', 'puebla'].some((namePart) => name.includes(namePart))) return TEAM_ACCENTS.blue;
  if (['tigres', 'américa', 'america'].some((namePart) => name.includes(namePart))) return TEAM_ACCENTS.gold;
  if (['mazatlán', 'mazatlan'].some((namePart) => name.includes(namePart))) return TEAM_ACCENTS.purple;
  if (['león', 'leon', 'santos', 'juárez', 'juarez'].some((namePart) => name.includes(namePart))) return TEAM_ACCENTS.green;
  return DARK_COLORS.primaryLight;
}

export function getTeamAccent(team?: Team | null): string {
  return accentFor(team);
}

const ThemeContext = createContext<AppTheme | undefined>(undefined);

export function ThemeProvider({ children, favoriteTeam }: { children: React.ReactNode; favoriteTeam?: Team | null }): React.JSX.Element {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const colorScheme = useColorScheme();
  const preferenceRevision = useRef(0);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (!active || preferenceRevision.current !== 0) return;
      if (value === 'light' || value === 'dark' || value === 'system') setPreferenceState(value);
    }).catch((error: unknown) => console.warn('No se pudo leer la preferencia de tema:', error));
    return () => { active = false; };
  }, []);

  const setPreference = useCallback((value: ThemePreference): void => {
    preferenceRevision.current += 1;
    setPreferenceState(value);
    void AsyncStorage.setItem(STORAGE_KEY, value).catch((error: unknown) => console.warn('No se pudo guardar la preferencia de tema:', error));
  }, []);

  const mode: AppTheme['mode'] = preference === 'system' ? (colorScheme === 'light' ? 'light' : 'dark') : preference;

  const colors = useMemo<AppColors>(() => {
    const teamAccent = accentFor(favoriteTeam);
    return {
      ...(mode === 'light' ? LIGHT_COLORS : DARK_COLORS),
      teamAccent,
      teamAccentSoft: `${teamAccent}14`,
      teamAccentBorder: `${teamAccent}66`,
    };
  }, [favoriteTeam, mode]);

  const value = useMemo<AppTheme>(() => ({ preference, mode, colors, setPreference }), [colors, mode, preference, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): AppTheme {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme debe utilizarse dentro de ThemeProvider');
  return value;
}
