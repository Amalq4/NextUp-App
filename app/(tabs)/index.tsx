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
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { MediaItem, mapTmdbToMediaItem, getPosterUrl, getGenreName } from '@/types/media';
import { getApiUrl } from '@/lib/query-client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = SCREEN_WIDTH * 0.32;
const CARD_H = CARD_W * 1.5;
const RANK_SIZE = 52;

const D = {
  bg1: '#0B1023',
  bg2: '#111535',
  bg3: '#0D0D2B',
  surface: 'rgba(255,255,255,0.06)',
  surfaceBorder: 'rgba(255,255,255,0.08)',
  text: '#FFFFFF',
  textSoft: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.35)',
  accent: '#4EEAAD',
  gold: '#FBBF24',
  addBtn: 'rgba(255,255,255,0.15)',
  addBtnActive: '#4EEAAD',
};

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
  { id: 384, name: 'Max', color: '#B535F6', iconName: 'tv' },
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
            <Ionicons name="film-outline" size={28} color={D.textMuted} />
          </View>
        )}
        <Pressable
          onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAdd(); }}
          style={[styles.addBtn, isInList && styles.addBtnActive]}
          hitSlop={8}
        >
          <Ionicons name={isInList ? 'checkmark' : 'add'} size={18} color="#FFF" />
        </Pressable>
        {item.voteAverage > 0 && (
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={9} color={D.gold} />
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
    queryClient.invalidateQueries({ queryKey: ['/api/tmdb/provider'] }).then(() => {
      setRefreshing(false);
    });
  }, [queryClient]);

  return (
    <LinearGradient colors={[D.bg1, D.bg2, D.bg3]} style={styles.container}>
      <ScrollView
        style={{ paddingTop: Platform.OS === 'web' ? 67 : insets.top }}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={D.accent} />
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hello, {profile?.name || 'there'}</Text>
            <Text style={styles.subtitle}>What's on tonight?</Text>
          </View>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/random-picker'); }}
            style={({ pressed }) => [styles.spinBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name="shuffle" size={20} color={D.accent} />
          </Pressable>
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
              <Ionicons name={p.iconName} size={14} color={activeProvider === p.id ? '#FFF' : D.textSoft} style={{ marginRight: 5 }} />
              <Text style={[styles.providerChipText, activeProvider === p.id && styles.providerChipTextActive]}>{p.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {watching.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={[styles.providerDot, { backgroundColor: D.accent }]} />
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
                          <Ionicons name="film-outline" size={24} color={D.textMuted} />
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

        {visibleProviders.map(provider => (
          <ProviderSection key={provider.id} provider={provider} />
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    color: D.text,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: D.textSoft,
    marginTop: 2,
  },
  spinBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.surfaceBorder,
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
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.surfaceBorder,
  },
  providerChipActive: {
    backgroundColor: 'rgba(78,234,173,0.2)',
    borderColor: 'rgba(78,234,173,0.4)',
  },
  providerChipText: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    color: D.textSoft,
  },
  providerChipTextActive: {
    color: '#FFF',
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
    color: D.text,
    letterSpacing: 0.2,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: D.accent,
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
    left: -2,
    bottom: 50,
    fontSize: RANK_SIZE,
    fontFamily: 'DMSans_700Bold',
    color: 'rgba(255,255,255,0.9)',
    zIndex: 0,
    lineHeight: RANK_SIZE,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  top10Poster: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 14,
    overflow: 'hidden',
    marginLeft: 16,
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.surfaceBorder,
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
    backgroundColor: D.surface,
  },
  addBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: D.addBtn,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  addBtnActive: {
    backgroundColor: D.addBtnActive,
    borderColor: D.addBtnActive,
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
    color: '#FFF',
  },
  top10Title: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    color: D.text,
    marginTop: 6,
    marginLeft: 16,
    lineHeight: 16,
  },
  top10Sub: {
    fontSize: 10,
    fontFamily: 'DMSans_400Regular',
    color: D.textMuted,
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
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.surfaceBorder,
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
    color: D.text,
    marginTop: 6,
  },
  cwProgress: {
    fontSize: 10,
    fontFamily: 'DMSans_400Regular',
    color: D.accent,
    marginTop: 2,
  },
});
