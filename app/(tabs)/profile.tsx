import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppLogo } from '../../components/AppLogo';
import { AppText, Card, PrimaryButton, Screen, StateView, TeamLogo } from '../../components/ui';
import { useAuth } from '../../src/context/AuthProvider';
import { useTeam } from '../../src/hooks/useData';
import { signOut } from '../../src/services/auth/authService';
import { getPreferences, updatePreferences } from '../../src/services/profile/profileService';
import { useTheme } from '../../src/theme/ThemeProvider';
import { ThemePreference, UserPreferences } from '../../src/types';

export default function ProfileScreen(): React.JSX.Element {
  const { colors, preference, setPreference } = useTheme();
  const { session, profile } = useAuth();
  const teamQuery = useTeam(profile?.favoriteTeamId ?? 0);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (session) void getPreferences(session.user.id).then(setPrefs).catch(() => undefined);
  }, [session]);

  const setTheme = async (value: ThemePreference): Promise<void> => {
    setPreference(value);
    if (session) await updatePreferences(session.user.id, { theme: value }).catch(() => undefined);
  };

  const logout = async (): Promise<void> => {
    setLoggingOut(true);
    try {
      await signOut();
      router.replace('/');
    } catch (error) {
      Alert.alert('No pudimos cerrar sesión', error instanceof Error ? error.message : 'Intenta nuevamente.');
    } finally {
      setLoggingOut(false);
    }
  };

  if (!session) return <StateView kind="error" message="Tu sesión no está disponible." />;

  const displayName = profile?.name ?? 'Aficionado';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('es-MX'))
    .join('') || session.user.email?.[0]?.toLocaleUpperCase('es-MX') || 'MX';

  return (
    <Screen>
      <View style={profileStyles.header}>
        <View style={profileStyles.headerCopy}>
          <View style={profileStyles.brandRow}>
            <AppLogo variant="compact" showWordmark={false} />
            <AppText size={11} color={colors.primaryLight} weight="bold" style={profileStyles.eyebrow}>MY LIGA MX</AppText>
          </View>
          <AppText size={11} color={colors.mutedSubtle} weight="bold" style={profileStyles.sectionLabel}>PERFIL</AppText>
          <AppText size={30} weight="bold">Tu perfil</AppText>
          <AppText color={colors.muted} style={profileStyles.subtitle}>Tu espacio de aficionado.</AppText>
        </View>
      </View>

      <Card style={profileStyles.userCard}>
        <View style={profileStyles.userIdentity}>
          <View style={[profileStyles.avatar, { backgroundColor: colors.primary + '24', borderColor: colors.primary + '70' }]}>
            <AppText size={18} color={colors.primaryLight} weight="bold">{initials}</AppText>
          </View>
          <View style={profileStyles.userCopy}>
            <AppText size={19} weight="bold" style={profileStyles.userText}>{displayName}</AppText>
            <AppText size={14} color={colors.muted} style={profileStyles.userText}>{session.user.email}</AppText>
          </View>
        </View>

        {teamQuery.data ? (
          <View style={[profileStyles.teamRow, { borderTopColor: colors.borderSubtle }]}>
            <TeamLogo team={teamQuery.data} size={42} />
            <View style={profileStyles.teamCopy}>
              <AppText size={11} color={colors.mutedSubtle} weight="bold" style={profileStyles.smallLabel}>EQUIPO FAVORITO</AppText>
              <AppText size={16} weight="bold">{teamQuery.data.name}</AppText>
            </View>
          </View>
        ) : null}
      </Card>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/(auth)/select-team')}
        style={({ pressed }) => [profileStyles.changeTeam, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.82 : 1 }]}
      >
        <View style={profileStyles.changeTeamCopy}>
          <AppText size={15} weight="bold">Cambiar equipo favorito</AppText>
          <AppText size={13} color={colors.muted}>Tu equipo actual puede modificarse cuando quieras.</AppText>
        </View>
        <AppText size={26} color={colors.mutedSubtle} style={profileStyles.chevron}>›</AppText>
      </Pressable>

      <View style={profileStyles.sectionHeading}>
        <AppText size={12} color={colors.primaryLight} weight="bold" style={profileStyles.sectionLabel}>PREFERENCIAS</AppText>
      </View>

      <Card style={profileStyles.preferencesCard}>
        <AppText size={16} weight="bold">Tema de la aplicación</AppText>
        <View style={[profileStyles.segmentedControl, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
          {(['light', 'dark', 'system'] as ThemePreference[]).map((value) => {
            const selected = preference === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => void setTheme(value)}
                style={({ pressed }) => [
                  profileStyles.segment,
                  { backgroundColor: selected ? colors.primary : 'transparent', opacity: pressed ? 0.82 : 1 },
                ]}
              >
                <AppText size={13} color={selected ? '#FFFFFF' : colors.muted} weight={selected ? 'bold' : 'medium'}>
                  {value === 'light' ? 'Claro' : value === 'dark' ? 'Oscuro' : 'Sistema'}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <View style={[profileStyles.divider, { backgroundColor: colors.borderSubtle }]} />
        <Toggle
          label="Notificaciones"
          value={prefs?.notificationsEnabled ?? true}
          onPress={async () => {
            const value = !(prefs?.notificationsEnabled ?? true);
            setPrefs(prefs ? { ...prefs, notificationsEnabled: value } : prefs);
            if (session) await updatePreferences(session.user.id, { notificationsEnabled: value }).catch(() => undefined);
          }}
        />
        <View style={[profileStyles.divider, { backgroundColor: colors.borderSubtle }]} />
        <Toggle
          label="Inicio de partidos"
          value={prefs?.matchStartNotifications ?? true}
          onPress={async () => {
            const value = !(prefs?.matchStartNotifications ?? true);
            setPrefs(prefs ? { ...prefs, matchStartNotifications: value } : prefs);
            if (session) await updatePreferences(session.user.id, { matchStartNotifications: value }).catch(() => undefined);
          }}
        />
      </Card>

      <View style={profileStyles.logoutButton}>
        <PrimaryButton title="Cerrar sesión" onPress={() => void logout()} loading={loggingOut} secondary />
      </View>
    </Screen>
  );
}

function Toggle({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [profileStyles.preferenceRow, { opacity: pressed ? 0.72 : 1 }]}>
      <AppText size={15} weight="medium">{label}</AppText>
      <AppText size={13} color={value ? colors.primaryLight : colors.muted} weight="bold">
        {value ? 'Activadas' : 'Desactivadas'}
      </AppText>
    </Pressable>
  );
}

const profileStyles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  headerCopy: { flex: 1, gap: 5 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  eyebrow: { letterSpacing: 1.15 },
  subtitle: { marginTop: 2 },
  userCard: { padding: 20, borderRadius: 18 },
  userIdentity: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  avatar: { width: 54, height: 54, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  userCopy: { flex: 1, gap: 5, minWidth: 0 },
  userText: { flexShrink: 1 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 20, paddingTop: 16, borderTopWidth: 1 },
  teamCopy: { flex: 1, gap: 3 },
  smallLabel: { letterSpacing: 0.75 },
  changeTeam: { minHeight: 76, borderWidth: 1, borderRadius: 17, marginTop: 16, paddingHorizontal: 18, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  changeTeamCopy: { flex: 1, gap: 5 },
  chevron: { marginLeft: 4, lineHeight: 28 },
  sectionHeading: { marginTop: 30, marginBottom: 12 },
  sectionLabel: { letterSpacing: 1.1 },
  preferencesCard: { padding: 18, borderRadius: 18 },
  segmentedControl: { flexDirection: 'row', gap: 5, borderWidth: 1, borderRadius: 13, padding: 4, marginTop: 13 },
  segment: { flex: 1, minHeight: 42, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  divider: { height: 1, marginVertical: 5 },
  preferenceRow: { minHeight: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 11 },
  logoutButton: { marginTop: 30, marginBottom: 18 },
});
