import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  Dimensions,
  PanResponder,
  ScrollView,
  TextInput,
  FlatList,
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
} from 'react-native-reanimated';
import { useApp } from '@/context/AppContext';
import Colors from '@/theme/colors';
import { ListEntry, ListStatus, MediaType, GENRES, getGenreName, getPosterUrl } from '@/types/media';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = Math.min(110, SCREEN_WIDTH * 0.26);
const CARD_H = CARD_W * 1.5;
const CENTER_CARD_W = Math.min(140, SCREEN_WIDTH * 0.34);
const CENTER_CARD_H = CENTER_CARD_W * 1.5;
const CARD_GAP = 8;
const GRID_COL_W = (SCREEN_WIDTH - 32 - 24) / 3;
const GRID_CARD_H = GRID_COL_W * 1.5;

const FILTER_GENRES = GENRES.filter(g =>
  [28, 35, 18, 27, 878, 10749, 53, 16].includes(g.id)
);

type SpinMode = 'guided' | 'custom';

interface CarouselCardProps {
  item: ListEntry | null;
  position: number;
  isCenter: boolean;
  glowOpacity: ReturnType<typeof useSharedValue<number>>;
  isRevealed: boolean;
}

function CarouselCard({ item, position, isCenter, glowOpacity, isRevealed }: CarouselCardProps) {
  const animatedGlow = useAnimatedStyle(() => {
    if (!isCenter || !isRevealed) return { opacity: 0 };
    return { opacity: glowOpacity.value };
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
        { transform: [{ translateX }, { scale }, { perspective: 800 }, { rotateY }], opacity, zIndex },
      ]}
    >
      {isCenter && isRevealed && (
        <Animated.View style={[styles.cardGlow, animatedGlow]} />
      )}
      <View style={[styles.carouselCard, { width: cardWidth, height: cardHeight }]}>
        {item?.posterPath ? (
          <Image source={{ uri: getPosterUrl(item.posterPath, 'w342')! }} style={[styles.cardImage, { width: cardWidth, height: cardHeight }]} contentFit="cover" />
        ) : (
          <View style={[styles.cardPlaceholder, { width: cardWidth, height: cardHeight }]}>
            <Ionicons name="film-outline" size={isCenter ? 32 : 24} color={Colors.textMuted} />
          </View>
        )}
        {isCenter && isRevealed && (
          <View style={[styles.cardOverlay, { backgroundColor: Colors.overlay }]}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item?.title}</Text>
          </View>
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
    <Animated.View style={[styles.glowDot, index === activeIndex && !isSpinning && styles.glowDotActive, animStyle]} />
  );
}

function SelectableCard({
  item,
  isSelected,
  onToggle,
}: {
  item: ListEntry;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const posterUri = getPosterUrl(item.posterPath, 'w185');

  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggle(); }}
      style={({ pressed }) => [
        styles.selectCard,
        isSelected && styles.selectCardActive,
        { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
      ]}
    >
      {posterUri ? (
        <Image source={{ uri: posterUri }} style={styles.selectImage} contentFit="cover" />
      ) : (
        <View style={styles.selectPlaceholder}>
          <Ionicons name="film-outline" size={20} color={Colors.textMuted} />
        </View>
      )}
      {isSelected && (
        <View style={styles.selectCheck}>
          <Ionicons name="checkmark-circle" size={22} color={Colors.accent} />
        </View>
      )}
      <Text style={styles.selectTitle} numberOfLines={2}>{item.title}</Text>
    </Pressable>
  );
}

export default function SpinPickerScreen() {
  const insets = useSafeAreaInsets();
  const { lists } = useApp();

  const [mode, setMode] = useState<SpinMode>('guided');
  const [selectedLists, setSelectedLists] = useState<ListStatus[]>(['want', 'watching']);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<MediaType | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayItems, setDisplayItems] = useState<(ListEntry | null)[]>([null, null, null, null, null]);
  const [selectedItem, setSelectedItem] = useState<ListEntry | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [customSearch, setCustomSearch] = useState('');
  const [customSelected, setCustomSelected] = useState<Set<number>>(new Set());

  const segIndicator = useSharedValue(0);

  const glowOpacity = useSharedValue(0);
  const resultScale = useSharedValue(0);
  const resultOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(1);

  const allItems = useMemo(() => lists.filter(e => e.status === 'want' || e.status === 'watching' || e.status === 'watched'), [lists]);

  const customFilteredItems = useMemo(() => {
    if (!customSearch.trim()) return allItems;
    const q = customSearch.toLowerCase();
    return allItems.filter(e => e.title.toLowerCase().includes(q));
  }, [allItems, customSearch]);

  const getGuidedEligible = useCallback(() => {
    let items = lists.filter(e => selectedLists.includes(e.status));
    if (selectedGenre) items = items.filter(e => e.genreIds.includes(selectedGenre));
    if (selectedType) items = items.filter(e => e.mediaType === selectedType);
    return items;
  }, [lists, selectedLists, selectedGenre, selectedType]);

  const guidedEligible = getGuidedEligible();
  const customEligible = useMemo(() => allItems.filter(e => customSelected.has(e.mediaId)), [allItems, customSelected]);
  const eligible = mode === 'guided' ? guidedEligible : customEligible;

  useEffect(() => {
    if (eligible.length > 0 && !isSpinning && !selectedItem) {
      const initial: (ListEntry | null)[] = [];
      for (let i = 0; i < 5; i++) {
        initial.push(eligible[i % eligible.length]);
      }
      setDisplayItems(initial);
    }
  }, [eligible.length, mode]);

  const switchMode = useCallback((newMode: SpinMode) => {
    if (newMode === mode || isSpinning) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    contentOpacity.value = withSequence(
      withTiming(0, { duration: 150 }),
      withTiming(1, { duration: 250 })
    );

    segIndicator.value = withTiming(newMode === 'custom' ? 1 : 0, { duration: 300, easing: Easing.bezier(0.4, 0, 0.2, 1) });

    setSelectedItem(null);
    setIsRevealed(false);
    glowOpacity.value = 0;
    resultScale.value = 0;
    resultOpacity.value = 0;
    setMode(newMode);
  }, [mode, isSpinning]);

  const segSlideStyle = useAnimatedStyle(() => ({
    left: interpolate(segIndicator.value, [0, 1], [2, SCREEN_WIDTH / 2 - 16 + 2]),
    width: (SCREEN_WIDTH - 32) / 2 - 4,
  }));

  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

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
    return () => { if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current); };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy < -30 && Math.abs(gs.dx) < Math.abs(gs.dy),
      onPanResponderRelease: (_, gs) => { if (gs.dy < -50) triggerSpin(); },
    })
  ).current;

  const toggleList = (status: ListStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLists(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
    setSelectedItem(null);
    setIsRevealed(false);
  };

  const toggleCustomItem = useCallback((mediaId: number) => {
    setCustomSelected(prev => {
      const next = new Set(prev);
      if (next.has(mediaId)) next.delete(mediaId); else next.add(mediaId);
      return next;
    });
  }, []);

  const selectAllCustom = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCustomSelected(new Set(customFilteredItems.map(e => e.mediaId)));
  }, [customFilteredItems]);

  const deselectAllCustom = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCustomSelected(new Set());
  }, []);

  const resultAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resultScale.value }],
    opacity: resultOpacity.value,
  }));

  const spinDisabled = eligible.length === 0 || isSpinning;

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={{ paddingTop: Platform.OS === 'web' ? 67 : insets.top }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Spin Picker</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.segContainer}>
          <Animated.View style={[styles.segIndicator, segSlideStyle]}>
            <View style={[styles.segIndicatorGrad, { backgroundColor: Colors.gold }]} />
          </Animated.View>
          <Pressable onPress={() => switchMode('guided')} style={styles.segBtn}>
            <Ionicons name="options-outline" size={16} color={mode === 'guided' ? Colors.black : Colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.segText, mode === 'guided' && styles.segTextActive]}>I'm Looking For...</Text>
          </Pressable>
          <Pressable onPress={() => switchMode('custom')} style={styles.segBtn}>
            <Ionicons name="grid-outline" size={16} color={mode === 'custom' ? Colors.black : Colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.segText, mode === 'custom' && styles.segTextActive]}>Custom Spin</Text>
          </Pressable>
        </View>
      </View>

      <Animated.View style={[{ flex: 1 }, contentAnimStyle]}>
        {mode === 'guided' ? (
          <ScrollView
            style={styles.modeContent}
            contentContainerStyle={{ paddingBottom: 10 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.filterPanel}>
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>CONTENT TYPE</Text>
                <View style={styles.filterRow}>
                  {([null, 'movie', 'tv'] as (MediaType | null)[]).map(type => (
                    <Pressable
                      key={type || 'all'}
                      onPress={() => { setSelectedType(type); setSelectedItem(null); setIsRevealed(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={[styles.filterChip, selectedType === type && styles.filterChipActive]}
                    >
                      <Text style={[styles.filterChipText, selectedType === type && styles.filterChipTextActive]}>
                        {type === null ? 'Both' : type === 'movie' ? 'Movie' : 'Series'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>FROM LIST</Text>
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
                        color={selectedLists.includes(status) ? Colors.text : Colors.textSecondary}
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

              <Text style={styles.eligibleText}>{guidedEligible.length} eligible title{guidedEligible.length !== 1 ? 's' : ''}</Text>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.modeContent}>
            <View style={styles.customHeader}>
              <View style={styles.customSearchBar}>
                <Ionicons name="search" size={16} color={Colors.textMuted} />
                <TextInput
                  style={styles.customSearchInput}
                  placeholder="Search your titles..."
                  placeholderTextColor={Colors.textMuted}
                  value={customSearch}
                  onChangeText={setCustomSearch}
                  selectionColor={Colors.accent}
                />
                {customSearch.length > 0 && (
                  <Pressable onPress={() => setCustomSearch('')} hitSlop={10}>
                    <Ionicons name="close-circle" size={16} color={Colors.textSecondary} />
                  </Pressable>
                )}
              </View>

              <View style={styles.customActions}>
                <Pressable onPress={selectAllCustom} style={styles.customActBtn}>
                  <Ionicons name="checkmark-done" size={14} color={Colors.accent} />
                  <Text style={styles.customActText}>Select All</Text>
                </Pressable>
                <Pressable onPress={deselectAllCustom} style={styles.customActBtn}>
                  <Ionicons name="close" size={14} color={Colors.textSecondary} />
                  <Text style={[styles.customActText, { color: Colors.textSecondary }]}>Deselect All</Text>
                </Pressable>
                <Text style={styles.customCount}>{customSelected.size} selected</Text>
              </View>
            </View>

            <FlatList
              data={customFilteredItems}
              numColumns={3}
              keyExtractor={item => `cs-${item.mediaId}`}
              contentContainerStyle={styles.customGrid}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <SelectableCard
                  item={item}
                  isSelected={customSelected.has(item.mediaId)}
                  onToggle={() => toggleCustomItem(item.mediaId)}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="film-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>No titles in your lists</Text>
                  <Text style={styles.emptySubtitle}>Add movies or shows first to use custom spin</Text>
                </View>
              }
            />
          </View>
        )}

        <View style={styles.wheelSection} {...panResponder.panHandlers}>
          {eligible.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="film-outline" size={44} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Nothing to Spin</Text>
              <Text style={styles.emptySubtitle}>{mode === 'custom' ? 'Select titles above first' : 'Add movies or shows to your list first'}</Text>
            </View>
          ) : (
            <>
              <View style={styles.pointerContainer}>
                <View style={styles.pointer} />
                <View style={styles.pointerGlow} />
              </View>
              <View style={styles.carouselContainer}>
                <View style={styles.carouselTrack}>
                  {[0, 1, 2, 3, 4].map(i => (
                    <CarouselCard
                      key={i}
                      item={displayItems[i]}
                      position={i - 2}
                      isCenter={i === 2}
                      glowOpacity={glowOpacity}
                      isRevealed={isRevealed && i === 2}
                    />
                  ))}
                </View>
              </View>
              <View style={styles.dotsRow}>
                {Array.from({ length: 9 }).map((_, i) => (
                  <GlowDot key={i} index={i} isSpinning={isSpinning} activeIndex={4} />
                ))}
              </View>
              <Text style={styles.swipeHint}>
                {isSpinning ? 'Spinning...' : 'Swipe Up to Spin'}
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
              <View style={[styles.resultCardInner, { backgroundColor: Colors.accentSoft }]}>
                {selectedItem.posterPath ? (
                  <Image source={{ uri: getPosterUrl(selectedItem.posterPath, 'w185')! }} style={styles.resultPoster} contentFit="cover" />
                ) : (
                  <View style={[styles.resultPoster, styles.resultPosterEmpty]}>
                    <Ionicons name="film-outline" size={20} color={Colors.textMuted} />
                  </View>
                )}
                <View style={styles.resultInfo}>
                  <Text style={styles.resultTitle} numberOfLines={1}>{selectedItem.title}</Text>
                  <Text style={styles.resultMeta}>
                    {selectedItem.mediaType === 'tv' ? 'TV Series' : 'Movie'}
                    {selectedItem.genreIds.length > 0 ? ` \u00B7 ${getGenreName(selectedItem.genreIds[0])}` : ''}
                  </Text>
                  <View style={styles.resultRating}>
                    <Ionicons name="star" size={12} color={Colors.star} />
                    <Text style={styles.resultRatingText}>{selectedItem.voteAverage.toFixed(1)}</Text>
                  </View>
                </View>
                <View style={styles.resultArrow}>
                  <Ionicons name="arrow-forward" size={18} color={Colors.accent} />
                </View>
              </View>
            </Pressable>
          </Animated.View>
        )}
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 12 }]}>
        <Pressable
          onPress={triggerSpin}
          disabled={spinDisabled}
          style={({ pressed }) => [
            styles.spinBtnWrapper,
            spinDisabled && { opacity: 0.4 },
            pressed && !spinDisabled && { opacity: 0.85 },
          ]}
        >
          <View style={[styles.spinBtn, { backgroundColor: isSpinning ? Colors.surface : Colors.gold }]}>
            <Ionicons name={isSpinning ? 'sync' : 'shuffle'} size={22} color={isSpinning ? Colors.text : Colors.black} />
            <Text style={[styles.spinBtnText, { color: isSpinning ? Colors.text : Colors.black }]}>
              {isSpinning ? 'Spinning...' : selectedItem ? 'Spin Again' : 'Spin the Wheel'}
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
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
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
    letterSpacing: 0.5,
  },
  segContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    height: 48,
    position: 'relative',
    overflow: 'hidden',
  },
  segIndicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  segIndicatorGrad: {
    flex: 1,
    borderRadius: 14,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segText: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: Colors.textSecondary,
  },
  segTextActive: {
    fontFamily: 'DMSans_700Bold',
    color: Colors.black,
  },
  modeContent: {
    flex: 1,
  },
  filterPanel: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: Colors.glass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 14,
  },
  filterSection: {
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 10,
    fontFamily: 'DMSans_700Bold',
    color: Colors.textMuted,
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  filterChipActive: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accentBorder,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.accent,
  },
  genreChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginRight: 6,
    marginBottom: 6,
  },
  genreChipActive: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accentBorder,
  },
  genreChipText: {
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
    color: Colors.textSecondary,
  },
  genreChipTextActive: {
    color: Colors.slateGray,
  },
  eligibleText: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  wheelSection: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 16,
    minHeight: CENTER_CARD_H + 100,
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
    borderTopColor: Colors.accent,
  },
  pointerGlow: {
    position: 'absolute',
    top: -4,
    width: 30,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.accentBorder,
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cardImage: {
    borderRadius: 14,
  },
  cardPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  cardGlow: {
    position: 'absolute',
    width: CENTER_CARD_W + 30,
    height: CENTER_CARD_H + 30,
    borderRadius: 22,
    backgroundColor: Colors.accentBorder,
    zIndex: -1,
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    paddingTop: 30,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  glowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.glassBorder,
  },
  glowDotActive: {
    backgroundColor: Colors.accent,
  },
  swipeHint: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
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
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  resultPanel: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  resultCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  resultCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 12,
  },
  resultPoster: {
    width: 44,
    height: 66,
    borderRadius: 8,
  },
  resultPosterEmpty: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
    gap: 3,
  },
  resultTitle: {
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
  },
  resultMeta: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textSecondary,
  },
  resultRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultRatingText: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.star,
  },
  resultArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customHeader: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  customSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glass,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  customSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: Colors.text,
    padding: 0,
  },
  customActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  customActBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customActText: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.accent,
  },
  customCount: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
    textAlign: 'right',
  },
  customGrid: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 120,
  },
  selectCard: {
    width: GRID_COL_W,
    marginRight: 8,
    marginBottom: 12,
  },
  selectCardActive: {
    opacity: 1,
  },
  selectImage: {
    width: GRID_COL_W,
    height: GRID_CARD_H,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectPlaceholder: {
    width: GRID_COL_W,
    height: GRID_CARD_H,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: Colors.overlay,
    borderRadius: 12,
  },
  selectTitle: {
    fontSize: 10,
    fontFamily: 'DMSans_500Medium',
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 14,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  spinBtnWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  spinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  spinBtnText: {
    fontSize: 17,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
  },
});
