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
import { MediaItem, mapTmdbToMediaItem, getPosterUrl, getGenreName } from '@/types/media';
import { getApiUrl } from '@/lib/query-client';
import Colors from '@/theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = SCREEN_WIDTH * 0.32;
const CARD_H = CARD_W * 1.5;
const RANK_SIZE = 52;

interface Provider {
  id: number;
  name: string;
  color: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

const PROVIDERS: Provider[] = [
  { id: 8, name: 'Netflix', color: '#E50914', iconName: 'play' },
  { id: 337, name: 'Disney+', color: '#0063E5', iconName: 'sparkles' },
  { id: 9, name: 'Prime Video', color: '#00A8E1', iconName: 'play-circle' },
  { id: 350, name: 'Apple TV+', color: '#A2AAAD', iconName: 'logo-apple' },
  { id: 531, name: 'Paramount+', color: '#0064FF', iconName: 'star' },
];

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
      <Text style={styles.rankNumber}>{rank}</Text>
      <View style={styles.top10Poster}>
        {posterUri ? (
          <Image source={{ uri: posterUri }} style={styles.top10Image} contentFit="cover" transition={200} />
        ) : (
          <View style={styles.top10Placeholder}>
            <Ionicons name="film-outline" size={28} color={Colors.textMuted} />
          </View>
        )}
        <Pressable
          onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAdd(); }}
          style={[styles.addBtn, isInList && styles.addBtnActive]}
          hitSlop={8}
        >
          <Ionicons name={isInList ? 'checkmark' : 'add'} size={18} color={Colors.cream} />
        </Pressable>
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
        {item.genreIds.length > 0 ? ` \u00B7 ${getGenreName(item.genreIds[0])}` : ''}
      </Text>
    </Pressable>
  );
}

function InTheatersSection() {
  const { addToList, getListEntry } = useApp();
  const baseUrl = getApiUrl();

  const { data, isLoading, error } = useQuery<MediaItem[]>({
    queryKey: ['/api/tmdb/movie/now_playing'],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}api/tmdb/movie/now_playing?region=SA`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      return (json.results || []).map((r: any) => mapTmdbToMediaItem(r));
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const handleAdd = useCallback((item: MediaItem) => {
    if (getListEntry(item.id)) return;
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

  if (error) return null;

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={[styles.providerDot, { backgroundColor: Colors.gold }]} />
        <Text style={styles.sectionTitle}>In Theaters</Text>
      </View>
      {isLoading ? (
        <View style={styles.sectionLoading}>
          <ActivityIndicator size="small" color={Colors.gold} />
        </View>
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={data || []}
          keyExtractor={(item) => `theater-${item.id}`}
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
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const handleAdd = useCallback((item: MediaItem) => {
    if (getListEntry(item.id)) return;
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

  if (error) return null;

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={[styles.providerDot, { backgroundColor: provider.color }]} />
        <Text style={styles.sectionTitle}>{provider.name} Top 10</Text>
      </View>
      {isLoading ? (
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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile, lists, progress } = useApp();
  const queryClient = useQueryClient();
  const [activeProvider, setActiveProvider] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const watching = lists.filter(e => e.status === 'watching');
  const visibleProviders = activeProvider
    ? PROVIDERS.filter(p => p.id === activeProvider)
    : PROVIDERS;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/tmdb/provider'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/tmdb/movie/now_playing'] }),
    ]).then(() => {
      setRefreshing(false);
    });
  }, [queryClient]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ paddingTop: Platform.OS === 'web' ? 67 : insets.top }}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hello, {profile?.name || 'there'}</Text>
            <Text style={styles.subtitle}>What's on tonight?</Text>
          </View>
          <View style={styles.actionBtns}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/swipe'); }}
              style={({ pressed }) => [styles.spinBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Ionicons name="layers-outline" size={20} color={Colors.accent} />
            </Pressable>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/random-picker'); }}
              style={({ pressed }) => [styles.spinBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Ionicons name="shuffle" size={20} color={Colors.accent} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.providerRow}
        >
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveProvider(null); }}
            style={[styles.providerChip, activeProvider === null && styles.providerChipActive]}
          >
            <Text style={[styles.providerChipText, activeProvider === null && styles.providerChipTextActive]}>All</Text>
          </Pressable>
          {PROVIDERS.map(p => (
            <Pressable
              key={p.id}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveProvider(prev => prev === p.id ? null : p.id); }}
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
                    {prog && item.mediaType === 'tv' && (
                      <Text style={styles.cwProgress}>S{prog.seasonNumber} E{prog.episodeNumber}</Text>
                    )}
                  </Pressable>
                );
              }}
            />
          </View>
        )}

        <InTheatersSection />

        {visibleProviders.map(provider => (
          <ProviderSection key={provider.id} provider={provider} />
        ))}
      </ScrollView>
    </View>
  );
}

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
  actionBtns: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  spinBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
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
    height: CARD_H + 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionList: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  top10Card: {
    width: CARD_W + 16,
    marginRight: 6,
    position: 'relative',
  },
  rankNumber: {
    position: 'absolute',
    left: -4,
    bottom: 44,
    fontSize: 60,
    fontFamily: 'DMSans_700Bold',
    color: Colors.gold,
    zIndex: 2,
    lineHeight: 60,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  top10Poster: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 14,
    overflow: 'hidden',
    marginLeft: 16,
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
    fontSize: 10,
    fontFamily: 'DMSans_400Regular',
    color: Colors.accent,
    marginTop: 2,
  },
});
