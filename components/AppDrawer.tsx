/**
 * AppDrawer.tsx — Custom animated side drawer (slides in from the left)
 *
 * Implementation notes:
 * - This is NOT a navigation-level drawer (not expo-router's Drawer).
 *   It is a plain animated View rendered as an absolutely positioned overlay
 *   at the root layout level so it can appear above all tab screens.
 * - Open/close state is managed by DrawerContext and driven by the hamburger
 *   button in the Home tab header.
 * - The `isMounted` state (not a ref) keeps the component in the tree during
 *   the close animation — without it, the drawer would disappear instantly
 *   before the slide-out animation completes.
 * - Navigation after a drawer item tap is delayed 200ms so the close
 *   animation has time to start before the screen transition begins.
 *
 * Drawer sections:
 *   FEATURES — Swipe Decisions, Random Picker, Watch Together
 *   ACCOUNT  — My QR Code
 *   FOOTER   — Log Out button + version number
 */

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

/** Width of the sliding drawer panel in logical pixels. */
const DRAWER_WIDTH = 280;

// ─── DrawerItem ───────────────────────────────────────────────────────────────

interface DrawerItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  iconColor?: string;
  isLast?: boolean; // When true, suppresses the bottom border divider
}

/**
 * A single tappable row inside the drawer panel.
 * Shows an icon, label, and a right-chevron arrow.
 */
function DrawerItem({ icon, label, onPress, iconColor, isLast }: DrawerItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.drawerItem,
        !isLast && styles.drawerItemBorder, // Divider between items (skip on last)
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

// ─── AppDrawer ────────────────────────────────────────────────────────────────

export default function AppDrawer() {
  const { isOpen, closeDrawer } = useDrawer();
  const { profile, logout, authUser } = useApp();
  const insets = useSafeAreaInsets();

  // Animated values for the drawer slide and dimmed backdrop
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  /**
   * `isMounted` keeps the component rendered during the closing animation.
   * Set to true when drawer opens → stays true during close animation →
   * set to false only after the animation callback fires.
   */
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Mount the component first, then start the slide-in animation
      setIsMounted(true);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,         // Slide fully into view
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,         // Fade overlay to full opacity
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Start slide-out, then unmount after animation finishes
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_WIDTH, // Slide off-screen to the left
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,             // Fade overlay out
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Unmount only after close animation is fully complete
        setIsMounted(false);
      });
    }
  }, [isOpen]);

  /**
   * Closes the drawer with haptic feedback, waits 200ms for the close
   * animation to begin, then navigates to the target screen.
   * The delay prevents the navigation from interrupting the animation.
   */
  const navigateTo = (path: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    closeDrawer();
    setTimeout(() => {
      router.push(path as any);
    }, 200);
  };

  /**
   * Logs the user out, closes the drawer, and redirects to the login screen.
   * Uses a warning haptic to signal a significant action.
   */
  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    closeDrawer();
    await logout();
    router.replace('/(auth)/login');
  };

  // Don't render anything when drawer is closed AND has finished animating out
  if (!isOpen && !isMounted) return null;

  return (
    // pointerEvents="none" when closed so taps fall through to the screen below
    <View style={styles.container} pointerEvents={isOpen ? 'auto' : 'none'}>

      {/* Dimmed backdrop — tapping it closes the drawer */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
      </Animated.View>

      {/* Sliding drawer panel */}
      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX }],
            // Respect device safe areas: notch / Dynamic Island on top, home indicator on bottom
            paddingTop: Platform.OS === 'web' ? 67 : insets.top + 16,
            paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 16,
          },
        ]}
      >
        {/* ── Header: avatar, name, email, close button ── */}
        <View style={styles.drawerHeader}>
          <View style={styles.drawerAvatar}>
            {profile?.avatarUrl ? (
              <Image
                source={{ uri: profile.avatarUrl }}
                style={styles.drawerAvatarImage}
                resizeMode="cover"
              />
            ) : (
              // Fallback: first initial of user's display name
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
          {/* Close (X) button in the top-right corner of the drawer */}
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

        {/* ── Features section ── */}
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

        {/* ── Account section ── */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.drawerSection}>
          <DrawerItem
            icon="qr-code-outline"
            label="My QR Code"
            onPress={() => navigateTo('/my-qr-code')}
            isLast
          />
        </View>

        {/* ── Footer: logout + version ── */}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    // Covers the entire screen as an overlay layer
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999, // Android requires explicit elevation for overlay stacking
  },
  overlay: {
    // Full-screen semi-transparent dimmed backdrop
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
    borderColor: Colors.gold, // Gold ring around avatar — theatre theme
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
    // ALL-CAPS category label above each drawer section
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
    // Adds a separator line below each item except the last one in a section
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  drawerItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.accentSoft, // Soft gold background for icon container
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
    marginTop: 'auto', // Pushes footer to the bottom of the drawer
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
