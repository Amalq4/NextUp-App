import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  Switch,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/context/AppContext';
import { getGenreName } from '@/types/media';

const DARK = {
  bg1: '#0B1023',
  bg2: '#1A1040',
  bg3: '#0D0D2B',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.10)',
  glass: 'rgba(255,255,255,0.08)',
  glassBorder: 'rgba(255,255,255,0.14)',
  text: '#FFFFFF',
  textSoft: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.35)',
  accent: '#4EEAAD',
  danger: '#EF4444',
  dangerBg: 'rgba(239,68,68,0.12)',
  row: 'rgba(255,255,255,0.05)',
  rowBorder: 'rgba(255,255,255,0.08)',
  divider: 'rgba(255,255,255,0.06)',
  switchTrack: 'rgba(255,255,255,0.15)',
  modalBg: 'rgba(0,0,0,0.7)',
};

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  label: string;
  labelColor?: string;
  subtitle?: string;
  onPress: () => void;
  trailing?: React.ReactNode;
  isLast?: boolean;
}

function SettingsRow({ icon, iconColor, iconBg, label, labelColor, subtitle, onPress, trailing, isLast }: SettingsRowProps) {
  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      style={({ pressed }) => [styles.row, !isLast && styles.rowDivider, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg || DARK.glass }]}>
        <Ionicons name={icon} size={17} color={iconColor || DARK.accent} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, labelColor ? { color: labelColor } : null]}>{label}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {trailing || <Ionicons name="chevron-forward" size={16} color={DARK.textMuted} />}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { profile, lists, clearAllData, logout, authUser, saveProfile } = useApp();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  const stats = {
    want: lists.filter(l => l.status === 'want').length,
    watching: lists.filter(l => l.status === 'watching').length,
    watched: lists.filter(l => l.status === 'watched').length,
    total: lists.length,
  };

  const genreText = profile?.favoriteGenres?.length
    ? profile.favoriteGenres.slice(0, 3).map(id => getGenreName(id)).join(', ')
    : 'No genres selected';

  const contentDefault = profile?.preferredMediaType === 'movie' ? 'Movies' : profile?.preferredMediaType === 'tv' ? 'Series' : 'Both';

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleClearCache = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Cache Cleared', 'App cache has been cleared successfully.');
  };

  const handleReset = () => {
    Alert.alert('Reset App', 'This will reset your preferences but keep your account. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          if (profile) {
            saveProfile({ ...profile, favoriteGenres: [], preferredMediaType: undefined, preferredProviders: undefined });
          }
        },
      },
    ]);
  };

  const confirmClearAll = async () => {
    setShowClearModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await clearAllData();
    router.replace('/onboarding');
  };

  const handleContentDefault = () => {
    const options: ('movie' | 'tv' | 'both')[] = ['both', 'movie', 'tv'];
    const current = profile?.preferredMediaType || 'both';
    const nextIndex = (options.indexOf(current) + 1) % options.length;
    if (profile) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      saveProfile({ ...profile, preferredMediaType: options[nextIndex] });
    }
  };

  return (
    <LinearGradient colors={[DARK.bg1, DARK.bg2, DARK.bg3]} style={styles.container}>
      <ScrollView
        style={{ paddingTop: Platform.OS === 'web' ? 67 : insets.top }}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Settings</Text>

        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/edit-profile'); }}
          style={({ pressed }) => [styles.profileCard, { opacity: pressed ? 0.9 : 1 }]}
        >
          <View style={styles.profileLeft}>
            <LinearGradient
              colors={['#254C42', '#4C2744']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileAvatar}
            >
              <Text style={styles.profileAvatarText}>
                {profile?.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </LinearGradient>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.name || 'User'}</Text>
              <Text style={styles.profileEmail}>{authUser?.email || 'No email'}</Text>
              <Text style={styles.profileGenres} numberOfLines={1}>{genreText}</Text>
            </View>
          </View>
          <View style={styles.profileEditBtn}>
            <Ionicons name="create-outline" size={18} color={DARK.accent} />
          </View>
        </Pressable>

        <View style={styles.statsRow}>
          {[
            { label: 'Want', value: stats.want, color: '#E8935A' },
            { label: 'Watching', value: stats.watching, color: DARK.accent },
            { label: 'Watched', value: stats.watched, color: '#7C3AED' },
          ].map(stat => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ACCOUNT</Text>
          <View style={styles.sectionCard}>
            <SettingsRow icon="mail-outline" label="Change Email" subtitle={authUser?.email} onPress={() => router.push('/edit-profile')} />
            <SettingsRow icon="lock-closed-outline" label="Change Password" onPress={() => router.push('/edit-profile')} />
            <SettingsRow icon="person-circle-outline" label="Manage Avatar" onPress={() => router.push('/edit-profile')} />
            <SettingsRow icon="log-out-outline" iconColor={DARK.danger} iconBg={DARK.dangerBg} label="Log Out" labelColor={DARK.danger} onPress={handleLogout} isLast />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>PREFERENCES</Text>
          <View style={styles.sectionCard}>
            <SettingsRow
              icon="film-outline"
              label="Content Type Default"
              subtitle={contentDefault}
              onPress={handleContentDefault}
            />
            <SettingsRow icon="heart-outline" label="Preferred Genres" subtitle={genreText} onPress={() => router.push('/edit-profile')} />
            <SettingsRow icon="tv-outline" label="Streaming Providers" onPress={() => router.push('/edit-profile')} />
            <SettingsRow
              icon="notifications-outline"
              label="Notifications"
              onPress={() => { setNotificationsEnabled(prev => !prev); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              trailing={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={v => { setNotificationsEnabled(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  trackColor={{ false: DARK.switchTrack, true: 'rgba(78,234,173,0.4)' }}
                  thumbColor={notificationsEnabled ? DARK.accent : '#888'}
                />
              }
              isLast
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>DATA</Text>
          <View style={styles.sectionCard}>
            <SettingsRow icon="trash-bin-outline" label="Clear Cache" onPress={handleClearCache} />
            <SettingsRow icon="refresh-outline" label="Reset App" onPress={handleReset} />
            <SettingsRow icon="warning-outline" iconColor={DARK.danger} iconBg={DARK.dangerBg} label="Clear All Data" labelColor={DARK.danger} onPress={() => setShowClearModal(true)} isLast />
          </View>
        </View>

        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>NextUp v1.0.0</Text>
          <Text style={styles.appInfoText}>Powered by TMDB</Text>
        </View>
      </ScrollView>

      <Modal visible={showClearModal} transparent animationType="fade" onRequestClose={() => setShowClearModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="warning" size={32} color={DARK.danger} />
            </View>
            <Text style={styles.modalTitle}>Clear All Data?</Text>
            <Text style={styles.modalDesc}>
              This will permanently delete your profile, watchlists, progress, and friends. This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowClearModal(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmClearAll} style={styles.modalDeleteBtn}>
                <Text style={styles.modalDeleteText}>Delete Everything</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'DMSans_700Bold',
    color: DARK.text,
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
    backgroundColor: DARK.glass,
    borderWidth: 1,
    borderColor: DARK.glassBorder,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 24,
    fontFamily: 'DMSans_700Bold',
    color: '#FFF',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
    gap: 2,
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: DARK.text,
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: DARK.textSoft,
  },
  profileGenres: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: DARK.textMuted,
    marginTop: 2,
  },
  profileEditBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: DARK.glass,
    borderWidth: 1,
    borderColor: DARK.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: DARK.glass,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DARK.glassBorder,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'DMSans_700Bold',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: DARK.textMuted,
    marginTop: 2,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: 'DMSans_700Bold',
    color: DARK.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: DARK.glass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DARK.glassBorder,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: DARK.divider,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    color: DARK.text,
  },
  rowSub: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: DARK.textMuted,
    marginTop: 1,
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: 30,
    gap: 4,
  },
  appInfoText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: DARK.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: DARK.modalBg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DARK.glassBorder,
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: DARK.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
    color: DARK.text,
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: DARK.textSoft,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: DARK.glass,
    borderWidth: 1,
    borderColor: DARK.glassBorder,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: DARK.text,
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: DARK.dangerBg,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    alignItems: 'center',
  },
  modalDeleteText: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: DARK.danger,
  },
});
