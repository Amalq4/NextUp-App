import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AppBackground from '@/components/AppBackground';
import Colors from '@/theme/colors';
import { useApp } from '@/context/AppContext';
import { TmdbTvDetails, TmdbSeasonDetails, getPosterUrl, ProgressEntry } from '@/types/media';
import { getApiUrl } from '@/lib/query-client';

export default function ProgressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { getProgress, updateProgress } = useApp();
  const [tvDetails, setTvDetails] = useState<TmdbTvDetails | null>(null);
  const [seasonDetails, setSeasonDetails] = useState<TmdbSeasonDetails | null>(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingSeason, setLoadingSeason] = useState(false);

  const currentProgress = getProgress(Number(id));

  useEffect(() => {
    fetchTvDetails();
  }, [id]);

  useEffect(() => {
    if (tvDetails) fetchSeasonDetails(selectedSeason);
  }, [selectedSeason, tvDetails]);

  const fetchTvDetails = async () => {
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/tmdb/tv/${id}`);
      const data = await res.json();
      setTvDetails(data);
      if (currentProgress) {
        setSelectedSeason(currentProgress.seasonNumber);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const fetchSeasonDetails = async (seasonNum: number) => {
    setLoadingSeason(true);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/tmdb/tv/${id}/season/${seasonNum}`);
      const data = await res.json();
      setSeasonDetails(data);
    } catch {} finally {
      setLoadingSeason(false);
    }
  };

  const handleEpisodePress = async (seasonNum: number, episodeNum: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const entry: ProgressEntry = {
      mediaId: Number(id),
      seasonNumber: seasonNum,
      episodeNumber: episodeNum,
      updatedAt: new Date().toISOString(),
      isCompleted: false,
    };
    await updateProgress(entry);
  };

  const seasons = useMemo(() => {
    if (!tvDetails?.seasons) return [];
    return tvDetails.seasons.filter(s => s.season_number > 0);
  }, [tvDetails]);

  if (loading) {
    return (
      <AppBackground>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      </AppBackground>
    );
  }

  if (!tvDetails) {
    return (
      <AppBackground>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <Text style={styles.errorText}>Could not load show details</Text>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>Progress</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.showInfo}>
          {tvDetails.poster_path ? (
            <Image source={{ uri: getPosterUrl(tvDetails.poster_path, 'w185')! }} style={styles.miniPoster} contentFit="cover" />
          ) : null}
          <View style={styles.showTextInfo}>
            <Text style={styles.showTitle} numberOfLines={2}>{tvDetails.name}</Text>
            <Text style={styles.showMeta}>
              {tvDetails.number_of_seasons} Season{tvDetails.number_of_seasons > 1 ? 's' : ''}
            </Text>
            {currentProgress && (
              <View style={styles.currentProgressRow}>
                <Ionicons name="play-circle" size={16} color={Colors.accent} />
                <Text style={styles.currentProgressText}>
                  S{currentProgress.seasonNumber} E{currentProgress.episodeNumber}
                </Text>
              </View>
            )}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seasonScroll} contentContainerStyle={styles.seasonScrollContent}>
          {seasons.map(season => (
            <Pressable
              key={season.season_number}
              onPress={() => setSelectedSeason(season.season_number)}
              style={[styles.seasonChip, selectedSeason === season.season_number && styles.seasonChipActive]}
            >
              <Text style={[styles.seasonChipText, selectedSeason === season.season_number && styles.seasonChipTextActive]}>
                S{season.season_number}
              </Text>
              <Text style={[styles.seasonEpCount, selectedSeason === season.season_number && styles.seasonChipTextActive]}>
                {season.episode_count} ep
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView
          style={styles.episodesList}
          contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {loadingSeason ? (
            <ActivityIndicator size="small" color={Colors.accent} style={{ marginTop: 30 }} />
          ) : seasonDetails?.episodes ? (
            seasonDetails.episodes.map(ep => {
              const isCurrent = currentProgress?.seasonNumber === selectedSeason && currentProgress?.episodeNumber === ep.episode_number;
              const isWatched = currentProgress
                ? (currentProgress.seasonNumber > selectedSeason) ||
                  (currentProgress.seasonNumber === selectedSeason && currentProgress.episodeNumber >= ep.episode_number)
                : false;

              return (
                <Pressable
                  key={ep.episode_number}
                  onPress={() => handleEpisodePress(selectedSeason, ep.episode_number)}
                  style={[styles.episodeCard, isCurrent && styles.episodeCardCurrent]}
                >
                  <View style={[styles.epNumber, isWatched && styles.epNumberWatched]}>
                    {isWatched ? (
                      <Ionicons name="checkmark" size={14} color={Colors.text} />
                    ) : (
                      <Text style={styles.epNumberText}>{ep.episode_number}</Text>
                    )}
                  </View>
                  <View style={styles.epInfo}>
                    <Text style={styles.epTitle} numberOfLines={1}>{ep.name}</Text>
                    {ep.air_date && (
                      <Text style={styles.epDate}>{new Date(ep.air_date).toLocaleDateString()}</Text>
                    )}
                  </View>
                  {isCurrent && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Current</Text>
                    </View>
                  )}
                </Pressable>
              );
            })
          ) : (
            <Text style={styles.noEpisodes}>No episode data available</Text>
          )}
        </ScrollView>
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
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
    backgroundColor: Colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.text,
  },
  showInfo: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 14,
    marginTop: 6,
    marginBottom: 16,
  },
  miniPoster: {
    width: 60,
    height: 90,
    borderRadius: 10,
  },
  showTextInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  showTitle: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
  },
  showMeta: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
    marginTop: 4,
  },
  currentProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  currentProgressText: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.accent,
  },
  seasonScroll: {
    maxHeight: 50,
    marginBottom: 12,
  },
  seasonScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  seasonChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
  },
  seasonChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  seasonChipText: {
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.text,
  },
  seasonChipTextActive: {
    color: Colors.text,
  },
  seasonEpCount: {
    fontSize: 10,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
    marginTop: 1,
  },
  episodesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  episodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glass,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  episodeCardCurrent: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  epNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  epNumberWatched: {
    backgroundColor: Colors.accent,
  },
  epNumberText: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.textMuted,
  },
  epInfo: {
    flex: 1,
    marginLeft: 12,
  },
  epTitle: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: Colors.text,
  },
  epDate: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
    marginTop: 2,
  },
  currentBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  currentBadgeText: {
    fontSize: 10,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.text,
  },
  noEpisodes: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 30,
  },
});
