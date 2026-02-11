import React from 'react';
import { StyleSheet, View } from 'react-native';
import Colors from '@/theme/colors';

export const DARK_THEME = {
  bg1: Colors.background,
  bg2: Colors.backgroundDark,
  bg3: Colors.backgroundDeep,
  text: Colors.text,
  textSoft: Colors.textSecondary,
  textMuted: Colors.textMuted,
  accent: Colors.accent,
  glass: Colors.glass,
  glassBorder: Colors.glassBorder,
  inputBg: Colors.inputBg,
  inputBorder: Colors.inputBorder,
  divider: Colors.divider,
  danger: Colors.danger,
  dangerBg: Colors.dangerBg,
  copper: Colors.gold,
  indigo: Colors.textMuted,
  surface: Colors.surface,
  surfaceBorder: Colors.surfaceBorder,
};

export default function AppBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.container}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
