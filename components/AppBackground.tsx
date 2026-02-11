import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/theme/colors';

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
