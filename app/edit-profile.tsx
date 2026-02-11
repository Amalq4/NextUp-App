import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/context/AppContext';
import { getGenreName, GENRES } from '@/types/media';

const DARK = {
  bg1: '#0B1023',
  bg2: '#1A1040',
  bg3: '#0D0D2B',
  glass: 'rgba(255,255,255,0.08)',
  glassBorder: 'rgba(255,255,255,0.14)',
  text: '#FFFFFF',
  textSoft: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.35)',
  accent: '#4EEAAD',
  danger: '#EF4444',
  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.12)',
  inputFocus: 'rgba(78,234,173,0.3)',
  divider: 'rgba(255,255,255,0.06)',
};

const EDIT_GENRES = GENRES.filter(g =>
  [28, 35, 18, 27, 878, 10749, 53, 16, 12, 14, 10402, 9648, 10770].includes(g.id)
);

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, authUser, saveProfile } = useApp();

  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(authUser?.email || '');
  const [selectedGenres, setSelectedGenres] = useState<number[]>(profile?.favoriteGenres || []);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setSelectedGenres(profile.favoriteGenres);
    }
    if (authUser) setEmail(authUser.email);
  }, [profile?.name, authUser?.email]);

  const toggleGenre = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGenres(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};

    if (!name.trim()) e.name = 'Name is required';

    if (!email.trim()) {
      e.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = 'Invalid email format';
    }

    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) e.currentPassword = 'Enter current password';
      if (newPassword.length > 0 && newPassword.length < 6) e.newPassword = 'Must be at least 6 characters';
      if (newPassword !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (profile) {
      await saveProfile({
        ...profile,
        name: name.trim(),
        favoriteGenres: selectedGenres,
      });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Saved', 'Your profile has been updated.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <LinearGradient colors={[DARK.bg1, DARK.bg2, DARK.bg3]} style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={{ paddingTop: Platform.OS === 'web' ? 67 : insets.top }}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={20} color={DARK.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarSection}>
            <LinearGradient
              colors={['#254C42', '#4C2744']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{name?.charAt(0)?.toUpperCase() || '?'}</Text>
            </LinearGradient>
            <Text style={styles.avatarHint}>Tap to change avatar</Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>PERSONAL INFO</Text>
            <View style={styles.fieldGroup}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Name</Text>
                <View style={[styles.inputWrap, errors.name ? styles.inputError : null]}>
                  <Ionicons name="person-outline" size={16} color={DARK.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={t => { setName(t); setErrors(prev => ({ ...prev, name: '' })); }}
                    placeholder="Your name"
                    placeholderTextColor={DARK.textMuted}
                    selectionColor={DARK.accent}
                  />
                </View>
                {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
              </View>

              <View style={styles.fieldDivider} />

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Email</Text>
                <View style={[styles.inputWrap, errors.email ? styles.inputError : null]}>
                  <Ionicons name="mail-outline" size={16} color={DARK.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={t => { setEmail(t); setErrors(prev => ({ ...prev, email: '' })); }}
                    placeholder="your@email.com"
                    placeholderTextColor={DARK.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    selectionColor={DARK.accent}
                  />
                </View>
                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
              </View>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>FAVORITE GENRES</Text>
            <View style={styles.genreGrid}>
              {EDIT_GENRES.map(g => {
                const active = selectedGenres.includes(g.id);
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => toggleGenre(g.id)}
                    style={[styles.genreChip, active && styles.genreChipActive]}
                  >
                    <Text style={[styles.genreChipText, active && styles.genreChipTextActive]}>{g.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>CHANGE PASSWORD</Text>
            <View style={styles.fieldGroup}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Current Password</Text>
                <View style={[styles.inputWrap, errors.currentPassword ? styles.inputError : null]}>
                  <Ionicons name="lock-closed-outline" size={16} color={DARK.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={currentPassword}
                    onChangeText={t => { setCurrentPassword(t); setErrors(prev => ({ ...prev, currentPassword: '' })); }}
                    placeholder="Enter current password"
                    placeholderTextColor={DARK.textMuted}
                    secureTextEntry={!showCurrentPw}
                    selectionColor={DARK.accent}
                  />
                  <Pressable onPress={() => setShowCurrentPw(!showCurrentPw)} hitSlop={10}>
                    <Ionicons name={showCurrentPw ? 'eye-off-outline' : 'eye-outline'} size={16} color={DARK.textMuted} />
                  </Pressable>
                </View>
                {errors.currentPassword ? <Text style={styles.errorText}>{errors.currentPassword}</Text> : null}
              </View>

              <View style={styles.fieldDivider} />

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>New Password</Text>
                <View style={[styles.inputWrap, errors.newPassword ? styles.inputError : null]}>
                  <Ionicons name="key-outline" size={16} color={DARK.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={t => { setNewPassword(t); setErrors(prev => ({ ...prev, newPassword: '' })); }}
                    placeholder="New password (6+ chars)"
                    placeholderTextColor={DARK.textMuted}
                    secureTextEntry={!showNewPw}
                    selectionColor={DARK.accent}
                  />
                  <Pressable onPress={() => setShowNewPw(!showNewPw)} hitSlop={10}>
                    <Ionicons name={showNewPw ? 'eye-off-outline' : 'eye-outline'} size={16} color={DARK.textMuted} />
                  </Pressable>
                </View>
                {errors.newPassword ? <Text style={styles.errorText}>{errors.newPassword}</Text> : null}
              </View>

              <View style={styles.fieldDivider} />

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Confirm Password</Text>
                <View style={[styles.inputWrap, errors.confirmPassword ? styles.inputError : null]}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={DARK.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={t => { setConfirmPassword(t); setErrors(prev => ({ ...prev, confirmPassword: '' })); }}
                    placeholder="Confirm new password"
                    placeholderTextColor={DARK.textMuted}
                    secureTextEntry={!showNewPw}
                    selectionColor={DARK.accent}
                  />
                </View>
                {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
              </View>
            </View>
          </View>

          <View style={styles.saveSection}>
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [styles.saveBtnWrap, pressed && { opacity: 0.85 }]}
            >
              <LinearGradient
                colors={['#254C42', '#4C2744']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtn}
              >
                <Ionicons name="checkmark" size={20} color="#FFF" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
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
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: DARK.glass,
    borderWidth: 1,
    borderColor: DARK.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: DARK.text,
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontFamily: 'DMSans_700Bold',
    color: '#FFF',
  },
  avatarHint: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: DARK.textMuted,
    marginTop: 8,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_700Bold',
    color: DARK.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  fieldGroup: {
    backgroundColor: DARK.glass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DARK.glassBorder,
    overflow: 'hidden',
  },
  field: {
    padding: 14,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: DARK.divider,
    marginHorizontal: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    color: DARK.textSoft,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK.inputBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: DARK.inputBorder,
  },
  inputError: {
    borderColor: DARK.danger,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: DARK.text,
    padding: 0,
  },
  errorText: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: DARK.danger,
    marginTop: 4,
    marginLeft: 4,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: DARK.glass,
    borderWidth: 1,
    borderColor: DARK.glassBorder,
  },
  genreChipActive: {
    backgroundColor: 'rgba(78,234,173,0.2)',
    borderColor: 'rgba(78,234,173,0.4)',
  },
  genreChipText: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: DARK.textSoft,
  },
  genreChipTextActive: {
    color: DARK.accent,
    fontFamily: 'DMSans_600SemiBold',
  },
  saveSection: {
    marginBottom: 20,
  },
  saveBtnWrap: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  saveBtnText: {
    fontSize: 17,
    fontFamily: 'DMSans_700Bold',
    color: '#FFF',
  },
});
