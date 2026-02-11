import React from 'react';
import { StyleSheet, View, Text, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { MediaItem, getPosterUrl, getGenreName } from '@/types/media';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MediaCardProps {
  item: MediaItem;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  showRating?: boolean;
  subtitle?: string;
}

export function MediaCard({ item, onPress, size = 'medium', showRating = true, subtitle }: MediaCardProps) {
  const posterUri = getPosterUrl(item.posterPath, size === 'large' ? 'w500' : 'w342');
  const cardWidth = size === 'small' ? 110 : size === 'medium' ? 140 : SCREEN_WIDTH * 0.42;
  const cardHeight = cardWidth * 1.5;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { width: cardWidth, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      <View style={[styles.posterContainer, { height: cardHeight, borderRadius: size === 'small' ? 10 : 12 }]}>
        {posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={[styles.poster, { borderRadius: size === 'small' ? 10 : 12 }]}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.placeholder, { borderRadius: size === 'small' ? 10 : 12 }]}>
            <Ionicons name="film-outline" size={32} color={Colors.light.textTertiary} />
          </View>
        )}
        {showRating && item.voteAverage > 0 && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={10} color={Colors.light.star} />
            <Text style={styles.ratingText}>{item.voteAverage.toFixed(1)}</Text>
          </View>
        )}
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{item.mediaType === 'tv' ? 'TV' : 'Film'}</Text>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      ) : (
        <Text style={styles.subtitle} numberOfLines={1}>
          {item.releaseDate ? new Date(item.releaseDate).getFullYear() : ''}
          {item.genreIds.length > 0 ? ` \u00B7 ${getGenreName(item.genreIds[0])}` : ''}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
  },
  posterContainer: {
    overflow: 'hidden',
    backgroundColor: Colors.light.surfaceSecondary,
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.light.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
  },
  typeBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: Colors.light.emerald,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.light.text,
    marginTop: 8,
    lineHeight: 17,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
});
