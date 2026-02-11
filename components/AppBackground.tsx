import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const DARK_THEME = {
  bg1: '#0B1023',
  bg2: '#1A1040',
  bg3: '#0D0D2B',
  glass: 'rgba(255,255,255,0.08)',
  glassBorder: 'rgba(255,255,255,0.14)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.10)',
  text: '#FFFFFF',
  textSoft: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.35)',
  accent: '#4EEAAD',
  accentGlow: 'rgba(78,234,173,0.3)',
  gold: '#FBBF24',
  copper: '#E8935A',
  indigo: '#7C3AED',
  danger: '#EF4444',
  dangerBg: 'rgba(239,68,68,0.12)',
  divider: 'rgba(255,255,255,0.06)',
  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.12)',
};

export default function AppBackground({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={[DARK_THEME.bg1, DARK_THEME.bg2, DARK_THEME.bg3]} style={styles.container}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
