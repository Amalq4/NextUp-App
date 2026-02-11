import React from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface GenreChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
}

export function GenreChip({ label, selected, onPress, compact = false }: GenreChipProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.chip,
        compact && styles.chipCompact,
        selected && styles.chipSelected,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[
        styles.label,
        compact && styles.labelCompact,
        selected && styles.labelSelected,
      ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.light.surfaceTertiary,
    marginRight: 8,
    marginBottom: 8,
  },
  chipCompact: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipSelected: {
    backgroundColor: Colors.light.accent,
  },
  label: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: Colors.light.text,
  },
  labelCompact: {
    fontSize: 12,
  },
  labelSelected: {
    color: '#fff',
  },
});
