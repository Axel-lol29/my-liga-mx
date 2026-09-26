import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';
import { AppLogo } from '../../components/AppLogo';
import { AppText, PrimaryButton, Screen, StateView, TeamLogo, styles } from '../../components/ui';
import { LOCAL_LIGA_MX_TEAMS } from '../../src/constants/ligaMxTeams';
import { useAuth } from '../../src/context/AuthProvider';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Team } from '../../src/types';

export default function SelectTeamScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const { session, updateFavoriteTeam } = useAuth();
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (): Promise<void> => {
    if (!session || !selected) return;
    setSaving(true);
    try {
      await updateFavoriteTeam(selected);
      router.replace('/');
    } catch (err) {
      Alert.alert('No pudimos guardar tu selección', err instanceof Error ? err.message : 'Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  if (!session) {
    router.replace('/(auth)/login');
    return <View />;
  }

  return (
    <Screen scroll={false} maxContentWidth={720}>
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <AppLogo variant="small" showWordmark={false} />
        <View style={{ height: 12 }} />
        <AppText size={30} weight="bold">Elige tu equipo</AppText>
        <AppText color={colors.muted} style={{ textAlign: 'center', marginTop: 4 }}>Lo usaremos para personalizar tu inicio.</AppText>
      </View>
      <View style={{ flex: 1 }}>
        {LOCAL_LIGA_MX_TEAMS.length === 0 ? (
          <StateView kind="empty" message="No pudimos cargar los equipos." />
        ) : (
          <FlatList
            data={LOCAL_LIGA_MX_TEAMS}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
            renderItem={({ item }) => <TeamRow team={item} selected={selected === item.id} onPress={() => setSelected(item.id)} />}
          />
        )}
      </View>
      <PrimaryButton title="Guardar equipo" onPress={() => void save()} loading={saving} disabled={!selected} />
    </Screen>
  );
}

function TeamRow({ team, selected, onPress }: { team: Team; selected: boolean; onPress: () => void }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.card, { minHeight: 64, backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border, borderWidth: selected ? 2 : 1, flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
      <TeamLogo team={team} size={42} />
      <View style={{ flex: 1 }}>
        <AppText weight="bold">{team.name}</AppText>
        <AppText size={12} color={colors.muted}>{team.city ?? 'Liga MX'}</AppText>
      </View>
      <AppText size={22} color={selected ? colors.primary : colors.muted}>{selected ? '✓' : '○'}</AppText>
    </Pressable>
  );
}
