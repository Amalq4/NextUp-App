import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { ListItem } from '@/components/ListItem';
import { ListStatus, ListEntry } from '@/types/media';

const TABS: { key: ListStatus; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }[] = [
  { key: 'want', label: 'Want', icon: 'bookmark', color: Colors.light.warm, bg: Colors.light.warmLight },
  { key: 'watching', label: 'Watching', icon: 'play-circle', color: Colors.light.accent, bg: Colors.light.accentLight },
  { key: 'watched', label: 'Watched', icon: 'checkmark-circle', color: Colors.light.success, bg: Colors.light.successLight },
];

export default function ListsScreen() {
  const insets = useSafeAreaInsets();
  const { lists, progress, removeFromList } = useApp();
  const [activeTab, setActiveTab] = useState<ListStatus>('want');

  const filteredItems = useMemo(() => {
    return lists
      .filter(e => e.status === activeTab)
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  }, [lists, activeTab]);

  const handleRemove = (entry: ListEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeFromList(entry.mediaId);
  };

  const counts = useMemo(() => ({
    want: lists.filter(e => e.status === 'want').length,
    watching: lists.filter(e => e.status === 'watching').length,
    watched: lists.filter(e => e.status === 'watched').length,
  }), [lists]);

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}>
      <Text style={styles.screenTitle}>My Lists</Text>

      <View style={styles.tabBar}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(tab.key); }}
              style={[styles.tab, isActive && { backgroundColor: tab.bg, borderColor: tab.color }]}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={isActive ? tab.color : Colors.light.textTertiary}
              />
              <Text style={[styles.tabText, isActive && { color: tab.color, fontFamily: 'DMSans_600SemiBold' as const }]}>
                {tab.label}
              </Text>
              <View style={[styles.countBadge, isActive && { backgroundColor: tab.color }]}>
                <Text style={[styles.countText, isActive && styles.countTextActive]}>
                  {counts[tab.key]}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={item => `${item.mediaId}`}
        renderItem={({ item }) => (
          <ListItem
            entry={item}
            progress={progress.find(p => p.mediaId === item.mediaId)}
            onPress={() => router.push({ pathname: '/details/[id]', params: { id: item.mediaId.toString(), type: item.mediaType } })}
            onRemove={() => handleRemove(item)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={activeTab === 'want' ? 'bookmark-outline' : activeTab === 'watching' ? 'play-circle-outline' : 'checkmark-circle-outline'}
              size={52}
              color={Colors.light.textTertiary}
            />
            <Text style={styles.emptyTitle}>No titles yet</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'want'
                ? 'Add movies and shows you want to watch'
                : activeTab === 'watching'
                ? 'Start tracking what you\'re watching'
                : 'Mark titles as watched when you finish'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'DMSans_700Bold',
    color: Colors.light.text,
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: Colors.light.textSecondary,
  },
  countBadge: {
    backgroundColor: Colors.light.surfaceSecondary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.light.textSecondary,
  },
  countTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.light.text,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: Colors.light.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
