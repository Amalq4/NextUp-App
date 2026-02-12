import React, { useState } from 'react';
import { StyleSheet, View, Text, Image, ScrollView, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import Colors from '@/theme/colors';
import { useApp } from '@/context/AppContext';
import { GENRES, UserProfile } from '@/types/media';

const POPULAR_GENRES = GENRES.filter(g =>
  [28, 35, 18, 27, 878, 10749, 53, 16, 14, 80, 99, 9648].includes(g.id)
);

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { saveProfile, profile, authUser } = useApp();
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);

  const toggleGenre = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGenres(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const userName = profile?.name || authUser?.name || 'User';
    const updatedProfile: UserProfile = {
      id: profile?.id || Crypto.randomUUID(),
      name: userName,
      favoriteGenres: selectedGenres,
      language: profile?.language || 'en',
      region: profile?.region || 'US',
      onboarded: true,
    };
    await saveProfile(updatedProfile);
    router.replace('/(tabs)');
  };

  const canContinue = selectedGenres.length > 0;

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.background }]} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Pick your favorites</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select genres you love</Text>
          <Text style={styles.cardSub}>Choose at least one to personalize your feed</Text>
          <View style={styles.genreGrid}>
            {POPULAR_GENRES.map(genre => {
              const isSelected = selectedGenres.includes(genre.id);
              return (
                <Pressable
                  key={genre.id}
                  onPress={() => toggleGenre(genre.id)}
                  style={[styles.genreChip, isSelected && styles.genreChipSelected]}
                >
                  <Text style={[styles.genreLabel, isSelected && styles.genreLabelSelected]}>
                    {genre.name}
                  </Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={16} color={Colors.text} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 10 }]}>
        <Pressable
          onPress={handleContinue}
          disabled={!canContinue}
          style={({ pressed }) => [
            styles.continueBtn,
            !canContinue && styles.continueBtnDisabled,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={styles.continueBtnText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.black} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
  },
  headerLogo: {
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: Colors.text,
  },
  card: {
    backgroundColor: Colors.glass,
    borderRadius: 20,
    padding: 24,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
    marginBottom: 16,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.glass,
    borderWidth: 1.5,
    borderColor: Colors.glassBorder,
  },
  genreChipSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  genreLabel: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: Colors.text,
  },
  genreLabelSelected: {
    color: Colors.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.backgroundDeep,
    gap: 12,
  },
  continueBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 15,
  },
  continueBtnDisabled: {
    opacity: 0.4,
  },
  continueBtnText: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.black,
  },
});
