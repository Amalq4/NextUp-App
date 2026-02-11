import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { MediaItem, ListStatus, mapTmdbToMediaItem, getBackdropUrl, getPosterUrl, getGenreName, TmdbMovie } from '@/types/media';
import { getApiUrl } from '@/lib/query-client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STATUS_CONFIG: { key: ListStatus; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'want', label: 'Want', icon: 'bookmark', color: Colors.light.warm },
  { key: 'watching', label: 'Watching', icon: 'play-circle', color: Colors.light.accent },
  { key: 'watched', label: 'Watched', icon: 'checkmark-circle', color: Colors.light.success },
];

export default function DetailsScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();
  const insets = useSafeAreaInsets();
  const { getListEntry, addToList, removeFromList } = useApp();
  const [item, setItem] = useState<MediaItem | null>(null);
  const [details, setDetails] = useState<TmdbMovie | null>(null);
  const [loading, setLoading] = useState(true);

  const listEntry = item ? getListEntry(item.id) : undefined;

  useEffect(() => {
    fetchDetails();
  }, [id, type]);

  const fetchDetails = async () => {
    try {
      const baseUrl = getApiUrl();
      const endpoint = type === 'tv' ? 'tv' : 'movie';
      const res = await fetch(`${baseUrl}api/tmdb/${endpoint}/${id}`);
      const data = await res.json();
      setDetails(data);
      setItem(mapTmdbToMediaItem(data, type as any));
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleStatusPress = (status: ListStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!item) return;
    if (listEntry?.status === status) {
      removeFromList(item.id);
    } else {
      addToList({
        mediaId: item.id,
        mediaType: item.mediaType,
        status,
        addedAt: new Date().toISOString(),
        title: item.title,
        posterPath: item.posterPath,
        voteAverage: item.voteAverage,
        genreIds: item.genreIds,
      });
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Could not load details</Text>
      </View>
    );
  }

  const backdropUri = getBackdropUrl(item.backdropPath, 'w1280');
  const posterUri = getPosterUrl(item.posterPath, 'w500');

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 20 }}
      >
        <View style={styles.heroContainer}>
          {backdropUri ? (
            <Image source={{ uri: backdropUri }} style={styles.backdrop} contentFit="cover" transition={300} />
          ) : (
            <View style={[styles.backdrop, { backgroundColor: Colors.light.surfaceSecondary }]} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(243,232,222,0.6)', Colors.light.background]}
            style={styles.gradient}
          />
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { top: Platform.OS === 'web' ? 67 : insets.top + 8 }]}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.posterRow}>
            {posterUri ? (
              <Image source={{ uri: posterUri }} style={styles.poster} contentFit="cover" transition={200} />
            ) : (
              <View style={[styles.poster, styles.posterPlaceholder]}>
                <Ionicons name="film-outline" size={32} color={Colors.light.textTertiary} />
              </View>
            )}
            <View style={styles.titleArea}>
              <Text style={styles.title}>{item.title}</Text>
              <View style={styles.metaRow}>
                {item.releaseDate ? (
                  <Text style={styles.metaText}>{new Date(item.releaseDate).getFullYear()}</Text>
                ) : null}
                <View style={styles.ratingChip}>
                  <Ionicons name="star" size={12} color={Colors.light.star} />
                  <Text style={styles.ratingText}>{item.voteAverage.toFixed(1)}</Text>
                </View>
                <View style={styles.typeChip}>
                  <Text style={styles.typeText}>{item.mediaType === 'tv' ? 'TV Series' : 'Movie'}</Text>
                </View>
              </View>
              {details?.number_of_seasons && (
                <Text style={styles.seasonsText}>{details.number_of_seasons} Season{details.number_of_seasons > 1 ? 's' : ''}</Text>
              )}
            </View>
          </View>

          <View style={styles.statusButtons}>
            {STATUS_CONFIG.map(s => {
              const isActive = listEntry?.status === s.key;
              return (
                <Pressable
                  key={s.key}
                  onPress={() => handleStatusPress(s.key)}
                  style={[
                    styles.statusBtn,
                    isActive && { backgroundColor: s.color, borderColor: s.color },
                  ]}
                >
                  <Ionicons name={s.icon} size={18} color={isActive ? '#fff' : s.color} />
                  <Text style={[styles.statusBtnText, isActive && { color: '#fff' }]}>{s.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {item.mediaType === 'tv' && listEntry && (
            <Pressable
              onPress={() => router.push({ pathname: '/progress/[id]', params: { id: item.id.toString() } })}
              style={({ pressed }) => [styles.progressBtn, { opacity: pressed ? 0.9 : 1 }]}
            >
              <Ionicons name="layers" size={18} color="#fff" />
              <Text style={styles.progressBtnText}>Track Progress</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </Pressable>
          )}

          <View style={styles.genreRow}>
            {item.genreIds.map(gid => (
              <View key={gid} style={styles.genreTag}>
                <Text style={styles.genreTagText}>{getGenreName(gid)}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.overview}>{item.overview || 'No overview available.'}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: Colors.light.textSecondary,
  },
  heroContainer: {
    width: SCREEN_WIDTH,
    height: 260,
    position: 'relative',
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginTop: -40,
  },
  posterRow: {
    flexDirection: 'row',
    gap: 16,
  },
  poster: {
    width: 110,
    height: 165,
    borderRadius: 14,
    overflow: 'hidden',
  },
  posterPlaceholder: {
    backgroundColor: Colors.light.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  title: {
    fontSize: 22,
    fontFamily: 'DMSans_700Bold',
    color: Colors.light.text,
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: Colors.light.textSecondary,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251,191,36,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.light.star,
  },
  typeChip: {
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: '#fff',
  },
  seasonsText: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: Colors.light.accent,
    marginTop: 4,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  statusBtnText: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.light.text,
  },
  progressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: Colors.light.accent,
    marginTop: 10,
  },
  progressBtnText: {
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    color: '#fff',
    flex: 1,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 20,
  },
  genreTag: {
    backgroundColor: Colors.light.surfaceTertiary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  genreTagText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: Colors.light.textSecondary,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'DMSans_700Bold',
    color: Colors.light.text,
    marginTop: 24,
    marginBottom: 8,
  },
  overview: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: Colors.light.textSecondary,
    lineHeight: 22,
  },
});
