import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import AppBackground from '@/components/AppBackground';
import Colors from '@/theme/colors';
import { useApp } from '@/context/AppContext';
import { Friend, ListEntry, getPosterUrl, getGenreName } from '@/types/media';

export default function WatchTogetherScreen() {
  const insets = useSafeAreaInsets();
  const { friends, lists } = useApp();
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [pickedItem, setPickedItem] = useState<ListEntry | null>(null);

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const toggleFriend = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFriends(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const sharedWantList = useMemo(() => {
    return lists.filter(e => e.status === 'want');
  }, [lists]);

  const pickRandom = () => {
    if (sharedWantList.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    scale.value = withSequence(
      withTiming(0.85, { duration: 100 }),
      withSpring(1.05, { damping: 8 }),
      withSpring(1, { damping: 12 }),
    );
    const idx = Math.floor(Math.random() * sharedWantList.length);
    setPickedItem(sharedWantList[idx]);
  };

  return (
    <AppBackground>
      <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Watch Together</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionLabel}>Select friends</Text>
          <FlatList
            data={friends}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.friendsList}
            renderItem={({ item }) => {
              const isSelected = selectedFriends.includes(item.id);
              return (
                <Pressable onPress={() => toggleFriend(item.id)} style={styles.friendChip}>
                  <View style={[styles.friendAvatar, isSelected && styles.friendAvatarSelected]}>
                    <Text style={[styles.friendAvatarText, isSelected && { color: Colors.text }]}>
                      {item.displayName.charAt(0).toUpperCase()}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkMark}>
                        <Ionicons name="checkmark" size={10} color={Colors.text} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.friendChipName} numberOfLines={1}>{item.displayName}</Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.noFriends}>No friends added yet</Text>
            }
          />

          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
            Want List ({sharedWantList.length} titles)
          </Text>
          <Text style={styles.helpText}>
            Pick a random title from your Want list to watch together
          </Text>

          {pickedItem && (
            <Animated.View style={[styles.resultCard, animStyle]}>
              <Pressable
                onPress={() => router.push({ pathname: '/details/[id]', params: { id: pickedItem.mediaId.toString(), type: pickedItem.mediaType } })}
                style={styles.resultInner}
              >
                {pickedItem.posterPath ? (
                  <Image source={{ uri: getPosterUrl(pickedItem.posterPath, 'w342')! }} style={styles.resultPoster} contentFit="cover" />
                ) : (
                  <View style={[styles.resultPoster, { backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="film-outline" size={24} color={Colors.textMuted} />
                  </View>
                )}
                <View style={styles.resultInfo}>
                  <Text style={styles.resultTitle}>{pickedItem.title}</Text>
                  <Text style={styles.resultMeta}>
                    {pickedItem.mediaType === 'tv' ? 'TV Series' : 'Movie'}
                    {pickedItem.genreIds.length > 0 ? ` \u00B7 ${getGenreName(pickedItem.genreIds[0])}` : ''}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color={Colors.textMuted} />
              </Pressable>
            </Animated.View>
          )}

          <FlatList
            data={sharedWantList.slice(0, 10)}
            keyExtractor={item => `${item.mediaId}`}
            style={styles.titlesList}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push({ pathname: '/details/[id]', params: { id: item.mediaId.toString(), type: item.mediaType } })}
                style={styles.titleRow}
              >
                {item.posterPath ? (
                  <Image source={{ uri: getPosterUrl(item.posterPath, 'w92')! }} style={styles.titlePoster} contentFit="cover" />
                ) : (
                  <View style={[styles.titlePoster, { backgroundColor: Colors.surface }]} />
                )}
                <Text style={styles.titleName} numberOfLines={1}>{item.title}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </Pressable>
            )}
          />
        </View>

        <View style={[styles.footer, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 10 }]}>
          <Pressable
            onPress={pickRandom}
            disabled={sharedWantList.length === 0 || selectedFriends.length === 0}
            style={({ pressed }) => [
              styles.pickBtn,
              (sharedWantList.length === 0 || selectedFriends.length === 0) && { opacity: 0.4 },
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Ionicons name="shuffle" size={22} color={Colors.text} />
            <Text style={styles.pickBtnText}>
              {pickedItem ? 'Re-roll' : 'Fair Pick'}
            </Text>
          </Pressable>
        </View>
      </View>
    </AppBackground>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.textSecondary,
    marginBottom: 10,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  friendsList: {
    gap: 14,
  },
  friendChip: {
    alignItems: 'center',
    width: 64,
  },
  friendAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.glassBorder,
  },
  friendAvatarSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  friendAvatarText: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: Colors.textSecondary,
  },
  checkMark: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  friendChipName: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: Colors.text,
    marginTop: 4,
  },
  noFriends: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
  },
  helpText: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
    marginBottom: 10,
  },
  resultCard: {
    backgroundColor: Colors.glass,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.accent,
    overflow: 'hidden',
    marginBottom: 16,
  },
  resultInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  resultPoster: {
    width: 52,
    height: 78,
    borderRadius: 8,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
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
    marginTop: 4,
  },
  titlesList: {
    marginTop: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  titlePoster: {
    width: 36,
    height: 54,
    borderRadius: 6,
  },
  titleName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: Colors.text,
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
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
  },
  pickBtnText: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.text,
  },
});
