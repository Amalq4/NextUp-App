import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, FlatList, Pressable, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { MediaCard } from '@/components/MediaCard';
import { GenreChip } from '@/components/GenreChip';
import { MediaItem, mapTmdbToMediaItem, GENRES, MediaType } from '@/types/media';
import { getApiUrl } from '@/lib/query-client';

const POPULAR_GENRES = GENRES.filter(g =>
  [28, 35, 18, 27, 878, 10749, 53, 16, 14, 80].includes(g.id)
);

type FilterType = 'all' | 'movie' | 'tv';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/tmdb/trending/all/week`);
      const data = await res.json();
      if (data.results) {
        setTrending(data.results.map((r: any) => mapTmdbToMediaItem(r)));
      }
    } catch {}
  };

  const searchTmdb = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/tmdb/search/multi?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.results) {
        setResults(data.results.map((r: any) => mapTmdbToMediaItem(r)));
      }
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  const onChangeText = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchTmdb(text), 400);
  };

  const filterResults = (items: MediaItem[]) => {
    let filtered = items;
    if (filterType !== 'all') {
      filtered = filtered.filter(i => i.mediaType === filterType);
    }
    if (selectedGenre) {
      filtered = filtered.filter(i => i.genreIds.includes(selectedGenre));
    }
    return filtered;
  };

  const displayItems = query.trim() ? filterResults(results) : filterResults(trending);
  const isSearching = !!query.trim();

  const renderItem = ({ item, index }: { item: MediaItem; index: number }) => (
    <View style={[styles.gridItem, index % 2 === 0 ? { paddingRight: 6 } : { paddingLeft: 6 }]}>
      <MediaCard
        item={item}
        size="large"
        onPress={() => router.push({ pathname: '/details/[id]', params: { id: item.id.toString(), type: item.mediaType } })}
      />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}>
      <View style={styles.searchHeader}>
        <Text style={styles.screenTitle}>Discover</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.light.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies & TV shows..."
            placeholderTextColor={Colors.light.textTertiary}
            value={query}
            onChangeText={onChangeText}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); setResults([]); }}>
              <Ionicons name="close-circle" size={18} color={Colors.light.textTertiary} />
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
          renderItem={({ item: g }) => (
            <GenreChip
              label={g.name}
              selected={selectedGenre === g.id}
              compact
              onPress={() => setSelectedGenre(prev => prev === g.id ? null : g.id)}
            />
          )}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.warm} />
        </View>
      ) : (
        <FlatList
          data={displayItems}
          numColumns={2}
          keyExtractor={item => `${item.id}-${item.mediaType}`}
          renderItem={renderItem}
          contentContainerStyle={[styles.grid, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            !isSearching ? (
              <Text style={styles.sectionLabel}>Trending This Week</Text>
            ) : displayItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color={Colors.light.textTertiary} />
                <Text style={styles.emptyText}>No results found</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  searchHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'DMSans_700Bold',
    color: Colors.light.text,
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: Colors.light.text,
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
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  typeChipActive: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
  },
  typeChipText: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: Colors.light.text,
  },
  typeChipTextActive: {
    color: '#fff',
  },
  genreScroll: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  grid: {
    paddingHorizontal: 20,
  },
  gridItem: {
    flex: 1,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.light.text,
    marginBottom: 14,
    marginTop: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: Colors.light.textSecondary,
  },
});
