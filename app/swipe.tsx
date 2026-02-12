import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, Dimensions, PanResponder, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS, interpolate } from 'react-native-reanimated';
import { useApp } from '@/context/AppContext';
import Colors from '@/theme/colors';
import { MediaItem, mapTmdbToMediaItem, getPosterUrl, getGenreName } from '@/types/media';
import { getApiUrl } from '@/lib/query-client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.7;
const CARD_HEIGHT = CARD_WIDTH * 1.5;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

export let swipeSessionData: { watched: MediaItem[], notSeen: MediaItem[] } = { watched: [], notSeen: [] };

interface SwipeCardProps {
  item: MediaItem;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

function SwipeCard({ item, onSwipeLeft, onSwipeRight }: SwipeCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10,
      onPanResponderMove: (_, gs) => {
        translateX.value = gs.dx;
        translateY.value = gs.dy * 0.3;
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > SWIPE_THRESHOLD) {
          translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 });
          translateY.value = withTiming(gs.dy * 0.5, { duration: 300 });
          runOnJS(onSwipeRight)();
        } else if (gs.dx < -SWIPE_THRESHOLD) {
          translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 });
          translateY.value = withTiming(gs.dy * 0.5, { duration: 300 });
          runOnJS(onSwipeLeft)();
        } else {
          translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
          translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        }
      },
    })
  ).current;

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-15, 0, 15]
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const seenOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp'),
  }));

  const notSeenOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], 'clamp'),
  }));

  const posterUri = getPosterUrl(item.posterPath, 'w500');
  const year = item.releaseDate ? item.releaseDate.substring(0, 4) : '';
  const genre = item.genreIds.length > 0 ? getGenreName(item.genreIds[0]) : '';

  return (
    <Animated.View style={[styles.cardContainer, cardStyle]} {...panResponder.panHandlers}>
      <View style={styles.card}>
        {posterUri ? (
          <Image source={{ uri: posterUri }} style={styles.cardImage} contentFit="cover" transition={200} />
        ) : (
          <View style={styles.cardPlaceholder}>
            <Ionicons name="film-outline" size={48} color={Colors.textMuted} />
          </View>
        )}

        <Animated.View style={[styles.overlayBadge, styles.seenBadge, seenOverlayStyle]}>
          <Text style={styles.seenBadgeText}>SEEN</Text>
        </Animated.View>

        <Animated.View style={[styles.overlayBadge, styles.notSeenBadge, notSeenOverlayStyle]}>
          <Text style={styles.notSeenBadgeText}>NOT SEEN</Text>
        </Animated.View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.cardMeta}>
            {year}{year && genre ? ' \u00B7 ' : ''}{genre}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function SwipeScreen() {
  const insets = useSafeAreaInsets();
  const { profile, lists, addToList } = useApp();

  const [items, setItems] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [watched, setWatched] = useState<MediaItem[]>([]);
  const [notSeen, setNotSeen] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const fetchingRef = useRef(false);

  const excludedIds = useRef(new Set(
    lists.map(e => e.mediaId)
  ));

  const mediaType = profile?.preferredMediaType === 'tv' ? 'tv' : 'movie';

  const fetchItems = useCallback(async (pageNum: number) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const baseUrl = getApiUrl();
      const params = new URLSearchParams();
      params.set('page', pageNum.toString());

      if (profile?.favoriteGenres && profile.favoriteGenres.length > 0) {
        params.set('with_genres', profile.favoriteGenres.join(','));
      }

      const res = await fetch(`${baseUrl}api/tmdb/discover/${mediaType}?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      const results: MediaItem[] = (json.results || [])
        .map((r: any) => mapTmdbToMediaItem(r, mediaType))
        .filter((item: MediaItem) => !excludedIds.current.has(item.id));

      if (results.length === 0) {
        setHasMore(false);
      } else {
        setItems(prev => [...prev, ...results]);
      }
    } catch (err) {
      console.error('Failed to fetch swipe items:', err);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [mediaType, profile?.favoriteGenres]);

  useEffect(() => {
    fetchItems(1);
  }, []);

  useEffect(() => {
    if (items.length > 0 && currentIndex >= items.length - 3 && hasMore && !fetchingRef.current) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchItems(nextPage);
    }
  }, [currentIndex, items.length, hasMore, page]);

  const handleSwipeRight = useCallback(() => {
    const item = items[currentIndex];
    if (!item) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setWatched(prev => [...prev, item]);
    excludedIds.current.add(item.id);

    addToList({
      mediaId: item.id,
      mediaType: item.mediaType,
      status: 'watched',
      addedAt: new Date().toISOString(),
      title: item.title,
      posterPath: item.posterPath,
      voteAverage: item.voteAverage,
      genreIds: item.genreIds,
    });

    setTimeout(() => setCurrentIndex(prev => prev + 1), 350);
  }, [currentIndex, items, addToList]);

  const handleSwipeLeft = useCallback(() => {
    const item = items[currentIndex];
    if (!item) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNotSeen(prev => [...prev, item]);

    setTimeout(() => setCurrentIndex(prev => prev + 1), 350);
  }, [currentIndex, items]);

  const handleFinish = useCallback(() => {
    swipeSessionData = { watched, notSeen };
    router.push('/swipe-summary');
  }, [watched, notSeen]);

  const currentItem = items[currentIndex];
  const isDone = !loading && currentIndex >= items.length;

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: Platform.OS === 'web' ? 67 : insets.top }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Swipe to Decide</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <View style={styles.content}>
        {loading && items.length === 0 ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={Colors.gold} />
            <Text style={styles.loadingText}>Loading titles...</Text>
          </View>
        ) : isDone ? (
          <View style={styles.centerState}>
            <Ionicons name="checkmark-circle-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.doneTitle}>No more titles</Text>
            <Text style={styles.doneSub}>You've gone through all available titles</Text>
          </View>
        ) : currentItem ? (
          <SwipeCard
            key={`swipe-${currentItem.id}-${currentIndex}`}
            item={currentItem}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
          />
        ) : null}

        {!loading && items.length > 0 && (
          <View style={styles.counters}>
            <View style={styles.counterPill}>
              <Ionicons name="eye" size={14} color={Colors.accent} />
              <Text style={styles.counterText}>{watched.length} Seen</Text>
            </View>
            <View style={styles.counterPill}>
              <Ionicons name="eye-off" size={14} color={Colors.textMuted} />
              <Text style={styles.counterTextMuted}>{notSeen.length} Not Seen</Text>
            </View>
          </View>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 12 }]}>
        <Pressable
          onPress={handleFinish}
          style={({ pressed }) => [
            styles.finishBtn,
            { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <Text style={styles.finishBtnText}>Finish</Text>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT + 80,
    position: 'absolute',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  cardPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  overlayBadge: {
    position: 'absolute',
    top: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
  },
  seenBadge: {
    left: 16,
    borderColor: Colors.accent,
    backgroundColor: 'rgba(201,162,77,0.15)',
  },
  notSeenBadge: {
    right: 16,
    borderColor: Colors.textMuted,
    backgroundColor: 'rgba(232,220,194,0.1)',
  },
  seenBadgeText: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: Colors.accent,
    letterSpacing: 1,
  },
  notSeenBadgeText: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.overlay,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: Colors.textSecondary,
    marginTop: 8,
  },
  doneTitle: {
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
  },
  doneSub: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
  },
  counters: {
    flexDirection: 'row',
    gap: 16,
    position: 'absolute',
    bottom: 16,
  },
  counterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  counterText: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.accent,
  },
  counterTextMuted: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.textMuted,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  finishBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishBtnText: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: Colors.black,
  },
});
