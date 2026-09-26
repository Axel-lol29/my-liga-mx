import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import { AppLogo } from '../../components/AppLogo';
import { AppText, Card, PrimaryButton, Screen, StateView, TeamLogo } from '../../components/ui';
import { getTeamByInternalId, toAppTeam } from '../../src/constants/ligaMxTeams';
import { useAuth } from '../../src/context/AuthProvider';
import { signOut } from '../../src/services/auth/authService';
import { updatePreferences } from '../../src/services/profile/profileService';
import { useNotificationPreferences } from '../../src/hooks/useNotificationPreferences';
import { getMatchNotificationPermission, NotificationPermissionState, requestMatchNotificationPermission } from '../../src/services/notifications/notificationService';
import { useTheme } from '../../src/theme/ThemeProvider';
import { ThemePreference } from '../../src/types';

export default function ProfileScreen(): React.JSX.Element {
  const { colors, preference, setPreference } = useTheme();
  const { session, profile } = useAuth();
  const { preferences, updateNotificationPreferences, isUpdating: notificationPreferenceBusy } = useNotificationPreferences();
  const favoriteEntry = getTeamByInternalId(profile?.favoriteTeamId);
  const favoriteTeam = favoriteEntry ? toAppTeam(favoriteEntry) : null;
  const [loggingOut, setLoggingOut] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>('undetermined');
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void getMatchNotificationPermission().then((state) => {
      if (mounted) setPermissionState(state);
    }).finally(() => {
      if (mounted) setCheckingPermission(false);
    });
    return () => { mounted = false; };
  }, []);

  const setTheme = async (value: ThemePreference): Promise<void> => {
    setPreference(value);
    if (session) await updatePreferences(session.user.id, { theme: value }).catch(() => undefined);
  };

  const notificationsAvailable = permissionState === 'granted' || permissionState === 'unsupported';
  const notificationsEnabled = preferences?.notificationsEnabled === true && notificationsAvailable;
  const matchStartNotifications = preferences?.matchStartNotifications === true;

  const toggleNotifications = async (): Promise<void> => {
    setPermissionMessage(null);
    if (notificationsEnabled) {
      try {
        await updateNotificationPreferences({ notificationsEnabled: false });
      } catch {
        setPermissionMessage('No pudimos guardar este cambio. Intenta nuevamente.');
      }
      return;
    }

    setCheckingPermission(true);
    const state = await requestMatchNotificationPermission();
    setPermissionState(state);
    setCheckingPermission(false);
    if (state === 'granted' || state === 'unsupported') {
      try {
        await updateNotificationPreferences({ notificationsEnabled: true });
      } catch {
        setPermissionMessage('No pudimos guardar este cambio. Intenta nuevamente.');
      }
      return;
    }

    setPermissionMessage('Las notificaciones están desactivadas en el sistema. Puedes habilitarlas desde los ajustes del dispositivo.');
  };

  const toggleMatchStartNotifications = async (): Promise<void> => {
    setPermissionMessage(null);
    try {
      await updateNotificationPreferences({ matchStartNotifications: !matchStartNotifications });
    } catch {
      setPermissionMessage('No pudimos guardar este cambio. Intenta nuevamente.');
    }
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

        {favoriteTeam ? (
          <View style={[profileStyles.teamRow, { borderTopColor: colors.borderSubtle }]}>
            <TeamLogo team={favoriteTeam} size={42} />
            <View style={profileStyles.teamCopy}>
              <AppText size={11} color={colors.mutedSubtle} weight="bold" style={profileStyles.smallLabel}>EQUIPO FAVORITO</AppText>
              <AppText size={16} weight="bold">{favoriteTeam.name}</AppText>
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

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/favorites/matches')}
        style={({ pressed }) => [profileStyles.savedMatchesLink, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.82 : 1 }]}
      >
        <AppText size={20} color={colors.warning} weight="bold">☆</AppText>
        <View style={profileStyles.changeTeamCopy}>
          <AppText size={15} weight="bold">Mis partidos</AppText>
          <AppText size={13} color={colors.muted}>Consulta los partidos que guardaste.</AppText>
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
          value={notificationsEnabled}
          disabled={checkingPermission || notificationPreferenceBusy}
          onChange={() => void toggleNotifications()}
        />
        <View style={[profileStyles.divider, { backgroundColor: colors.borderSubtle }]} />
        <Toggle
          label="Inicio de partidos"
          value={matchStartNotifications}
          disabled={!notificationsEnabled || notificationPreferenceBusy}
          onChange={() => void toggleMatchStartNotifications()}
        />
        {permissionMessage ? <AppText size={12} color={colors.muted} style={profileStyles.permissionMessage}>{permissionMessage}</AppText> : null}
        {permissionState === 'unsupported' ? <AppText size={12} color={colors.muted} style={profileStyles.permissionMessage}>Los recordatorios locales están disponibles en Android y iOS.</AppText> : null}
        {permissionState === 'denied' && !permissionMessage ? <AppText size={12} color={colors.muted} style={profileStyles.permissionMessage}>Las notificaciones están desactivadas en el sistema.</AppText> : null}
      </Card>

      <View style={profileStyles.logoutButton}>
        <PrimaryButton title="Cerrar sesión" onPress={() => void logout()} loading={loggingOut} secondary />
      </View>
    </Screen>
  );
}

function Toggle({ label, value, disabled = false, onChange }: { label: string; value: boolean; disabled?: boolean; onChange: () => void }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[profileStyles.preferenceRow, { opacity: disabled ? 0.55 : 1 }]}>
      <AppText size={15} weight="medium">{label}</AppText>
      <Switch
        accessibilityLabel={label}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={value ? colors.primaryLight : colors.mutedSubtle}
      />
    </View>
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
  savedMatchesLink: { minHeight: 68, borderWidth: 1, borderRadius: 17, marginTop: 10, paddingHorizontal: 18, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  changeTeamCopy: { flex: 1, gap: 5 },
  chevron: { marginLeft: 4, lineHeight: 28 },
  sectionHeading: { marginTop: 30, marginBottom: 12 },
  sectionLabel: { letterSpacing: 1.1 },
  preferencesCard: { padding: 18, borderRadius: 18 },
  segmentedControl: { flexDirection: 'row', gap: 5, borderWidth: 1, borderRadius: 13, padding: 4, marginTop: 13 },
  segment: { flex: 1, minHeight: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  divider: { height: 1, marginVertical: 5 },
  preferenceRow: { minHeight: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 11 },
  permissionMessage: { marginTop: 6, lineHeight: 18 },
  logoutButton: { marginTop: 30, marginBottom: 18 },
});
