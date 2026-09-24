import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Team, ThemePreference } from '../types';

const STORAGE_KEY = '@my-liga-mx/theme';

const APP_COLORS = {
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
} as const;

const TEAM_ACCENTS = {
  red: '#D8494F',
  blue: '#3C8FD9',
  gold: '#D5A634',
  green: '#2EAF78',
  purple: '#9367D8',
} as const;

export type AppColors = typeof APP_COLORS & {
  teamAccent: string;
  teamAccentSoft: string;
  teamAccentBorder: string;
};

export interface AppTheme {
  preference: ThemePreference;
  mode: 'dark';
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
  return APP_COLORS.primaryLight;
}

export function getTeamAccent(team?: Team | null): string {
  return accentFor(team);
}

const ThemeContext = createContext<AppTheme | undefined>(undefined);

export function ThemeProvider({ children, favoriteTeam }: { children: React.ReactNode; favoriteTeam?: Team | null }): React.JSX.Element {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === 'light' || value === 'dark' || value === 'system') setPreferenceState(value);
    });
  }, []);

  const setPreference = (value: ThemePreference): void => {
    setPreferenceState(value);
    void AsyncStorage.setItem(STORAGE_KEY, value);
  };

  const colors = useMemo<AppColors>(() => {
    const teamAccent = accentFor(favoriteTeam);
    return {
      ...APP_COLORS,
      teamAccent,
      teamAccentSoft: `${teamAccent}14`,
      teamAccentBorder: `${teamAccent}66`,
    };
  }, [favoriteTeam]);

  const value = useMemo<AppTheme>(() => ({ preference, mode: 'dark', colors, setPreference }), [colors, preference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): AppTheme {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme debe utilizarse dentro de ThemeProvider');
  return value;
}
