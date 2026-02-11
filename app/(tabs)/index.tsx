import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, FlatList, Pressable, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { MediaCard } from '@/components/MediaCard';
import { SectionHeader } from '@/components/SectionHeader';
import { MediaItem, mapTmdbToMediaItem } from '@/types/media';
import { getApiUrl } from '@/lib/query-client';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile, lists, progress } = useApp();
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const watching = lists.filter(e => e.status === 'watching');

  const fetchTrending = useCallback(async () => {
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/tmdb/trending/all/day`);
      const data = await res.json();
      if (data.results) {
        setTrending(data.results.slice(0, 10).map((r: any) => mapTmdbToMediaItem(r)));
      }
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrending();
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 90 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.accent} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Hello, {profile?.name || 'there'}</Text>
          <Text style={styles.subtitle}>What are you watching next?</Text>
        </View>
        <Pressable
          onPress={() => router.push('/random-picker')}
          style={({ pressed }) => [styles.shuffleBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Ionicons name="shuffle" size={20} color={Colors.light.warm} />
        </Pressable>
      </View>

      <View style={styles.quickActions}>
        {[
          { icon: 'search' as const, label: 'Search', color: Colors.light.accent, bg: Colors.light.accentLight, onPress: () => router.push('/(tabs)/search') },
          { icon: 'list' as const, label: 'My Lists', color: Colors.light.warm, bg: Colors.light.warmLight, onPress: () => router.push('/(tabs)/lists') },
          { icon: 'shuffle' as const, label: 'Random', color: Colors.light.deepAccent, bg: Colors.light.deepAccentLight, onPress: () => router.push('/random-picker') },
          { icon: 'people' as const, label: 'Friends', color: Colors.light.brick, bg: Colors.light.brickLight, onPress: () => router.push('/(tabs)/friends') },
        ].map(action => (
          <Pressable
            key={action.label}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); action.onPress(); }}
            style={({ pressed }) => [styles.quickAction, { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] }]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: action.bg }]}>
              <Ionicons name={action.icon} size={20} color={action.color} />
            </View>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      {watching.length > 0 && (
        <>
          <SectionHeader title="Continue Watching" icon="play-circle" onSeeAll={() => router.push('/(tabs)/lists')} />
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={watching}
            keyExtractor={item => `${item.mediaId}`}
            contentContainerStyle={styles.horizontalList}
            renderItem={({ item }) => {
              const prog = progress.find(p => p.mediaId === item.mediaId);
              return (
                <MediaCard
                  item={{
                    id: item.mediaId,
                    mediaType: item.mediaType,
                    title: item.title,
                    posterPath: item.posterPath,
                    backdropPath: null,
                    overview: '',
                    releaseDate: '',
                    voteAverage: item.voteAverage,
                    genreIds: item.genreIds,
                  }}
                  onPress={() => router.push({ pathname: '/details/[id]', params: { id: item.mediaId.toString(), type: item.mediaType } })}
                  subtitle={prog && item.mediaType === 'tv' ? `S${prog.seasonNumber} E${prog.episodeNumber}` : undefined}
                />
              );
            }}
          />
        </>
      )}

      <SectionHeader title="Trending Today" icon="trending-up" />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.warm} />
        </View>
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={trending}
          keyExtractor={item => `${item.id}-${item.mediaType}`}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => (
            <MediaCard
              item={item}
              onPress={() => router.push({ pathname: '/details/[id]', params: { id: item.id.toString(), type: item.mediaType } })}
            />
          )}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 26,
    fontFamily: 'DMSans_700Bold',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  shuffleBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.light.warmLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
    color: Colors.light.text,
  },
  horizontalList: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  loadingContainer: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
