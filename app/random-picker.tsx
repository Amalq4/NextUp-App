import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { GenreChip } from '@/components/GenreChip';
import { ListEntry, ListStatus, GENRES, getGenreName, getPosterUrl, MediaType } from '@/types/media';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FILTER_GENRES = GENRES.filter(g =>
  [28, 35, 18, 27, 878, 10749, 53, 16].includes(g.id)
);

export default function RandomPickerScreen() {
  const insets = useSafeAreaInsets();
  const { lists } = useApp();
  const [selectedLists, setSelectedLists] = useState<ListStatus[]>(['want', 'watching']);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<MediaType | null>(null);
  const [pickedItem, setPickedItem] = useState<ListEntry | null>(null);

  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  const toggleList = (status: ListStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLists(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const getEligibleItems = useCallback(() => {
    let items = lists.filter(e => selectedLists.includes(e.status));
    if (selectedGenre) items = items.filter(e => e.genreIds.includes(selectedGenre));
    if (selectedType) items = items.filter(e => e.mediaType === selectedType);
    return items;
  }, [lists, selectedLists, selectedGenre, selectedType]);

  const pickRandom = () => {
    const eligible = getEligibleItems();
    if (eligible.length === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    scale.value = withSequence(
      withTiming(0.8, { duration: 100 }),
      withSpring(1.1, { damping: 8 }),
      withSpring(1, { damping: 12 }),
    );
    rotation.value = withSequence(
      withTiming(-5, { duration: 50 }),
      withTiming(5, { duration: 100 }),
      withTiming(0, { duration: 100 }),
    );

    const randomIndex = Math.floor(Math.random() * eligible.length);
    setPickedItem(eligible[randomIndex]);
  };

  const eligible = getEligibleItems();

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Random Picker</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Pick from</Text>
        <View style={styles.listFilters}>
          {(['want', 'watching'] as ListStatus[]).map(status => (
            <Pressable
              key={status}
              onPress={() => toggleList(status)}
              style={[styles.listChip, selectedLists.includes(status) && styles.listChipActive]}
            >
              <Ionicons
                name={status === 'want' ? 'bookmark' : 'play-circle'}
                size={16}
                color={selectedLists.includes(status) ? '#fff' : Colors.light.textSecondary}
              />
              <Text style={[styles.listChipText, selectedLists.includes(status) && styles.listChipTextActive]}>
                {status === 'want' ? 'Want' : 'Watching'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Type</Text>
        <View style={styles.listFilters}>
          {[null, 'movie', 'tv'].map(type => (
            <Pressable
              key={type || 'all'}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedType(type as MediaType | null); }}
              style={[styles.listChip, selectedType === type && styles.listChipActive]}
            >
              <Text style={[styles.listChipText, selectedType === type && styles.listChipTextActive]}>
                {type === null ? 'All' : type === 'movie' ? 'Movies' : 'TV'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Genre (optional)</Text>
        <View style={styles.genreRow}>
          {FILTER_GENRES.map(g => (
            <GenreChip
              key={g.id}
              label={g.name}
              selected={selectedGenre === g.id}
              compact
              onPress={() => setSelectedGenre(prev => prev === g.id ? null : g.id)}
            />
          ))}
        </View>

        <Text style={styles.eligibleText}>{eligible.length} eligible title{eligible.length !== 1 ? 's' : ''}</Text>

        {pickedItem && (
          <Animated.View style={[styles.resultCard, animStyle]}>
            <Pressable
              onPress={() => router.push({ pathname: '/details/[id]', params: { id: pickedItem.mediaId.toString(), type: pickedItem.mediaType } })}
              style={styles.resultInner}
            >
              {pickedItem.posterPath ? (
                <Image source={{ uri: getPosterUrl(pickedItem.posterPath, 'w342')! }} style={styles.resultPoster} contentFit="cover" />
              ) : (
                <View style={[styles.resultPoster, { backgroundColor: Colors.light.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="film-outline" size={24} color={Colors.light.textTertiary} />
                </View>
              )}
              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle}>{pickedItem.title}</Text>
                <Text style={styles.resultMeta}>
                  {pickedItem.mediaType === 'tv' ? 'TV Series' : 'Movie'}
                  {pickedItem.genreIds.length > 0 ? ` \u00B7 ${getGenreName(pickedItem.genreIds[0])}` : ''}
                </Text>
                <View style={styles.resultRating}>
                  <Ionicons name="star" size={12} color={Colors.light.star} />
                  <Text style={styles.resultRatingText}>{pickedItem.voteAverage.toFixed(1)}</Text>
                </View>
              </View>
              <Ionicons name="arrow-forward" size={20} color={Colors.light.textTertiary} />
            </Pressable>
          </Animated.View>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 10 }]}>
        <Pressable
          onPress={pickRandom}
          disabled={eligible.length === 0}
          style={({ pressed }) => [
            styles.pickBtn,
            eligible.length === 0 && { opacity: 0.4 },
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Ionicons name="shuffle" size={22} color="#fff" />
          <Text style={styles.pickBtnText}>
            {pickedItem ? 'Pick Again' : 'Pick Random'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.light.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.light.textSecondary,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  listChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  listChipActive: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
  },
  listChipText: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: Colors.light.text,
  },
  listChipTextActive: {
    color: '#fff',
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  eligibleText: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: Colors.light.textTertiary,
    marginTop: 16,
    textAlign: 'center',
  },
  resultCard: {
    marginTop: 20,
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: 'hidden',
  },
  resultInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  resultPoster: {
    width: 60,
    height: 90,
    borderRadius: 10,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 14,
  },
  resultTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: Colors.light.text,
  },
  resultMeta: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  resultRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  resultRatingText: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.light.star,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.light.warm,
    borderRadius: 14,
    paddingVertical: 16,
  },
  pickBtnText: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: '#fff',
  },
});
