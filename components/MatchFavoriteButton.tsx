import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { AppText } from './ui';
import { useTheme } from '../src/theme/ThemeProvider';

export function MatchFavoriteButton({ isFavorite, onPress, pending = false, compact = false, disabled = false }: {
  isFavorite: boolean;
  onPress: () => void;
  pending?: boolean;
  compact?: boolean;
  disabled?: boolean;
}): React.JSX.Element {
  const { colors } = useTheme();
  const label = isFavorite ? 'Quitar de Mis partidos' : 'Guardar partido';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFavorite, disabled: disabled || pending }}
      disabled={disabled || pending}
      hitSlop={compact ? 4 : 2}
      onPress={onPress}
      style={({ pressed }) => [compact ? styles.compact : styles.full, { borderColor: isFavorite ? colors.warning : colors.border, backgroundColor: isFavorite ? `${colors.warning}18` : colors.surface, opacity: pressed ? 0.75 : disabled ? 0.5 : 1 }]}
    >
      {pending
        ? <ActivityIndicator size="small" color={colors.primaryLight} />
        : <>
          <AppText size={compact ? 21 : 18} color={isFavorite ? colors.warning : colors.muted} weight="bold">{isFavorite ? '★' : '☆'}</AppText>
          {!compact ? <AppText size={13} color={isFavorite ? colors.warning : colors.text} weight="bold">{isFavorite ? 'Guardado' : 'Guardar partido'}</AppText> : null}
        </>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  compact: { width: 38, height: 38, borderWidth: 1, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  full: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
});
