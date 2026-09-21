import { Tabs } from 'expo-router';
import React from 'react';
import { ColorValue, StyleSheet, View } from 'react-native';
import { useTheme } from '../../src/theme/ThemeProvider';

type TabIconName = 'home' | 'matches' | 'standings' | 'news' | 'profile';

export default function TabsLayout(): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 68,
          paddingTop: 7,
          paddingBottom: 8,
        },
        tabBarItemStyle: {
          borderRadius: 14,
          marginHorizontal: 3,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="home"
              color={color}
              focused={focused}
              activeBackground={`${colors.primary}24`}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Partidos',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="matches"
              color={color}
              focused={focused}
              activeBackground={`${colors.primary}24`}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="standings"
        options={{
          title: 'Tabla',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="standings"
              color={color}
              focused={focused}
              activeBackground={`${colors.primary}24`}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: 'Noticias',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="news"
              color={color}
              focused={focused}
              activeBackground={`${colors.primary}24`}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="profile"
              color={color}
              focused={focused}
              activeBackground={`${colors.primary}24`}
            />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  name,
  color,
  focused,
  activeBackground,
}: {
  name: TabIconName;
  color: ColorValue;
  focused: boolean;
  activeBackground: string;
}): React.JSX.Element {
  return (
    <View
      style={[
        styles.iconFrame,
        focused && {
          backgroundColor: activeBackground,
          borderColor: activeBackground,
          borderWidth: 1,
        },
      ]}
    >
      <TabGlyph name={name} color={color} />
    </View>
  );
}

function TabGlyph({ name, color }: { name: TabIconName; color: ColorValue }): React.JSX.Element {
  switch (name) {
    case 'home':
      return (
        <View style={styles.homeGlyph}>
          <View style={[styles.homeRoof, { borderColor: color }]} />
          <View style={[styles.homeBody, { borderColor: color }]}>
            <View style={[styles.homeDoor, { backgroundColor: color }]} />
          </View>
        </View>
      );
    case 'matches':
      return (
        <View style={[styles.ballGlyph, { borderColor: color }]}>
          <View style={[styles.ballCore, { borderColor: color }]} />
          <View style={[styles.ballLine, styles.ballLineLeft, { backgroundColor: color }]} />
          <View style={[styles.ballLine, styles.ballLineRight, { backgroundColor: color }]} />
        </View>
      );
    case 'standings':
      return (
        <View style={styles.rankingGlyph}>
          <View style={[styles.rankingBar, styles.rankingBarShort, { backgroundColor: color }]} />
          <View style={[styles.rankingBar, styles.rankingBarTall, { backgroundColor: color }]} />
          <View style={[styles.rankingBar, styles.rankingBarMedium, { backgroundColor: color }]} />
        </View>
      );
    case 'news':
      return (
        <View style={[styles.newsGlyph, { borderColor: color }]}>
          <View style={[styles.newsLine, styles.newsLineWide, { backgroundColor: color }]} />
          <View style={[styles.newsLine, styles.newsLineWide, { backgroundColor: color }]} />
          <View style={[styles.newsLine, styles.newsLineShort, { backgroundColor: color }]} />
          <View style={[styles.newsLine, styles.newsLineWide, { backgroundColor: color }]} />
        </View>
      );
    case 'profile':
      return (
        <View style={styles.profileGlyph}>
          <View style={[styles.profileHead, { borderColor: color }]} />
          <View style={[styles.profileShoulders, { borderColor: color }]} />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  iconFrame: {
    alignItems: 'center',
    borderRadius: 10,
    height: 29,
    justifyContent: 'center',
    width: 38,
  },
  homeGlyph: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'flex-end',
    width: 22,
  },
  homeRoof: {
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderRadius: 3,
    borderRightWidth: 2,
    borderTopWidth: 2,
    height: 13,
    position: 'absolute',
    top: 1,
    transform: [{ rotate: '45deg' }],
    width: 13,
  },
  homeBody: {
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopWidth: 0,
    height: 12,
    width: 16,
  },
  homeDoor: {
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    bottom: 0,
    height: 6,
    left: 5,
    position: 'absolute',
    width: 4,
  },
  ballGlyph: {
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 2,
    height: 21,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 21,
  },
  ballCore: {
    borderWidth: 1.5,
    height: 6,
    transform: [{ rotate: '45deg' }],
    width: 6,
  },
  ballLine: {
    height: 1.5,
    position: 'absolute',
    width: 10,
  },
  ballLineLeft: {
    left: -1,
    transform: [{ rotate: '-35deg' }],
  },
  ballLineRight: {
    right: -1,
    transform: [{ rotate: '35deg' }],
  },
  rankingGlyph: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    height: 21,
    justifyContent: 'center',
    width: 23,
  },
  rankingBar: {
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    marginHorizontal: 2,
    width: 5,
  },
  rankingBarShort: {
    height: 10,
    opacity: 0.72,
  },
  rankingBarTall: {
    height: 19,
  },
  rankingBarMedium: {
    height: 14,
    opacity: 0.86,
  },
  newsGlyph: {
    borderRadius: 3,
    borderWidth: 2,
    height: 21,
    justifyContent: 'space-evenly',
    paddingHorizontal: 3,
    width: 19,
  },
  newsLine: {
    borderRadius: 1,
    height: 1.5,
  },
  newsLineWide: {
    width: 10,
  },
  newsLineShort: {
    width: 6,
  },
  profileGlyph: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'flex-end',
    width: 23,
  },
  profileHead: {
    borderRadius: 6,
    borderWidth: 2,
    height: 8,
    position: 'absolute',
    top: 0,
    width: 8,
  },
  profileShoulders: {
    borderBottomWidth: 0,
    borderLeftWidth: 2,
    borderRadius: 10,
    borderRightWidth: 2,
    borderTopWidth: 2,
    height: 11,
    width: 21,
  },
});
