import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../src/theme/ThemeProvider';

export function BookmarkGlyph({ color, cutoutColor, filled = false }: { color: string; cutoutColor: string; filled?: boolean }): React.JSX.Element {
  return <View accessible={false} pointerEvents="none" style={{ width: 18, height: 22 }}>
    <View style={{ position: 'absolute', top: 1, left: 2, width: 14, height: 19, borderTopWidth: 1.7, borderLeftWidth: 1.7, borderRightWidth: 1.7, borderColor: color, borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: filled ? color : 'transparent' }} />
    <View style={{ position: 'absolute', top: 15.7, left: 1.3, width: 9, height: 1.7, backgroundColor: color, transform: [{ rotate: '-40deg' }] }} />
    <View style={{ position: 'absolute', top: 15.7, left: 7.7, width: 9, height: 1.7, backgroundColor: color, transform: [{ rotate: '40deg' }] }} />
    <View style={{ position: 'absolute', top: 19, left: 7, width: 4, height: 4, backgroundColor: cutoutColor, transform: [{ rotate: '45deg' }] }} />
  </View>;
}

export function NewsSaveButton({ isSaved, pending = false, disabled = false, onPress }: { isSaved: boolean; pending?: boolean; disabled?: boolean; onPress: () => void }): React.JSX.Element {
  const { colors } = useTheme();
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={isSaved ? 'Quitar noticia de guardadas' : 'Guardar noticia'}
    accessibilityState={{ selected: isSaved, disabled: disabled || pending }}
    disabled={disabled || pending}
    hitSlop={4}
    onPress={onPress}
    style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceElevated, opacity: disabled || pending ? 0.65 : pressed ? 0.78 : 1 })}
  >
    <BookmarkGlyph color={isSaved ? colors.primary : colors.muted} cutoutColor={colors.surfaceElevated} filled={isSaved} />
  </Pressable>;
}
