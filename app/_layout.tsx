import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { queryClient } from '../src/lib/queryClient';
import { AuthProvider } from '../src/context/AuthProvider';
import { useAuth } from '../src/context/AuthProvider';
import { getTeamByInternalId, toAppTeam } from '../src/constants/ligaMxTeams';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { MatchNotificationsCoordinator } from '../components/MatchNotificationsCoordinator';
function AppStack(): React.JSX.Element { const { mode, colors } = useTheme(); return <><StatusBar hidden={false} style={mode === 'dark' ? 'light' : 'dark'} /><Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.background }, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerTitleStyle: { color: colors.text } }} /></>; }
function ThemedApp(): React.JSX.Element { const { profile } = useAuth(); const favoriteEntry = getTeamByInternalId(profile?.favoriteTeamId); const favoriteTeam = favoriteEntry ? toAppTeam(favoriteEntry) : null; return <ThemeProvider favoriteTeam={favoriteTeam}><MatchNotificationsCoordinator /><AppStack /></ThemeProvider>; }
export default function RootLayout(): React.JSX.Element { return <QueryClientProvider client={queryClient}><AuthProvider><ThemedApp /></AuthProvider></QueryClientProvider>; }
