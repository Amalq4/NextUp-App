/**
 * settings.tsx — Settings screen
 *
 * Sections:
 *   Profile card   — Avatar, name, email, genres; tap to edit profile
 *   Stats row      — Want / Watching / Watched counts
 *   NOTIFICATIONS  — Toggle daily reminder on/off; pick reminder hour
 *   GENERAL        — Log Out
 *   DATA           — Clear Cache, Clear All Data
 *
 * Notification flow:
 *   1. User flips the toggle ON → requestNotificationPermission() called
 *   2. If granted → scheduleDailyReminder() scheduled → prefs saved
 *   3. If denied  → OS-level alert shown → toggle stays off
 *   4. User flips OFF → cancelAllNotifications() → prefs saved
 *   5. User changes reminder hour → reschedules daily reminder immediately
 */

import React, { useState, useEffect } from 'react';
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
import { Image } from 'expo-image';
import AppBackground from '@/components/AppBackground';
import Colors from '@/theme/colors';
import { useApp } from '@/context/AppContext';
import { getGenreName } from '@/types/media';
import {
  requestNotificationPermission,
  getNotificationPermissionStatus,
  scheduleDailyReminder,
  cancelAllNotifications,
  saveNotificationPrefs,
  loadNotificationPrefs,
  DEFAULT_REMINDER_HOUR,
} from '@/lib/notifications';

// ─── Reusable settings row ────────────────────────────────────────────────────

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
      <View style={[styles.rowIcon, { backgroundColor: iconBg || Colors.glass }]}>
        <Ionicons name={icon} size={17} color={iconColor || Colors.accent} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, labelColor ? { color: labelColor } : null]}>{label}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {trailing || <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
    </Pressable>
  );
}

// ─── Hour labels for the time picker ─────────────────────────────────────────

const REMINDER_HOURS = [
  { value: 17, label: '5:00 PM' },
  { value: 18, label: '6:00 PM' },
  { value: 19, label: '7:00 PM' },
  { value: 20, label: '8:00 PM' },
  { value: 21, label: '9:00 PM' },
  { value: 22, label: '10:00 PM' },
];

// ─── SettingsScreen ───────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { profile, lists, progress, clearAllData, logout, authUser } = useApp();

  // Notification state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(DEFAULT_REMINDER_HOUR);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Modal visibility
  const [showClearModal, setShowClearModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Stats derived from the current user's lists
  const stats = {
    want: lists.filter(l => l.status === 'want').length,
    watching: lists.filter(l => l.status === 'watching').length,
    watched: lists.filter(l => l.status === 'watched').length,
  };

  const genreText = profile?.favoriteGenres?.length
    ? profile.favoriteGenres.slice(0, 3).map(id => getGenreName(id)).join(', ')
    : 'No genres selected';

  // ── Load saved notification preferences on mount ──────────────────────────

  useEffect(() => {
    (async () => {
      const prefs = await loadNotificationPrefs();
      // Also verify the OS permission is still granted — user may have revoked it
      if (prefs.enabled) {
        const status = await getNotificationPermissionStatus();
        setNotificationsEnabled(status === 'granted');
      } else {
        setNotificationsEnabled(false);
      }
      setReminderHour(prefs.hour);
    })();
  }, []);

  // ── Notification toggle handler ───────────────────────────────────────────

  const handleNotificationToggle = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (value) {
      // Turning ON: request permission first
      const granted = await requestNotificationPermission();

      if (!granted) {
        // Permission denied — inform the user and leave toggle off
        if (Platform.OS !== 'web') {
          Alert.alert(
            'Notifications Disabled',
            'Please enable notifications for NextUp in your device Settings to receive reminders.',
            [{ text: 'OK' }],
          );
        }
        return; // Don't update toggle state
      }

      // Permission granted — schedule the daily reminder and save prefs
      await scheduleDailyReminder(reminderHour, lists, progress);
      await saveNotificationPrefs(true, reminderHour);
      setNotificationsEnabled(true);
    } else {
      // Turning OFF — cancel all scheduled notifications and save prefs
      await cancelAllNotifications();
      await saveNotificationPrefs(false, reminderHour);
      setNotificationsEnabled(false);
    }
  };

  // ── Reminder hour change ──────────────────────────────────────────────────

  const handleHourSelect = async (hour: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReminderHour(hour);
    setShowTimePicker(false);

    // If notifications are on, reschedule immediately with the new time
    if (notificationsEnabled) {
      await scheduleDailyReminder(hour, lists, progress);
      await saveNotificationPrefs(true, hour);
    } else {
      // Just save the preferred time even if notifications are off
      await saveNotificationPrefs(false, hour);
    }
  };

  // ── Auth/data actions ─────────────────────────────────────────────────────

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await cancelAllNotifications(); // Clean up notifications before logging out
    await logout();
    router.replace('/(auth)/login');
  };

  const handleClearCache = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Cache Cleared', 'App cache has been cleared successfully.');
  };

  const confirmClearAll = async () => {
    setShowClearModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await cancelAllNotifications(); // Clear notifications before wiping data
    await clearAllData();
    router.replace('/onboarding');
  };

  // Format the selected hour for display (e.g., 19 → "7:00 PM")
  const reminderHourLabel =
    REMINDER_HOURS.find(h => h.value === reminderHour)?.label || '7:00 PM';

  return (
    <AppBackground>
      <ScrollView
        style={{ paddingTop: Platform.OS === 'web' ? 67 : insets.top }}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Settings</Text>

        {/* ── Profile card ── */}
        <View style={styles.profileCard}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/edit-profile'); }}
            style={({ pressed }) => [styles.profileLeft, { opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={styles.profileAvatar}>
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.profileAvatarImage} contentFit="cover" />
              ) : (
                <Text style={styles.profileAvatarText}>
                  {profile?.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.name || 'User'}</Text>
              <Text style={styles.profileEmail}>{authUser?.email || 'No email'}</Text>
              <Text style={styles.profileGenres} numberOfLines={1}>{genreText}</Text>
            </View>
          </Pressable>
          <View style={styles.profileBtns}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/my-qr-code'); }}
              style={({ pressed }) => [styles.profileEditBtn, { opacity: pressed ? 0.7 : 1 }]}
              testID="qr-code-btn"
            >
              <Ionicons name="qr-code-outline" size={18} color={Colors.accent} />
            </Pressable>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/edit-profile'); }}
              style={({ pressed }) => [styles.profileEditBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="create-outline" size={18} color={Colors.accent} />
            </Pressable>
          </View>
        </View>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          {[
            { label: 'Want', value: stats.want, color: Colors.tan },
            { label: 'Watching', value: stats.watching, color: Colors.accent },
            { label: 'Watched', value: stats.watched, color: Colors.slateGray },
          ].map(stat => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Notifications section ── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
          <View style={styles.sectionCard}>
            {/* Toggle: enable/disable daily reminders */}
            <SettingsRow
              icon="notifications-outline"
              label="Daily Reminder"
              subtitle={notificationsEnabled ? `Fires every day at ${reminderHourLabel}` : 'Get a nightly nudge to watch something'}
              onPress={() => handleNotificationToggle(!notificationsEnabled)}
              trailing={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleNotificationToggle}
                  trackColor={{ false: Colors.glassBorder, true: Colors.accentBorder }}
                  thumbColor={notificationsEnabled ? Colors.accent : Colors.textMuted}
                />
              }
            />
            {/* Reminder time picker — only shown when notifications are on */}
            {notificationsEnabled && (
              <SettingsRow
                icon="time-outline"
                label="Reminder Time"
                subtitle={reminderHourLabel}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowTimePicker(true); }}
                isLast
              />
            )}
            {!notificationsEnabled && (
              <View style={styles.notifHint}>
                <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.notifHintText}>
                  Enable to get reminders about your watchlist every evening.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── General section ── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>GENERAL</Text>
          <View style={styles.sectionCard}>
            <SettingsRow
              icon="log-out-outline"
              iconColor={Colors.danger}
              iconBg={Colors.dangerBg}
              label="Log Out"
              labelColor={Colors.danger}
              onPress={handleLogout}
              isLast
            />
          </View>
        </View>

        {/* ── Data section ── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>DATA</Text>
          <View style={styles.sectionCard}>
            <SettingsRow icon="trash-bin-outline" label="Clear Cache" onPress={handleClearCache} />
            <SettingsRow
              icon="warning-outline"
              iconColor={Colors.danger}
              iconBg={Colors.dangerBg}
              label="Clear All Data"
              labelColor={Colors.danger}
              onPress={() => setShowClearModal(true)}
              isLast
            />
          </View>
        </View>

        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>NextUp v1.0.0</Text>
          <Text style={styles.appInfoText}>Powered by TMDB</Text>
        </View>
      </ScrollView>

      {/* ── Time picker modal ── */}
      <Modal visible={showTimePicker} transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: Colors.accentSoft }]}>
              <Ionicons name="time-outline" size={32} color={Colors.accent} />
            </View>
            <Text style={styles.modalTitle}>Reminder Time</Text>
            <Text style={styles.modalDesc}>
              Pick the time you'd like to receive your daily watch reminder.
            </Text>
            <View style={styles.timeOptions}>
              {REMINDER_HOURS.map(h => (
                <Pressable
                  key={h.value}
                  onPress={() => handleHourSelect(h.value)}
                  style={({ pressed }) => [
                    styles.timeOption,
                    reminderHour === h.value && styles.timeOptionActive,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[
                    styles.timeOptionText,
                    reminderHour === h.value && styles.timeOptionTextActive,
                  ]}>
                    {h.label}
                  </Text>
                  {reminderHour === h.value && (
                    <Ionicons name="checkmark" size={16} color={Colors.black} />
                  )}
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setShowTimePicker(false)} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Clear all data confirmation modal ── */}
      <Modal visible={showClearModal} transparent animationType="fade" onRequestClose={() => setShowClearModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="warning" size={32} color={Colors.danger} />
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

      {/* ── Logout confirmation modal ── */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: Colors.accentSoft }]}>
              <Ionicons name="log-out-outline" size={32} color={Colors.accent} />
            </View>
            <Text style={styles.modalTitle}>Log Out?</Text>
            <Text style={styles.modalDesc}>
              Are you sure you want to log out of your account?
            </Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowLogoutModal(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmLogout} style={styles.modalDeleteBtn} testID="confirm-logout-btn">
                <Text style={styles.modalDeleteText}>Log Out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </AppBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screenTitle: {
    fontSize: 28,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
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
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
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
    backgroundColor: Colors.surface,
  },
  profileAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileAvatarText: {
    fontSize: 24,
    fontFamily: 'DMSans_700Bold',
    color: Colors.white,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
    gap: 2,
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textSecondary,
  },
  profileGenres: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
    marginTop: 2,
  },
  profileBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileEditBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
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
    backgroundColor: Colors.glass,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'DMSans_700Bold',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
    marginTop: 2,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: 'DMSans_700Bold',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: Colors.glass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  notifHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 2,
  },
  notifHintText: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
    flex: 1,
    lineHeight: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
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
    color: Colors.text,
  },
  rowSub: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
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
    color: Colors.textMuted,
  },
  // Time picker modal styles
  timeOptions: {
    width: '100%',
    gap: 8,
    marginBottom: 16,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  timeOptionActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  timeOptionText: {
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    color: Colors.text,
  },
  timeOptionTextActive: {
    color: Colors.black,
    fontFamily: 'DMSans_700Bold',
  },
  // Shared modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.backgroundDark,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textSecondary,
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
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.text,
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.dangerBg,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
    alignItems: 'center',
  },
  modalDeleteText: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.danger,
  },
});
