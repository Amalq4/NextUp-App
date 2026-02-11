import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  copper: Colors.tan,
  indigo: Colors.slateGray,
  surface: Colors.surface,
  surfaceBorder: Colors.surfaceBorder,
};

export default function AppBackground({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={[Colors.background, Colors.backgroundDark, Colors.backgroundDeep]} style={styles.container}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
