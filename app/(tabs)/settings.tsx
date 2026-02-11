import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { getGenreName } from '@/types/media';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { profile, lists, clearAllData, logout } = useApp();

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will remove your profile, lists, progress, and friends. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await clearAllData();
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  const stats = {
    want: lists.filter(l => l.status === 'want').length,
    watching: lists.filter(l => l.status === 'watching').length,
    watched: lists.filter(l => l.status === 'watched').length,
    total: lists.length,
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 90 }}
    >
      <Text style={styles.screenTitle}>Settings</Text>

      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>
            {profile?.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.name || 'User'}</Text>
          <Text style={styles.profileSub}>
            {profile?.favoriteGenres.map(id => getGenreName(id)).join(', ') || 'No genres selected'}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: 'Want', value: stats.want, color: Colors.light.warm },
          { label: 'Watching', value: stats.watching, color: Colors.light.accent },
          { label: 'Watched', value: stats.watched, color: Colors.light.success },
        ].map(stat => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General</Text>

        <Pressable
          onPress={() => router.push('/random-picker')}
          style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={[styles.menuIcon, { backgroundColor: Colors.light.warmLight }]}>
            <Ionicons name="shuffle" size={18} color={Colors.light.warm} />
          </View>
          <Text style={styles.menuLabel}>Random Picker</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.light.textTertiary} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/onboarding')}
          style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={[styles.menuIcon, { backgroundColor: Colors.light.accentLight }]}>
            <Ionicons name="person" size={18} color={Colors.light.accent} />
          </View>
          <Text style={styles.menuLabel}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.light.textTertiary} />
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Pressable
          onPress={() => {
            Alert.alert(
              'Log Out',
              'Are you sure you want to log out?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Log Out',
                  style: 'destructive',
                  onPress: async () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    await logout();
                    router.replace('/(auth)/login');
                  },
                },
              ]
            );
          }}
          style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={[styles.menuIcon, { backgroundColor: Colors.light.dangerLight }]}>
            <Ionicons name="log-out-outline" size={18} color={Colors.light.danger} />
          </View>
          <Text style={[styles.menuLabel, { color: Colors.light.danger }]}>Log Out</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.light.textTertiary} />
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <Pressable
          onPress={handleClearData}
          style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={[styles.menuIcon, { backgroundColor: Colors.light.dangerLight }]}>
            <Ionicons name="trash" size={18} color={Colors.light.danger} />
          </View>
          <Text style={[styles.menuLabel, { color: Colors.light.danger }]}>Clear All Data</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.light.textTertiary} />
        </Pressable>
      </View>

      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>NextUp v1.0.0</Text>
        <Text style={styles.appInfoText}>Powered by TMDB</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'DMSans_700Bold',
    color: Colors.light.text,
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  profileAvatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 22,
    fontFamily: 'DMSans_700Bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: Colors.light.text,
  },
  profileSub: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: Colors.light.textSecondary,
    marginTop: 3,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'DMSans_700Bold',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.light.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    color: Colors.light.text,
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: 30,
    gap: 4,
  },
  appInfoText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: Colors.light.textTertiary,
  },
});
