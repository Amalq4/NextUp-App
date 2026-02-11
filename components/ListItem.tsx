import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { DARK_THEME } from '@/components/AppBackground';
import { ListEntry, getPosterUrl, getGenreName, ProgressEntry } from '@/types/media';

interface ListItemProps {
  entry: ListEntry;
  progress?: ProgressEntry;
  onPress: () => void;
  onRemove?: () => void;
}

export function ListItem({ entry, progress, onPress, onRemove }: ListItemProps) {
  const posterUri = getPosterUrl(entry.posterPath, 'w185');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <View style={styles.posterWrap}>
        {posterUri ? (
          <Image source={{ uri: posterUri }} style={styles.poster} contentFit="cover" transition={200} />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Ionicons name="film-outline" size={20} color={DARK_THEME.textMuted} />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{entry.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {entry.mediaType === 'tv' ? 'TV Series' : 'Movie'}
          {entry.genreIds.length > 0 ? ` \u00B7 ${getGenreName(entry.genreIds[0])}` : ''}
        </Text>
        {progress && entry.mediaType === 'tv' && (
          <View style={styles.progressRow}>
            <Ionicons name="play-circle" size={14} color="#4EEAAD" />
            <Text style={styles.progressText}>
              S{progress.seasonNumber} E{progress.episodeNumber}
            </Text>
          </View>
        )}
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color="#FBBF24" />
          <Text style={styles.ratingText}>{entry.voteAverage.toFixed(1)}</Text>
        </View>
      </View>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={10} style={styles.removeBtn}>
          <Ionicons name="close-circle" size={22} color={DARK_THEME.textMuted} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK_THEME.glass,
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
  },
  posterWrap: {
    width: 56,
    height: 84,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: DARK_THEME.text,
  },
  meta: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: DARK_THEME.textSoft,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: '#4EEAAD',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: DARK_THEME.textSoft,
  },
  removeBtn: {
    padding: 4,
  },
});
