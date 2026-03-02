import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useDrawer } from '@/context/DrawerContext';
import { useApp } from '@/context/AppContext';
import Colors from '@/theme/colors';

const DRAWER_WIDTH = 280;

interface DrawerItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  iconColor?: string;
  isLast?: boolean;
}

function DrawerItem({ icon, label, onPress, iconColor, isLast }: DrawerItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.drawerItem,
        !isLast && styles.drawerItemBorder,
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={styles.drawerItemIcon}>
        <Ionicons name={icon} size={20} color={iconColor || Colors.gold} />
      </View>
      <Text style={styles.drawerItemLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </Pressable>
  );
}

export default function AppDrawer() {
  const { isOpen, closeDrawer } = useDrawer();
  const { profile, logout, authUser } = useApp();
  const insets = useSafeAreaInsets();

  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsMounted(false);
      });
    }
  }, [isOpen]);

  const navigateTo = (path: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    closeDrawer();
    setTimeout(() => {
      router.push(path as any);
    }, 200);
  };

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    closeDrawer();
    await logout();
    router.replace('/(auth)/login');
  };

  if (!isOpen && !isMounted) return null;

  return (
    <View style={styles.container} pointerEvents={isOpen ? 'auto' : 'none'}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
      </Animated.View>

      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX }],
            paddingTop: Platform.OS === 'web' ? 67 : insets.top + 16,
            paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 16,
          },
        ]}
      >
        <View style={styles.drawerHeader}>
          <View style={styles.drawerAvatar}>
            {profile?.avatarUrl ? (
              <Image
                source={{ uri: profile.avatarUrl }}
                style={styles.drawerAvatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.drawerAvatarText}>
                {profile?.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            )}
          </View>
          <View style={styles.drawerHeaderInfo}>
            <Text style={styles.drawerName} numberOfLines={1}>
              {profile?.name || 'User'}
            </Text>
            <Text style={styles.drawerEmail} numberOfLines={1}>
              {authUser?.email || ''}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              closeDrawer();
            }}
            style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Ionicons name="close" size={22} color={Colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>FEATURES</Text>
        <View style={styles.drawerSection}>
          <DrawerItem
            icon="shuffle-outline"
            label="Swipe Decisions"
            onPress={() => navigateTo('/swipe')}
          />
          <DrawerItem
            icon="dice-outline"
            label="Random Picker"
            onPress={() => navigateTo('/random-picker')}
          />
          <DrawerItem
            icon="people-outline"
            label="Watch Together"
            onPress={() => navigateTo('/watch-together')}
            isLast
          />
        </View>

        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.drawerSection}>
          <DrawerItem
            icon="qr-code-outline"
            label="My QR Code"
            onPress={() => navigateTo('/my-qr-code')}
            isLast
          />
        </View>

        <View style={styles.drawerFooter}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.logoutBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>

          <Text style={styles.versionText}>NextUp v1.0.0</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: Colors.backgroundDark,
    borderRightWidth: 1,
    borderRightColor: Colors.glassBorder,
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  drawerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  drawerAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  drawerAvatarText: {
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
    color: Colors.gold,
  },
  drawerHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  drawerName: {
    fontSize: 17,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
  },
  drawerEmail: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.glassBorder,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_700Bold',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  drawerSection: {
    backgroundColor: Colors.glass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
    marginBottom: 20,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  drawerItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  drawerItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  drawerItemLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    color: Colors.text,
  },
  drawerFooter: {
    marginTop: 'auto',
    alignItems: 'center',
    gap: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: Colors.dangerBg,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
    width: '100%',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.danger,
  },
  versionText: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
  },
});
