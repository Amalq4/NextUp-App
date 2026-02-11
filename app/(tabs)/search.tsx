import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
  Dimensions,
  Animated as RNAnimated,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { MediaItem, mapTmdbToMediaItem, getPosterUrl, getGenreName, GENRES, MediaType } from '@/types/media';
import { getApiUrl } from '@/lib/query-client';
import Colors from '@/theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 10;
const GRID_PAD = 16;
const COL_W = (SCREEN_WIDTH - GRID_PAD * 2 - GRID_GAP) / 2;
const CARD_H = COL_W * 1.5;

type FilterType = 'all' | 'movie' | 'tv';

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function SkeletonCard({ index }: { index: number }) {
  const opacity = useRef(new RNAnimated.Value(0.4)).current;

  useEffect(() => {
    const anim = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        RNAnimated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={[styles.gridItem, index % 2 === 0 ? { paddingRight: GRID_GAP / 2 } : { paddingLeft: GRID_GAP / 2 }]}>
      <RNAnimated.View style={[styles.skeletonCard, { opacity }]}>
        <View style={styles.skeletonPoster} />
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonSub} />
      </RNAnimated.View>
    </View>
  );
}

function DiscoverCard({
  item,
  index,
  isInList,
  onPress,
  onAdd,
}: {
  item: MediaItem;
  index: number;
  isInList: boolean;
  onPress: () => void;
  onAdd: () => void;
}) {
  const posterUri = getPosterUrl(item.posterPath, 'w342');

  return (
    <View style={[styles.gridItem, index % 2 === 0 ? { paddingRight: GRID_GAP / 2 } : { paddingLeft: GRID_GAP / 2 }]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.cardContainer,
          { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
      >
        <View style={styles.posterWrap}>
          {posterUri ? (
            <Image source={{ uri: posterUri }} style={styles.posterImage} contentFit="cover" transition={200} />
          ) : (
            <View style={styles.posterPlaceholder}>
              <Ionicons name="film-outline" size={28} color={Colors.textMuted} />
            </View>
          )}
          <Pressable
            onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAdd(); }}
            style={[styles.addBtn, isInList && styles.addBtnActive]}
            hitSlop={8}
          >
            <Ionicons name={isInList ? 'checkmark' : 'add'} size={16} color={Colors.cream} />
          </Pressable>
          {item.voteAverage > 0 && (
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={8} color={Colors.star} />
              <Text style={styles.ratingText}>{item.voteAverage.toFixed(1)}</Text>
            </View>
          )}
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{item.mediaType === 'tv' ? 'TV' : 'FILM'}</Text>
          </View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardSub} numberOfLines={1}>
          {item.releaseDate ? new Date(item.releaseDate).getFullYear() : ''}
          {item.genreIds.length > 0 ? ` \u00B7 ${getGenreName(item.genreIds[0])}` : ''}
        </Text>
      </Pressable>
    </View>
  );
}

const POPULAR_GENRES = GENRES.filter(g =>
  [28, 35, 18, 27, 878, 10749, 53, 16, 14, 80, 9648, 99].includes(g.id)
);

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { profile, addToList, getListEntry } = useApp();
  const baseUrl = getApiUrl();

  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const debouncedQuery = useDebounce(query, 300);

  const isSearchMode = debouncedQuery.trim().length > 0;
  const preferredGenres = profile?.favoriteGenres || [];
  const mediaTypePref = profile?.preferredMediaType || 'both';

  const discoverType: 'movie' | 'tv' = filterType === 'all'
    ? (mediaTypePref === 'tv' ? 'tv' : 'movie')
    : filterType as 'movie' | 'tv';

  const genresForDiscover = useMemo(() => {
    if (selectedGenre) return selectedGenre.toString();
    if (preferredGenres.length > 0) return preferredGenres.join(',');
    return '';
  }, [selectedGenre, preferredGenres]);

  const providerStr = useMemo(() => {
    const pp = profile?.preferredProviders;
    return pp && pp.length > 0 ? pp.join('|') : '';
  }, [profile?.preferredProviders]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ['search-discover', isSearchMode ? 'search' : 'discover', debouncedQuery, filterType, genresForDiscover, providerStr],
    queryFn: async ({ pageParam }) => {
      if (isSearchMode) {
        const res = await fetch(`${baseUrl}api/tmdb/search/multi?query=${encodeURIComponent(debouncedQuery)}&page=${pageParam}`);
        if (!res.ok) throw new Error('Search failed');
        return res.json();
      } else {
        const params = new URLSearchParams({
          sort_by: 'popularity.desc',
          page: pageParam.toString(),
        });
        if (genresForDiscover) params.set('with_genres', genresForDiscover);
        if (providerStr) {
          params.set('with_watch_providers', providerStr);
          params.set('watch_region', profile?.region || 'US');
        }
        const res = await fetch(`${baseUrl}api/tmdb/discover/${discoverType}?${params}`);
        if (!res.ok) throw new Error('Discover failed');
        return res.json();
      }
    },
    getNextPageParam: (lastPage: any) => {
      if (lastPage.page < lastPage.total_pages && lastPage.page < 20) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const allItems = useMemo(() => {
    if (!data) return [];
    const flat = data.pages.flatMap((page: any) =>
      (page.results || []).map((r: any) =>
        mapTmdbToMediaItem(r, isSearchMode ? undefined : discoverType)
      )
    );

    let filtered = flat;
    if (isSearchMode && filterType !== 'all') {
      filtered = filtered.filter(i => i.mediaType === filterType);
    }

    if (preferredGenres.length > 0 && !selectedGenre) {
      filtered = [...filtered].sort((a, b) => {
        const aBoost = a.genreIds.filter(g => preferredGenres.includes(g)).length;
        const bBoost = b.genreIds.filter(g => preferredGenres.includes(g)).length;
        if (aBoost !== bBoost) return bBoost - aBoost;
        return 0;
      });
    }

    const seen = new Set<string>();
    return filtered.filter(i => {
      const key = `${i.id}-${i.mediaType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data, isSearchMode, filterType, preferredGenres, selectedGenre, discoverType]);

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

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const clearSearch = useCallback(() => {
    setQuery('');
  }, []);

  const renderItem = useCallback(({ item, index }: { item: MediaItem; index: number }) => (
    <DiscoverCard
      item={item}
      index={index}
      isInList={!!getListEntry(item.id)}
      onPress={() => router.push({ pathname: '/details/[id]', params: { id: item.id.toString(), type: item.mediaType } })}
      onAdd={() => handleAdd(item)}
    />
  ), [getListEntry, handleAdd]);

  const renderFooter = useCallback(() => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={Colors.accent} />
          <Text style={styles.footerText}>Loading more...</Text>
        </View>
      );
    }
    if (data && !hasNextPage && allItems.length > 0) {
      return (
        <View style={styles.footerLoader}>
          <Text style={styles.footerTextEnd}>You've seen it all</Text>
        </View>
      );
    }
    return null;
  }, [isFetchingNextPage, hasNextPage, data, allItems.length]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    if (isSearchMode && allItems.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={44} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>Try a different search term</Text>
        </View>
      );
    }
    return null;
  }, [isLoading, isSearchMode, allItems.length]);

  const renderSkeletons = () => (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={`sk-${i}`} index={i} />
      ))}
    </View>
  );

  const headerLabel = isSearchMode
    ? `Results for "${debouncedQuery}"`
    : selectedGenre
      ? `${GENRES.find(g => g.id === selectedGenre)?.name || 'Genre'} Picks`
      : preferredGenres.length > 0
        ? 'For You'
        : 'Popular Now';

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: Platform.OS === 'web' ? 67 : insets.top }}>
        <View style={styles.searchHeader}>
          <Text style={styles.screenTitle}>Discover</Text>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search movies & TV shows..."
              placeholderTextColor={Colors.textMuted}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              selectionColor={Colors.accent}
            />
            {query.length > 0 && (
              <Pressable onPress={clearSearch} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.filters}>
          <View style={styles.typeFilters}>
            {(['all', 'movie', 'tv'] as FilterType[]).map(type => (
              <Pressable
                key={type}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilterType(type); }}
                style={[styles.typeChip, filterType === type && styles.typeChipActive]}
              >
                <Text style={[styles.typeChipText, filterType === type && styles.typeChipTextActive]}>
                  {type === 'all' ? 'All' : type === 'movie' ? 'Movies' : 'TV Shows'}
                </Text>
              </Pressable>
            ))}
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={POPULAR_GENRES}
            keyExtractor={g => g.id.toString()}
            contentContainerStyle={styles.genreScroll}
            renderItem={({ item: g }) => {
              const isActive = selectedGenre === g.id;
              return (
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedGenre(prev => prev === g.id ? null : g.id); }}
                  style={[styles.genreChip, isActive && styles.genreChipActive]}
                >
                  <Text style={[styles.genreChipText, isActive && styles.genreChipTextActive]}>{g.name}</Text>
                </Pressable>
              );
            }}
          />
        </View>
      </View>

      {isLoading ? (
        renderSkeletons()
      ) : (
        <FlatList
          data={allItems}
          numColumns={2}
          keyExtractor={item => `${item.id}-${item.mediaType}`}
          renderItem={renderItem}
          contentContainerStyle={[styles.grid, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <Text style={styles.sectionLabel}>{headerLabel}</Text>
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: Colors.text,
    padding: 0,
  },
  filters: {
    paddingTop: 14,
  },
  typeFilters: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 10,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  typeChipActive: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accentBorder,
  },
  typeChipText: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: Colors.textSecondary,
  },
  typeChipTextActive: {
    color: Colors.cream,
  },
  genreScroll: {
    paddingHorizontal: 20,
    paddingBottom: 6,
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  genreChipActive: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accentBorder,
  },
  genreChipText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: Colors.textSecondary,
  },
  genreChipTextActive: {
    color: Colors.accent,
  },
  grid: {
    paddingHorizontal: GRID_PAD,
  },
  gridItem: {
    flex: 1,
    marginBottom: 14,
  },
  cardContainer: {
    flex: 1,
  },
  posterWrap: {
    width: '100%',
    height: CARD_H,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  posterImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  posterPlaceholder: {
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
    width: 28,
    height: 28,
    borderRadius: 14,
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
    gap: 2,
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
  typeBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: Colors.gold,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeText: {
    color: Colors.black,
    fontSize: 8,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.text,
    marginTop: 8,
    lineHeight: 17,
  },
  cardSub: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 17,
    fontFamily: 'DMSans_700Bold',
    color: Colors.textSecondary,
    marginBottom: 14,
    marginTop: 4,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textSecondary,
  },
  footerTextEnd: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PAD,
    paddingTop: 16,
  },
  skeletonCard: {
    flex: 1,
  },
  skeletonPoster: {
    width: '100%',
    height: CARD_H,
    borderRadius: 14,
    backgroundColor: Colors.surface,
  },
  skeletonTitle: {
    width: '70%',
    height: 12,
    borderRadius: 4,
    backgroundColor: Colors.surface,
    marginTop: 10,
  },
  skeletonSub: {
    width: '45%',
    height: 10,
    borderRadius: 4,
    backgroundColor: Colors.surface,
    marginTop: 6,
  },
});
