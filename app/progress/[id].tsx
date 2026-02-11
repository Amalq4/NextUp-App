import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AppBackground from '@/components/AppBackground';
import { DARK_THEME } from '@/components/AppBackground';
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
          <ActivityIndicator size="large" color="#E8935A" />
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
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
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
                <Ionicons name="play-circle" size={16} color="#4EEAAD" />
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
            <ActivityIndicator size="small" color="#E8935A" style={{ marginTop: 30 }} />
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
                      <Ionicons name="checkmark" size={14} color="#fff" />
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
    color: 'rgba(255,255,255,0.6)',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'DMSans_600SemiBold',
    color: '#FFFFFF',
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
    color: '#FFFFFF',
  },
  showMeta: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: 'rgba(255,255,255,0.6)',
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
    color: '#4EEAAD',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
  },
  seasonChipActive: {
    backgroundColor: '#4EEAAD',
    borderColor: '#4EEAAD',
  },
  seasonChipText: {
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    color: '#FFFFFF',
  },
  seasonChipTextActive: {
    color: '#fff',
  },
  seasonEpCount: {
    fontSize: 10,
    fontFamily: 'DMSans_400Regular',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },
  episodesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  episodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  episodeCardCurrent: {
    borderColor: '#4EEAAD',
    backgroundColor: 'rgba(78,234,173,0.12)',
  },
  epNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  epNumberWatched: {
    backgroundColor: '#4EEAAD',
  },
  epNumberText: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    color: 'rgba(255,255,255,0.6)',
  },
  epInfo: {
    flex: 1,
    marginLeft: 12,
  },
  epTitle: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: '#FFFFFF',
  },
  epDate: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
  },
  currentBadge: {
    backgroundColor: '#4EEAAD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  currentBadgeText: {
    fontSize: 10,
    fontFamily: 'DMSans_600SemiBold',
    color: '#fff',
  },
  noEpisodes: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 30,
  },
});
