import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useTheme } from '../src/theme/ThemeProvider';

export function MatchReminderButton({ isEnabled, onPress, pending = false, disabled = false }: {
  isEnabled: boolean;
  onPress: () => void;
  pending?: boolean;
  disabled?: boolean;
  compact?: boolean;
}): React.JSX.Element {
  const { colors } = useTheme();
  const color = isEnabled ? colors.primary : colors.muted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isEnabled ? 'Desactivar recordatorio del partido' : 'Activar recordatorio del partido'}
      accessibilityState={{ selected: isEnabled, disabled: disabled || pending }}
      disabled={disabled || pending}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderWidth: 1,
        borderRadius: 22,
        borderColor: isEnabled ? `${colors.primary}70` : colors.border,
        backgroundColor: isEnabled ? `${colors.primary}20` : colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.72 : disabled ? 0.5 : 1,
      })}
    >
      {pending ? <ActivityIndicator size="small" color={color} /> : <BellGlyph color={color} />}
    </Pressable>
  );
}

function BellGlyph({ color }: { color: string }): React.JSX.Element {
  return (
    <View pointerEvents="none" style={{ width: 18, height: 19, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View style={{ width: 13, height: 14, borderWidth: 1.8, borderColor: color, borderBottomWidth: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />
      <View style={{ width: 17, height: 2, borderRadius: 2, backgroundColor: color }} />
      <View style={{ width: 4, height: 3, marginTop: 1, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}
