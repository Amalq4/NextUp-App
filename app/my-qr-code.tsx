import React from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import Colors from '@/theme/colors';
import { useApp } from '@/context/AppContext';

export default function MyQRCodeScreen() {
  const insets = useSafeAreaInsets();
  const { profile, authUser } = useApp();

  const userId = profile?.id || '';
  const userName = profile?.name || authUser?.name || 'User';
  const initial = userName.charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: Platform.OS === 'web' ? 67 : insets.top }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>My QR Code</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.qrCard}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={userId || 'no-id'}
              size={200}
              color="#1C1C1C"
              backgroundColor="#FFFFFF"
            />
          </View>

          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userIdText}>ID: {userId.slice(0, 12)}...</Text>
          </View>
        </View>

        <Text style={styles.helpText}>
          Show this QR code to a friend so they can scan it and add you instantly
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 12 }]}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.closeBtnText}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  qrCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 24,
  },
  profileSection: {
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 22,
    fontFamily: 'DMSans_700Bold',
    color: Colors.accent,
  },
  userName: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
  },
  userIdText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
  },
  helpText: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  closeBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: Colors.black,
  },
});
