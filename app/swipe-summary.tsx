import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import Colors from '@/theme/colors';
import { MediaItem, getPosterUrl, getGenreName } from '@/types/media';
import { swipeSessionData } from './swipe';

export default function SwipeSummaryScreen() {
  const insets = useSafeAreaInsets();
  const { addToList, getListEntry } = useApp();
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  const { watched, notSeen } = swipeSessionData;

  const handleAddToWant = (item: MediaItem) => {
    if (getListEntry(item.id)) return;
    if (addedIds.has(item.id)) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addToList({
      mediaId: item.id,
      mediaType: item.mediaType,
      status: 'want',
      addedAt: new Date().toISOString(),
      title: item.title,
      posterPath: item.posterPath,
      voteAverage: item.voteAverage,
      genreIds: item.genreIds,
    });
    setAddedIds(prev => new Set(prev).add(item.id));
  };

  const isItemAdded = (id: number) => addedIds.has(id) || !!getListEntry(id);

  const renderItem = (item: MediaItem, showAddButton: boolean) => {
    const posterUri = getPosterUrl(item.posterPath, 'w185');
    const year = item.releaseDate ? item.releaseDate.substring(0, 4) : '';
    const genre = item.genreIds.length > 0 ? getGenreName(item.genreIds[0]) : '';
    const added = isItemAdded(item.id);

    return (
      <View key={item.id} style={styles.itemRow}>
        <View style={styles.posterContainer}>
          {posterUri ? (
            <Image source={{ uri: posterUri }} style={styles.poster} contentFit="cover" transition={200} />
          ) : (
            <View style={styles.posterPlaceholder}>
              <Ionicons name="film-outline" size={24} color={Colors.textMuted} />
            </View>
          )}
        </View>

        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.itemMeta}>
            {year}{year && genre ? ' · ' : ''}{genre}
          </Text>
        </View>

        {showAddButton ? (
          <Pressable
            onPress={() => handleAddToWant(item)}
            style={[styles.addBtn, added && styles.addBtnActive]}
            hitSlop={8}
          >
            <Ionicons name={added ? 'checkmark' : 'add'} size={18} color={Colors.cream} />
          </Pressable>
        ) : (
          <Ionicons name="checkmark-circle" size={22} color={Colors.accent} />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: Platform.OS === 'web' ? 67 : insets.top }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Swipe Summary</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: Colors.gold }]} />
            <Text style={styles.sectionTitle}>Watched</Text>
          </View>
          {watched.length > 0 ? (
            watched.map(item => renderItem(item, false))
          ) : (
            <Text style={styles.emptyText}>No titles marked as watched</Text>
          )}
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: Colors.textMuted }]} />
            <Text style={styles.sectionTitle}>Not Seen</Text>
          </View>
          {notSeen.length > 0 ? (
            notSeen.map(item => renderItem(item, true))
          ) : (
            <Text style={styles.emptyText}>No titles in this section</Text>
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomAction, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 12 }]}>
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          style={({ pressed }) => [
            styles.homeBtn,
            { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  sectionContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: Colors.gold,
    letterSpacing: 0.2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  posterContainer: {
    width: 60,
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  poster: {
    width: 60,
    height: 90,
    borderRadius: 10,
  },
  posterPlaceholder: {
    width: 60,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.text,
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  addBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
    paddingVertical: 16,
  },
  bottomAction: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  homeBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBtnText: {
    fontSize: 17,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.black,
  },
});
