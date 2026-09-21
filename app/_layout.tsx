import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { queryClient } from '../src/lib/queryClient';
import { AuthProvider } from '../src/context/AuthProvider';
import { useAuth } from '../src/context/AuthProvider';
import { useTeam } from '../src/hooks/useData';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
function AppStack(): React.JSX.Element { const { mode } = useTheme(); return <><StatusBar style={mode === 'dark' ? 'light' : 'dark'} /><Stack screenOptions={{ headerShown: false, animation: 'fade' }} /></>; }
function ThemedApp(): React.JSX.Element { const { profile } = useAuth(); const favoriteTeam = useTeam(profile?.favoriteTeamId ?? 0); return <ThemeProvider favoriteTeam={favoriteTeam.data}><AppStack /></ThemeProvider>; }
export default function RootLayout(): React.JSX.Element { return <QueryClientProvider client={queryClient}><AuthProvider><ThemedApp /></AuthProvider></QueryClientProvider>; }
