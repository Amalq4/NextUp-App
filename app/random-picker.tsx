import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  Dimensions,
  PanResponder,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
  interpolate,
  cancelAnimation,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/context/AppContext';
import { ListEntry, ListStatus, MediaType, GENRES, getGenreName, getPosterUrl } from '@/types/media';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = Math.min(110, SCREEN_WIDTH * 0.26);
const CARD_H = CARD_W * 1.5;
const CENTER_CARD_W = Math.min(140, SCREEN_WIDTH * 0.34);
const CENTER_CARD_H = CENTER_CARD_W * 1.5;
const CARD_GAP = 8;

const FILTER_GENRES = GENRES.filter(g =>
  [28, 35, 18, 27, 878, 10749, 53, 16].includes(g.id)
);

const DARK = {
  bg1: '#0B1023',
  bg2: '#1A1040',
  bg3: '#0D0D2B',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.10)',
  glass: 'rgba(255,255,255,0.08)',
  glassBorder: 'rgba(255,255,255,0.15)',
  text: '#FFFFFF',
  textSoft: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.35)',
  accent: '#4EEAAD',
  accentGlow: 'rgba(78,234,173,0.3)',
  copper: '#E8935A',
  copperGlow: 'rgba(232,147,90,0.25)',
  emerald: '#34D399',
  indigo: '#7C3AED',
  pointer: '#FF6B6B',
  dot: 'rgba(255,255,255,0.15)',
  dotActive: '#4EEAAD',
  success: '#22C55E',
  star: '#FBBF24',
};

interface CarouselCardProps {
  item: ListEntry | null;
  position: number;
  isCenter: boolean;
  glowOpacity: Animated.SharedValue<number>;
  isRevealed: boolean;
}

function CarouselCard({ item, position, isCenter, glowOpacity, isRevealed }: CarouselCardProps) {
  const animatedGlow = useAnimatedStyle(() => {
    if (!isCenter || !isRevealed) return { opacity: 0 };
    return {
      opacity: glowOpacity.value,
    };
  });

  const scale = isCenter ? 1 : position === -1 || position === 1 ? 0.82 : 0.65;
  const rotateY = position === -2 ? '18deg' : position === -1 ? '8deg' : position === 1 ? '-8deg' : position === 2 ? '-18deg' : '0deg';
  const opacity = isCenter ? 1 : Math.abs(position) === 1 ? 0.75 : 0.45;
  const translateX = position * (CARD_W + CARD_GAP) * (isCenter ? 0 : 1);
  const zIndex = isCenter ? 10 : 5 - Math.abs(position);

  const cardWidth = isCenter ? CENTER_CARD_W : CARD_W;
  const cardHeight = isCenter ? CENTER_CARD_H : CARD_H;

  return (
    <View
      style={[
        styles.carouselSlot,
        {
          transform: [
            { translateX },
            { scale },
            { perspective: 800 },
            { rotateY },
          ],
          opacity,
          zIndex,
        },
      ]}
    >
      {isCenter && isRevealed && (
        <Animated.View style={[styles.cardGlow, animatedGlow]} />
      )}
      <View style={[styles.carouselCard, { width: cardWidth, height: cardHeight }]}>
        {item?.posterPath ? (
          <Image
            source={{ uri: getPosterUrl(item.posterPath, 'w342')! }}
            style={[styles.cardImage, { width: cardWidth, height: cardHeight }]}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.cardPlaceholder, { width: cardWidth, height: cardHeight }]}>
            <Ionicons name="film-outline" size={isCenter ? 32 : 24} color={DARK.textMuted} />
          </View>
        )}
        {isCenter && isRevealed && (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.cardOverlay}
          >
            <Text style={styles.cardTitle} numberOfLines={2}>{item?.title}</Text>
          </LinearGradient>
        )}
      </View>
    </View>
  );
}

function GlowDot({ index, isSpinning, activeIndex }: { index: number; isSpinning: boolean; activeIndex: number }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (isSpinning) {
      pulse.value = withRepeat(
        withSequence(
          withDelay(index * 60, withTiming(1, { duration: 300 })),
          withTiming(0.3, { duration: 300 })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(index === activeIndex ? 1 : 0.3, { duration: 400 });
    }
  }, [isSpinning, activeIndex]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: interpolate(pulse.value, [0.3, 1], [0.8, 1.3]) }],
  }));

  return (
    <Animated.View
      style={[
        styles.glowDot,
        index === activeIndex && !isSpinning && styles.glowDotActive,
        animStyle,
      ]}
    />
  );
}

export default function SpinPickerScreen() {
  const insets = useSafeAreaInsets();
  const { lists } = useApp();

  const [selectedLists, setSelectedLists] = useState<ListStatus[]>(['want', 'watching']);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<MediaType | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayItems, setDisplayItems] = useState<(ListEntry | null)[]>([null, null, null, null, null]);
  const [selectedItem, setSelectedItem] = useState<ListEntry | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const glowOpacity = useSharedValue(0);
  const resultScale = useSharedValue(0);
  const resultOpacity = useSharedValue(0);

  const getEligibleItems = useCallback(() => {
    let items = lists.filter(e => selectedLists.includes(e.status));
    if (selectedGenre) items = items.filter(e => e.genreIds.includes(selectedGenre));
    if (selectedType) items = items.filter(e => e.mediaType === selectedType);
    return items;
  }, [lists, selectedLists, selectedGenre, selectedType]);

  const eligible = getEligibleItems();

  useEffect(() => {
    if (eligible.length > 0 && !isSpinning && !selectedItem) {
      const initial: (ListEntry | null)[] = [];
      for (let i = 0; i < 5; i++) {
        initial.push(eligible[i % eligible.length]);
      }
      setDisplayItems(initial);
    }
  }, [eligible.length]);

  const triggerSpin = useCallback(() => {
    if (eligible.length === 0 || isSpinning) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsSpinning(true);
    setIsRevealed(false);
    setSelectedItem(null);
    glowOpacity.value = 0;
    resultScale.value = 0;
    resultOpacity.value = 0;

    const totalSteps = 25 + Math.floor(Math.random() * 20);
    let step = 0;
    let offset = Math.floor(Math.random() * eligible.length);

    function tick() {
      step++;
      offset++;

      const display: (ListEntry | null)[] = [];
      for (let i = 0; i < 5; i++) {
        display.push(eligible[(offset + i) % eligible.length]);
      }
      setDisplayItems(display);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (step >= totalSteps) {
        setIsSpinning(false);
        const winner = eligible[(offset + 2) % eligible.length];
        setSelectedItem(winner);
        setIsRevealed(true);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        glowOpacity.value = withRepeat(
          withSequence(
            withTiming(0.8, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );

        resultScale.value = withSpring(1, { damping: 12, stiffness: 120 });
        resultOpacity.value = withTiming(1, { duration: 500 });
        return;
      }

      const progress = step / totalSteps;
      const delay = 40 + progress * progress * progress * 350;
      spinTimeoutRef.current = setTimeout(tick, delay);
    }

    tick();
  }, [eligible, isSpinning]);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy < -30 && Math.abs(gestureState.dx) < Math.abs(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50) {
          triggerSpin();
        }
      },
    })
  ).current;

  const toggleList = (status: ListStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLists(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
    setSelectedItem(null);
    setIsRevealed(false);
  };

  const resultAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resultScale.value }],
    opacity: resultOpacity.value,
  }));

  return (
    <LinearGradient colors={[DARK.bg1, DARK.bg2, DARK.bg3]} style={styles.container}>
      <View style={{ paddingTop: Platform.OS === 'web' ? 67 : insets.top }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={DARK.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Spin Picker</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <View style={styles.topButtons}>
        <Pressable
          onPress={() => { setShowFilters(!showFilters); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={styles.topBtnWrapper}
        >
          <LinearGradient
            colors={['#254C42', '#1A3A5C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.topBtn}
          >
            <Ionicons name="options-outline" size={18} color={DARK.accent} />
            <Text style={styles.topBtnText}>I'm Looking For...</Text>
          </LinearGradient>
        </Pressable>
        <Pressable
          onPress={triggerSpin}
          disabled={eligible.length === 0 || isSpinning}
          style={[styles.topBtnWrapper, (eligible.length === 0 || isSpinning) && { opacity: 0.4 }]}
        >
          <LinearGradient
            colors={['#C47955', '#9B4C34']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.topBtn}
          >
            <Ionicons name="flash-outline" size={18} color="#FFF" />
            <Text style={styles.topBtnText}>Custom Spin</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {showFilters && (
        <View style={styles.filterPanel}>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>TYPE</Text>
            <View style={styles.filterRow}>
              {([null, 'movie', 'tv'] as (MediaType | null)[]).map(type => (
                <Pressable
                  key={type || 'all'}
                  onPress={() => { setSelectedType(type); setSelectedItem(null); setIsRevealed(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[styles.filterChip, selectedType === type && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, selectedType === type && styles.filterChipTextActive]}>
                    {type === null ? 'All' : type === 'movie' ? 'Movies' : 'TV Shows'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>FROM</Text>
            <View style={styles.filterRow}>
              {(['want', 'watching'] as ListStatus[]).map(status => (
                <Pressable
                  key={status}
                  onPress={() => toggleList(status)}
                  style={[styles.filterChip, selectedLists.includes(status) && styles.filterChipActive]}
                >
                  <Ionicons
                    name={status === 'want' ? 'bookmark' : 'play-circle'}
                    size={14}
                    color={selectedLists.includes(status) ? '#FFF' : DARK.textSoft}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.filterChipText, selectedLists.includes(status) && styles.filterChipTextActive]}>
                    {status === 'want' ? 'Want' : 'Watching'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>GENRE</Text>
            <View style={[styles.filterRow, { flexWrap: 'wrap' }]}>
              {FILTER_GENRES.map(g => (
                <Pressable
                  key={g.id}
                  onPress={() => { setSelectedGenre(prev => prev === g.id ? null : g.id); setSelectedItem(null); setIsRevealed(false); }}
                  style={[styles.genreChip, selectedGenre === g.id && styles.genreChipActive]}
                >
                  <Text style={[styles.genreChipText, selectedGenre === g.id && styles.genreChipTextActive]}>
                    {g.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Text style={styles.eligibleText}>{eligible.length} eligible title{eligible.length !== 1 ? 's' : ''}</Text>
        </View>
      )}

      <View style={styles.wheelSection} {...panResponder.panHandlers}>
        {eligible.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="film-outline" size={48} color={DARK.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Nothing to Spin</Text>
            <Text style={styles.emptySubtitle}>
              Add movies or shows to your Want or Watching list first
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.pointerContainer}>
              <View style={styles.pointer} />
              <View style={styles.pointerGlow} />
            </View>

            <View style={styles.carouselContainer}>
              <View style={styles.carouselTrack}>
                <CarouselCard item={displayItems[0]} position={-2} isCenter={false} glowOpacity={glowOpacity} isRevealed={false} />
                <CarouselCard item={displayItems[1]} position={-1} isCenter={false} glowOpacity={glowOpacity} isRevealed={false} />
                <CarouselCard item={displayItems[2]} position={0} isCenter={true} glowOpacity={glowOpacity} isRevealed={isRevealed} />
                <CarouselCard item={displayItems[3]} position={1} isCenter={false} glowOpacity={glowOpacity} isRevealed={false} />
                <CarouselCard item={displayItems[4]} position={2} isCenter={false} glowOpacity={glowOpacity} isRevealed={false} />
              </View>
            </View>

            <View style={styles.dotsRow}>
              {Array.from({ length: 9 }).map((_, i) => (
                <GlowDot key={i} index={i} isSpinning={isSpinning} activeIndex={4} />
              ))}
            </View>

            <Text style={styles.swipeHint}>
              {isSpinning ? 'Spinning...' : 'Swipe Up to Spin Again'}
            </Text>
          </>
        )}
      </View>

      {selectedItem && isRevealed && (
        <Animated.View style={[styles.resultPanel, resultAnimStyle]}>
          <Pressable
            onPress={() => router.push({ pathname: '/details/[id]', params: { id: selectedItem.mediaId.toString(), type: selectedItem.mediaType } })}
            style={styles.resultCard}
          >
            <LinearGradient
              colors={['rgba(78,234,173,0.08)', 'rgba(124,58,237,0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.resultCardInner}
            >
              {selectedItem.posterPath ? (
                <Image source={{ uri: getPosterUrl(selectedItem.posterPath, 'w185')! }} style={styles.resultPoster} contentFit="cover" />
              ) : (
                <View style={[styles.resultPoster, styles.resultPosterEmpty]}>
                  <Ionicons name="film-outline" size={20} color={DARK.textMuted} />
                </View>
              )}
              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={1}>{selectedItem.title}</Text>
                <Text style={styles.resultMeta}>
                  {selectedItem.mediaType === 'tv' ? 'TV Series' : 'Movie'}
                  {selectedItem.genreIds.length > 0 ? ` \u00B7 ${getGenreName(selectedItem.genreIds[0])}` : ''}
                </Text>
                <View style={styles.resultRating}>
                  <Ionicons name="star" size={12} color={DARK.star} />
                  <Text style={styles.resultRatingText}>{selectedItem.voteAverage.toFixed(1)}</Text>
                </View>
              </View>
              <View style={styles.resultArrow}>
                <Ionicons name="arrow-forward" size={18} color={DARK.accent} />
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      )}

      <View style={[styles.footer, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 12 }]}>
        <Pressable
          onPress={triggerSpin}
          disabled={eligible.length === 0 || isSpinning}
          style={({ pressed }) => [
            styles.spinBtnWrapper,
            (eligible.length === 0 || isSpinning) && { opacity: 0.4 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <LinearGradient
            colors={isSpinning ? ['#6B21A8', '#7C3AED'] : ['#254C42', '#1A5C3A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.spinBtn}
          >
            <Ionicons name={isSpinning ? 'sync' : 'shuffle'} size={22} color="#FFF" />
            <Text style={styles.spinBtnText}>
              {isSpinning ? 'Spinning...' : selectedItem ? 'Spin Again' : 'Spin the Wheel'}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: DARK.glass,
    borderWidth: 1,
    borderColor: DARK.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: DARK.text,
    letterSpacing: 0.5,
  },
  topButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 4,
  },
  topBtnWrapper: {
    flex: 1,
  },
  topBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  topBtnText: {
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    color: '#FFFFFF',
  },
  filterPanel: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: DARK.glass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DARK.glassBorder,
    padding: 14,
  },
  filterSection: {
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 10,
    fontFamily: 'DMSans_700Bold',
    color: DARK.textMuted,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(78,234,173,0.2)',
    borderColor: 'rgba(78,234,173,0.4)',
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: DARK.textSoft,
  },
  filterChipTextActive: {
    color: DARK.accent,
  },
  genreChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginRight: 6,
    marginBottom: 6,
  },
  genreChipActive: {
    backgroundColor: 'rgba(124,58,237,0.25)',
    borderColor: 'rgba(124,58,237,0.5)',
  },
  genreChipText: {
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
    color: DARK.textSoft,
  },
  genreChipTextActive: {
    color: '#C4B5FD',
  },
  eligibleText: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: DARK.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  wheelSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  pointerContainer: {
    alignItems: 'center',
    marginBottom: 8,
    zIndex: 20,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: DARK.accent,
  },
  pointerGlow: {
    position: 'absolute',
    top: -4,
    width: 30,
    height: 20,
    borderRadius: 10,
    backgroundColor: DARK.accentGlow,
  },
  carouselContainer: {
    width: SCREEN_WIDTH,
    height: CENTER_CARD_H + 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  carouselTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: CENTER_CARD_H + 20,
  },
  carouselSlot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DARK.cardBorder,
    backgroundColor: DARK.card,
  },
  cardImage: {
    borderRadius: 14,
  },
  cardPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DARK.card,
  },
  cardGlow: {
    position: 'absolute',
    top: -15,
    left: -15,
    right: -15,
    bottom: -15,
    borderRadius: 24,
    backgroundColor: DARK.accentGlow,
    zIndex: -1,
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  glowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DARK.dot,
  },
  glowDotActive: {
    backgroundColor: DARK.dotActive,
  },
  swipeHint: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: DARK.textMuted,
    textAlign: 'center',
    marginTop: 14,
    letterSpacing: 0.3,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: DARK.glass,
    borderWidth: 1,
    borderColor: DARK.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
    color: DARK.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: DARK.textSoft,
    textAlign: 'center',
    lineHeight: 20,
  },
  resultPanel: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  resultCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(78,234,173,0.2)',
  },
  resultCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  resultPoster: {
    width: 50,
    height: 75,
    borderRadius: 10,
  },
  resultPosterEmpty: {
    backgroundColor: DARK.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultTitle: {
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
    color: DARK.text,
  },
  resultMeta: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: DARK.textSoft,
    marginTop: 3,
  },
  resultRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  resultRatingText: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    color: DARK.star,
  },
  resultArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(78,234,173,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  spinBtnWrapper: {},
  spinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  spinBtnText: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
