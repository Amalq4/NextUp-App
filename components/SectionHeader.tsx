import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/theme/colors';

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function SectionHeader({ title, onSeeAll, icon }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {icon && <Ionicons name={icon} size={18} color={Colors.tan} style={{ marginRight: 6 }} />}
        <Text style={styles.title}>{title}</Text>
      </View>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text style={styles.seeAll}>See All</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
    marginTop: 24,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: Colors.tan,
    paddingLeft: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: Colors.gold,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: Colors.tan,
  },
});
