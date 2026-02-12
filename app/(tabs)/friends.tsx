import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TextInput, Pressable, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import AppBackground from '@/components/AppBackground';
import Colors from '@/theme/colors';
import { useApp } from '@/context/AppContext';
import { Friend } from '@/types/media';

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const { friends, addFriend, removeFriend } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [friendName, setFriendName] = useState('');

  const handleAdd = async () => {
    if (!friendName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const friend: Friend = {
      id: Crypto.randomUUID(),
      displayName: friendName.trim(),
    };
    await addFriend(friend);
    setFriendName('');
    setShowAdd(false);
  };

  const handleRemove = (friend: Friend) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Remove Friend',
      `Remove ${friend.displayName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeFriend(friend.id) },
      ]
    );
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <View style={styles.friendCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.displayName}</Text>
        <Text style={styles.friendId}>ID: {item.id.slice(0, 8)}</Text>
      </View>
      <Pressable onPress={() => handleRemove(item)} hitSlop={10}>
        <Ionicons name="trash-outline" size={20} color={Colors.danger} />
      </Pressable>
    </View>
  );

  return (
    <AppBackground>
      <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Friends</Text>
          <View style={styles.headerBtns}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/qr-scanner'); }}
              style={styles.addBtn}
              testID="scan-qr-btn"
              accessibilityLabel="Scan QR Code"
              accessibilityRole="button"
            >
              <Ionicons name="scan-outline" size={20} color={Colors.tan} style={{ pointerEvents: 'none' as any }} />
            </Pressable>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAdd(!showAdd); }}
              style={styles.addBtn}
            >
              <Ionicons name={showAdd ? 'close' : 'person-add'} size={20} color={Colors.tan} />
            </Pressable>
          </View>
        </View>

        {showAdd && (
          <View style={styles.addCard}>
            <TextInput
              style={styles.addInput}
              placeholder="Friend's name"
              placeholderTextColor={Colors.textMuted}
              value={friendName}
              onChangeText={setFriendName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <Pressable
              onPress={handleAdd}
              disabled={!friendName.trim()}
              style={[styles.addConfirmBtn, !friendName.trim() && { opacity: 0.4 }]}
            >
              <Ionicons name="checkmark" size={22} color={Colors.white} />
            </Pressable>
          </View>
        )}

        {friends.length > 0 && (
          <Pressable
            onPress={() => router.push('/watch-together')}
            style={({ pressed }) => [styles.watchBtn, { opacity: pressed ? 0.9 : 1 }]}
          >
            <Ionicons name="people" size={20} color={Colors.white} />
            <Text style={styles.watchBtnText}>Watch Together</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </Pressable>
        )}

        <FlatList
          data={friends}
          keyExtractor={item => item.id}
          renderItem={renderFriend}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={52} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No friends yet</Text>
              <Text style={styles.emptyText}>Add friends to start watching together</Text>
            </View>
          }
        />
      </View>
    </AppBackground>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
  },
  headerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  addInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: Colors.text,
    backgroundColor: Colors.inputBg,
  },
  addConfirmBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.accent,
  },
  watchBtnText: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.white,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glass,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: Colors.tan,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.text,
  },
  friendId: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
