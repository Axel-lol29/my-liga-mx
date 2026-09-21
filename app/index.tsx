import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../src/context/AuthProvider';
import { useTheme } from '../src/theme/ThemeProvider';
export default function Index(): React.JSX.Element { const { session, profile, loading } = useAuth(); const { colors } = useTheme(); if (loading) return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} size="large" /></View>; if (!session) return <Redirect href="/(auth)/login" />; if (!profile?.favoriteTeamId) return <Redirect href="/(auth)/select-team" />; return <Redirect href="/(tabs)/home" />; }
