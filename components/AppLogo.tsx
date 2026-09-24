import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type AppLogoVariant = 'compact' | 'small' | 'medium' | 'large';

const LOGO_SOURCE = require('../assets/branding/my-liga-mx-logo.png');
const MARK_SOURCE = require('../assets/branding/my-liga-mx-mark.png');

const FULL_WIDTH: Record<AppLogoVariant, number> = {
  compact: 34,
  small: 112,
  medium: 164,
  large: 236,
};

const MARK_WIDTH: Record<AppLogoVariant, number> = {
  compact: 22,
  small: 46,
  medium: 72,
  large: 104,
};

export function AppLogo({
  variant = 'small',
  showWordmark = true,
  style,
}: {
  variant?: AppLogoVariant;
  showWordmark?: boolean;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const width = showWordmark ? FULL_WIDTH[variant] : MARK_WIDTH[variant];
  const height = showWordmark ? Math.round(width * (1030 / 1208)) : Math.round(width * (830 / 1077));

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Image
        source={showWordmark ? LOGO_SOURCE : MARK_SOURCE}
        style={styles.image}
        resizeMode="contain"
        accessible
        accessibilityLabel={showWordmark ? 'My Liga MX' : 'Símbolo de My Liga MX'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'center' },
  image: { width: '100%', height: '100%' },
});
