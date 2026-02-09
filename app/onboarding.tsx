import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { GENRES, UserProfile } from '@/types/media';

const POPULAR_GENRES = GENRES.filter(g =>
  [28, 35, 18, 27, 878, 10749, 53, 16, 14, 80, 99, 9648].includes(g.id)
);

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { saveProfile } = useApp();
  const [name, setName] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [step, setStep] = useState(0);

  const toggleGenre = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGenres(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step === 0 && name.trim()) {
      setStep(1);
    } else if (step === 1) {
      const profile: UserProfile = {
        id: Crypto.randomUUID(),
        name: name.trim(),
        favoriteGenres: selectedGenres,
        language: 'en',
        region: 'US',
        onboarded: true,
      };
      await saveProfile(profile);
      router.replace('/(tabs)');
    }
  };

  const canContinue = step === 0 ? name.trim().length > 0 : selectedGenres.length > 0;

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}>
      <LinearGradient
        colors={[Colors.light.accent, '#FF8E8E', Colors.light.background]}
        locations={[0, 0.3, 0.6]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="play" size={28} color="#fff" />
          </View>
          <Text style={styles.appName}>NextUp</Text>
          <Text style={styles.tagline}>
            {step === 0 ? 'Your watchlist, organized.' : 'Pick your favorites'}
          </Text>
        </View>

        {step === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What should we call you?</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={Colors.light.textTertiary}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={handleContinue}
            />
          </View>
        ) : (
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
                    {isSelected && <Ionicons name="checkmark-circle" size={16} color="#fff" />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 10 }]}>
        {step === 1 && (
          <Pressable onPress={() => setStep(0)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
          </Pressable>
        )}
        <Pressable
          onPress={handleContinue}
          disabled={!canContinue}
          style={({ pressed }) => [
            styles.continueBtn,
            !canContinue && styles.continueBtnDisabled,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={styles.continueBtnText}>
            {step === 0 ? 'Continue' : 'Get Started'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
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
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontFamily: 'DMSans_700Bold',
    color: '#fff',
    marginBottom: 6,
  },
  tagline: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: 'rgba(255,255,255,0.85)',
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    padding: 24,
    marginTop: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
    color: Colors.light.text,
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: Colors.light.textSecondary,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'DMSans_500Medium',
    color: Colors.light.text,
    marginTop: 10,
    backgroundColor: Colors.light.surfaceSecondary,
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
    backgroundColor: Colors.light.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  genreChipSelected: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
  },
  genreLabel: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: Colors.light.text,
  },
  genreLabelSelected: {
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.light.background,
    gap: 12,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  continueBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.light.accent,
    borderRadius: 14,
    paddingVertical: 15,
  },
  continueBtnDisabled: {
    opacity: 0.4,
  },
  continueBtnText: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: '#fff',
  },
});
