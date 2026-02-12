import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Colors from '@/theme/colors';
import { useApp } from '@/context/AppContext';
import { Friend } from '@/types/media';

export default function QRScannerScreen() {
  const insets = useSafeAreaInsets();
  const { profile, friends, addFriend } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scannedUser, setScannedUser] = useState<{ id: string; name: string } | null>(null);
  const [added, setAdded] = useState(false);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const scannedId = data.trim();

    if (!scannedId || scannedId.length < 5) {
      Alert.alert('Invalid QR', 'This QR code is not a valid NextUp user code.', [
        { text: 'Try Again', onPress: () => setScanned(false) },
      ]);
      return;
    }

    if (scannedId === profile?.id) {
      Alert.alert('That\'s You!', 'You can\'t add yourself as a friend.', [
        { text: 'Try Again', onPress: () => setScanned(false) },
      ]);
      return;
    }

    const alreadyFriend = friends.some(f => f.id === scannedId);
    if (alreadyFriend) {
      Alert.alert('Already Friends', 'This person is already in your friends list.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }

    setScannedUser({ id: scannedId, name: `User ${scannedId.slice(0, 6)}` });
  };

  const handleAddFriend = async () => {
    if (!scannedUser) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const friend: Friend = {
      id: scannedUser.id,
      displayName: scannedUser.name,
    };
    await addFriend(friend);
    setAdded(true);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.centerState}>
          <Text style={styles.permText}>Loading camera...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={{ paddingTop: Platform.OS === 'web' ? 67 : insets.top }}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Scan QR Code</Text>
            <View style={{ width: 24 }} />
          </View>
        </View>
        <View style={styles.centerState}>
          <Ionicons name="camera-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permText}>We need camera access to scan your friend's QR code</Text>
          {permission.status === 'denied' && !permission.canAskAgain ? (
            Platform.OS !== 'web' ? (
              <Pressable
                onPress={() => {
                  try {
                    const { Linking } = require('react-native');
                    Linking.openSettings();
                  } catch {}
                }}
                style={styles.permBtn}
              >
                <Text style={styles.permBtnText}>Open Settings</Text>
              </Pressable>
            ) : (
              <Text style={styles.permText}>Please enable camera in your browser settings</Text>
            )
          ) : (
            <Pressable onPress={requestPermission} style={styles.permBtn}>
              <Text style={styles.permBtnText}>Allow Camera</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerOverlay, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Scan QR Code</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {!scannedUser ? (
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        >
          <View style={styles.scanOverlay}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.scanHint}>Point at a friend's QR code</Text>
          </View>
        </CameraView>
      ) : (
        <View style={styles.resultContainer}>
          <View style={styles.resultCard}>
            <View style={styles.resultAvatar}>
              <Text style={styles.resultAvatarText}>
                {scannedUser.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.resultName}>{scannedUser.name}</Text>
            <Text style={styles.resultId}>ID: {scannedUser.id.slice(0, 12)}...</Text>

            {added ? (
              <View style={styles.addedBadge}>
                <Ionicons name="checkmark-circle" size={22} color={Colors.accent} />
                <Text style={styles.addedText}>Friend Added!</Text>
              </View>
            ) : (
              <Pressable
                onPress={handleAddFriend}
                style={({ pressed }) => [styles.addFriendBtn, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Ionicons name="person-add" size={18} color={Colors.black} />
                <Text style={styles.addFriendBtnText}>Add Friend</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => {
                if (added) {
                  router.back();
                } else {
                  setScanned(false);
                  setScannedUser(null);
                }
              }}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>
                {added ? 'Done' : 'Scan Again'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
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
  camera: {
    flex: 1,
  },
  scanOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scanFrame: {
    width: 240,
    height: 240,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: Colors.gold,
    borderWidth: 3,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  scanHint: {
    marginTop: 32,
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: '#FFFFFF',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  permTitle: {
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
    textAlign: 'center',
  },
  permText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  permBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  permBtnText: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.black,
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  resultCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 32,
    alignItems: 'center',
  },
  resultAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  resultAvatarText: {
    fontSize: 26,
    fontFamily: 'DMSans_700Bold',
    color: Colors.accent,
  },
  resultName: {
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
    marginBottom: 4,
  },
  resultId: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
    marginBottom: 20,
  },
  addFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    justifyContent: 'center',
  },
  addFriendBtnText: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.black,
  },
  addedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    marginBottom: 4,
  },
  addedText: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.accent,
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    color: Colors.text,
  },
});
