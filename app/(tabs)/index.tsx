/**
 * index.tsx — Home Screen
 *
 * The main landing screen after login. Shows the user's "Continue Watching"
 * row and a browsable grid of Top 10 lists per streaming provider.
 *
 * Layout (top to bottom):
 *   1. Greeting header + hamburger menu button
 *   2. Provider filter chips (All / Netflix / Disney+ / Prime / Apple TV+ / Paramount+)
 *   3. "Continue Watching" row (only shown if the user has items with status='watching')
 *   4. One ProviderSection per selected provider (each fetches its own data)
 *
 * Data flow:
 *   - Each ProviderSection makes its own React Query request to
 *     GET /api/tmdb/provider/:id/top so sections load independently.
 *   - Pull-to-refresh invalidates all provider queries simultaneously.
 *   - Quick-add buttons on cards write directly to AppContext (AsyncStorage).
 *
 * Design decisions:
 *   - Card dimensions are derived from screen width (32% of screen = CARD_W)
 *     so the layout adapts to any device width.
 *   - Rank numbers are rendered as large text behind the poster, using a
 *     text shadow to stay readable over any poster colour.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { useDrawer } from '@/context/DrawerContext';
import { MediaItem, mapTmdbToMediaItem, getPosterUrl, getGenreName } from '@/types/media';
import { getApiUrl } from '@/lib/query-client';
import Colors from '@/theme/colors';

// ─── Layout Constants ─────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = SCREEN_WIDTH * 0.32;  // Each card = 32% of screen width
const CARD_H = CARD_W * 1.5;         // 3:2 aspect ratio for poster cards
const RANK_SIZE = 52;                 // Unused size constant (reserved for future use)

// ─── Provider Data ────────────────────────────────────────────────────────────

interface Provider {
  id: number;           // TMDB watch provider ID
  name: string;         // Display name
  color: string;        // Brand colour for the active chip and loading indicator
  iconName: keyof typeof Ionicons.glyphMap;
}

/**
 * Supported streaming providers.
 * IDs match TMDB's watch provider IDs — check /watch/providers/movie on TMDB
 * to find IDs for other services.
 */
const PROVIDERS: Provider[] = [
  { id: 8,   name: 'Netflix',    color: '#E50914', iconName: 'play' },
  { id: 337, name: 'Disney+',    color: '#0063E5', iconName: 'sparkles' },
  { id: 9,   name: 'Prime Video',color: '#00A8E1', iconName: 'play-circle' },
  { id: 350, name: 'Apple TV+',  color: '#A2AAAD', iconName: 'logo-apple' },
  { id: 531, name: 'Paramount+', color: '#0064FF', iconName: 'star' },
];

// ─── Top10Card ────────────────────────────────────────────────────────────────

/**
 * A single media card inside a provider's Top 10 list.
 * Displays a large rank number behind/below the poster, plus a quick-add button
 * and a star rating pill.
 */
function Top10Card({
  item,
  rank,
  onPress,
  isInList,
  onAdd,
}: {
  item: MediaItem;
  rank: number;
  onPress: () => void;
  isInList: boolean;
  onAdd: () => void;
}) {
  const posterUri = getPosterUrl(item.posterPath, 'w342');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.top10Card,
        { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      {/* Large rank number behind the poster (overlapping left edge) */}
      <Text style={styles.rankNumber}>{rank}</Text>

      <View style={styles.top10Poster}>
        {posterUri ? (
          <Image source={{ uri: posterUri }} style={styles.top10Image} contentFit="cover" transition={200} />
        ) : (
          // Placeholder when TMDB has no poster for this title
          <View style={styles.top10Placeholder}>
            <Ionicons name="film-outline" size={28} color={Colors.textMuted} />
          </View>
        )}

        {/* Quick-add button — stopPropagation prevents the card press from firing */}
        <Pressable
          onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAdd(); }}
          style={[styles.addBtn, isInList && styles.addBtnActive]}
          hitSlop={8}
        >
          <Ionicons name={isInList ? 'checkmark' : 'add'} size={18} color={Colors.cream} />
        </Pressable>

        {/* Rating pill — hidden when voteAverage is 0 (not yet rated) */}
        {item.voteAverage > 0 && (
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={9} color={Colors.star} />
            <Text style={styles.ratingText}>{item.voteAverage.toFixed(1)}</Text>
          </View>
        )}
      </View>

      <Text style={styles.top10Title} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.top10Sub} numberOfLines={1}>
        {item.mediaType === 'tv' ? 'Series' : 'Movie'}
        {/* Middle dot separator between type and genre (Unicode · \u00B7) */}
        {item.genreIds.length > 0 ? ` \u00B7 ${getGenreName(item.genreIds[0])}` : ''}
      </Text>
    </Pressable>
  );
}

// ─── ProviderSection ──────────────────────────────────────────────────────────

/**
 * A horizontally scrollable row of Top10Cards for one streaming provider.
 * Each section fetches its own data independently so they can load in parallel
 * and one failure doesn't block the others.
 */
function ProviderSection({ provider }: { provider: Provider }) {
  const { lists, addToList, getListEntry } = useApp();
  const baseUrl = getApiUrl();

  const { data, isLoading, error } = useQuery<MediaItem[]>({
    queryKey: ['/api/tmdb/provider', provider.id.toString(), 'top'],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}api/tmdb/provider/${provider.id}/top?region=US`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      return (json.results || []).map((r: any) => mapTmdbToMediaItem(r));
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes — provider charts don't change often
    retry: 1,
  });

  /**
   * Adds a media item to the user's Want list with a single tap.
   * No-ops silently if the item is already in the list (idempotent).
   */
  const handleAdd = useCallback((item: MediaItem) => {
    if (getListEntry(item.id)) return; // Already in list — do nothing
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [addToList, getListEntry]);

  // If the request fails entirely, render nothing (avoids broken sections)
  if (error) return null;

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        {/* Coloured dot matching the provider's brand colour */}
        <View style={[styles.providerDot, { backgroundColor: provider.color }]} />
        <Text style={styles.sectionTitle}>{provider.name} Top 10</Text>
      </View>

      {isLoading ? (
        // Loading placeholder — same height as the card list so the page doesn't jump
        <View style={styles.sectionLoading}>
          <ActivityIndicator size="small" color={provider.color} />
        </View>
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={data || []}
          keyExtractor={(item) => `${provider.id}-${item.id}`}
          contentContainerStyle={styles.sectionList}
          renderItem={({ item, index }) => (
            <Top10Card
              item={item}
              rank={index + 1}
              onPress={() => router.push({ pathname: '/details/[id]', params: { id: item.id.toString(), type: item.mediaType } })}
              isInList={!!getListEntry(item.id)}
              onAdd={() => handleAdd(item)}
            />
          )}
        />
      )}
    </View>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile, lists, progress } = useApp();
  const { openDrawer } = useDrawer();
  const queryClient = useQueryClient();

  /** Which provider chip is active. null = show all providers. */
  const [activeProvider, setActiveProvider] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Items the user is currently watching — shown in the "Continue Watching" row
  const watching = lists.filter(e => e.status === 'watching');

  // Filter provider list based on the active chip selection
  const visibleProviders = activeProvider
    ? PROVIDERS.filter(p => p.id === activeProvider)
    : PROVIDERS;

  /**
   * Pull-to-refresh handler.
   * Invalidates all provider query caches so sections re-fetch their data.
   * The refreshing spinner stays visible until all invalidations resolve.
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/tmdb/provider'] }),
    ]).then(() => {
      setRefreshing(false);
    });
  }, [queryClient]);

  return (
    <View style={styles.container}>
      <ScrollView
        // Apply safe area top padding — handles notch, Dynamic Island, status bar
        style={{ paddingTop: Platform.OS === 'web' ? 67 : insets.top }}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
      >
        {/* ── Header row: greeting + hamburger menu ── */}
        <View style={styles.headerRow}>
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>Hello, {profile?.name || 'there'}</Text>
            <Text style={styles.subtitle}>What's on tonight?</Text>
          </View>
          <Pressable
            testID="drawer-menu-button"
            accessibilityLabel="Open Menu"
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openDrawer(); }}
            style={({ pressed }) => [styles.menuBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name="menu" size={24} color={Colors.accent} />
          </Pressable>
        </View>

        {/* ── Provider filter chip row ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.providerRow}
        >
          {/* "All" chip — clears the provider filter */}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveProvider(null); }}
            style={[styles.providerChip, activeProvider === null && styles.providerChipActive]}
          >
            <Text style={[styles.providerChipText, activeProvider === null && styles.providerChipTextActive]}>All</Text>
          </Pressable>

          {/* One chip per provider — tapping twice deselects (toggles off) */}
          {PROVIDERS.map(p => (
            <Pressable
              key={p.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveProvider(prev => prev === p.id ? null : p.id);
              }}
              style={[
                styles.providerChip,
                activeProvider === p.id && { backgroundColor: p.color, borderColor: p.color },
              ]}
            >
              <Ionicons name={p.iconName} size={14} color={activeProvider === p.id ? Colors.cream : Colors.textSecondary} style={{ marginRight: 5 }} />
              <Text style={[styles.providerChipText, activeProvider === p.id && styles.providerChipTextActive]}>{p.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Continue Watching row (only rendered when the list is non-empty) ── */}
        {watching.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={[styles.providerDot, { backgroundColor: Colors.accent }]} />
              <Text style={styles.sectionTitle}>Continue Watching</Text>
              <Pressable onPress={() => router.push('/(tabs)/lists')} hitSlop={10}>
                <Text style={styles.seeAll}>See All</Text>
              </Pressable>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={watching}
              keyExtractor={item => `cw-${item.mediaId}`}
              contentContainerStyle={styles.sectionList}
              renderItem={({ item }) => {
                // Look up episode progress for this show (TV only)
                const prog = progress.find(p => p.mediaId === item.mediaId);
                const posterUri = getPosterUrl(item.posterPath, 'w342');
                return (
                  <Pressable
                    onPress={() => router.push({ pathname: '/details/[id]', params: { id: item.mediaId.toString(), type: item.mediaType } })}
                    style={({ pressed }) => [
                      styles.cwCard,
                      { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                    ]}
                  >
                    <View style={styles.cwPoster}>
                      {posterUri ? (
                        <Image source={{ uri: posterUri }} style={styles.cwImage} contentFit="cover" />
                      ) : (
                        <View style={styles.cwPlaceholder}>
                          <Ionicons name="film-outline" size={24} color={Colors.textMuted} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.cwTitle} numberOfLines={1}>{item.title}</Text>
                    {/* Show season/episode progress label for TV shows only */}
                    {prog && item.mediaType === 'tv' && (
                      <Text style={styles.cwProgress}>S{prog.seasonNumber} E{prog.episodeNumber}</Text>
                    )}
                  </Pressable>
                );
              }}
            />
          </View>
        )}

        {/* ── Provider sections (one per visible provider) ── */}
        {visibleProviders.map(provider => (
          <ProviderSection key={provider.id} provider={provider} />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 16,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  greetingBlock: {
    flex: 1,
  },
  greeting: {
    fontSize: 26,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  providerRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 4,
    marginBottom: 8,
  },
  providerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  providerChipActive: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accentBorder,
  },
  providerChipText: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.textSecondary,
  },
  providerChipTextActive: {
    color: Colors.cream,
  },
  sectionContainer: {
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  providerDot: {
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
  seeAll: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: Colors.accent,
  },
  sectionLoading: {
    // Same height as a full card row so the page doesn't reflow on load
    height: CARD_H + 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionList: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  // Top 10 card layout — rank number overlaps the left edge of the poster
  top10Card: {
    width: CARD_W + 16, // Extra 16px for the rank number overflow
    marginRight: 6,
    position: 'relative',
  },
  rankNumber: {
    position: 'absolute',
    left: -4,
    bottom: 44,        // Positioned just below the bottom of the poster
    fontSize: 60,
    fontFamily: 'DMSans_700Bold',
    color: Colors.gold,
    zIndex: 2,
    lineHeight: 60,
    // Heavy text shadow so the number reads on any poster colour
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  top10Poster: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 14,
    overflow: 'hidden',
    marginLeft: 16,    // Offset to make room for the rank number
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  top10Image: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  top10Placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  addBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
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
    // Gold background when item is already in the user's list
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  ratingPill: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  ratingText: {
    fontSize: 10,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.cream,
  },
  top10Title: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.text,
    marginTop: 6,
    marginLeft: 16,
    lineHeight: 16,
  },
  top10Sub: {
    fontSize: 10,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
    marginTop: 2,
    marginLeft: 16,
  },
  // Continue Watching card — wider/shorter than the Top 10 cards
  cwCard: {
    width: 110,
    marginRight: 12,
  },
  cwPoster: {
    width: 110,
    height: 70,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cwImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  cwPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cwTitle: {
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.text,
    marginTop: 6,
  },
  cwProgress: {
    // Season/episode label shown below the title for TV shows
    fontSize: 10,
    fontFamily: 'DMSans_400Regular',
    color: Colors.accent,
    marginTop: 2,
  },
});
