import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, TextInput, Pressable, Platform, ScrollView, Modal } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import AppBackground from '@/components/AppBackground';
import Colors from '@/theme/colors';
import { useApp } from '@/context/AppContext';
import { Friend, ListEntry, getPosterUrl, getGenreName } from '@/types/media';

type Tab = 'friends' | 'watch';

export default function WatchTogetherScreen() {
  const insets = useSafeAreaInsets();
  const { friends, addFriend, removeFriend, lists } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [showAdd, setShowAdd] = useState(false);
  const [friendName, setFriendName] = useState('');
  const [removeModal, setRemoveModal] = useState<Friend | null>(null);

  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [pickedItem, setPickedItem] = useState<ListEntry | null>(null);

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleAddFriend = async () => {
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

  const confirmRemove = async () => {
    if (!removeModal) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await removeFriend(removeModal.id);
    setSelectedFriends(prev => prev.filter(id => id !== removeModal.id));
    setRemoveModal(null);
  };

  const toggleFriend = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFriends(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const sharedWantList = useMemo(() => {
    return lists.filter(e => e.status === 'want');
  }, [lists]);

  const pickRandom = () => {
    if (sharedWantList.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    scale.value = withSequence(
      withTiming(0.85, { duration: 100 }),
      withSpring(1.05, { damping: 8 }),
      withSpring(1, { damping: 12 }),
    );
    const idx = Math.floor(Math.random() * sharedWantList.length);
    setPickedItem(sharedWantList[idx]);
  };

  const renderFriendCard = ({ item }: { item: Friend }) => (
    <View style={styles.friendCard}>
      <View style={styles.friendAvatar}>
        <Text style={styles.friendAvatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.displayName}</Text>
        <Text style={styles.friendId}>ID: {item.id.slice(0, 8)}</Text>
      </View>
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setRemoveModal(item); }}
        hitSlop={10}
        style={({ pressed }) => [styles.removeBtn, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.danger} />
      </Pressable>
    </View>
  );

  return (
    <AppBackground>
      <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Watch Together</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabBar}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('friends'); }}
            style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          >
            <Ionicons name="people" size={18} color={activeTab === 'friends' ? Colors.gold : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>Friends</Text>
          </Pressable>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('watch'); }}
            style={[styles.tab, activeTab === 'watch' && styles.tabActive]}
          >
            <Ionicons name="tv" size={18} color={activeTab === 'watch' ? Colors.gold : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'watch' && styles.tabTextActive]}>Watch</Text>
          </Pressable>
        </View>

        {activeTab === 'friends' ? (
          <View style={styles.tabContent}>
            <View style={styles.friendsHeader}>
              <Text style={styles.sectionTitle}>
                {friends.length} {friends.length === 1 ? 'Friend' : 'Friends'}
              </Text>
              <View style={styles.friendsHeaderBtns}>
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/qr-scanner'); }}
                  style={({ pressed }) => [styles.headerActionBtn, { opacity: pressed ? 0.7 : 1 }]}
                  testID="scan-qr-btn"
                  accessibilityLabel="Scan QR Code"
                >
                  <Ionicons name="scan-outline" size={18} color={Colors.gold} />
                </Pressable>
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAdd(!showAdd); }}
                  style={({ pressed }) => [styles.headerActionBtn, { opacity: pressed ? 0.7 : 1 }]}
                  testID="add-friend-btn"
                >
                  <Ionicons name={showAdd ? 'close' : 'person-add'} size={18} color={Colors.gold} />
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
                  onSubmitEditing={handleAddFriend}
                />
                <Pressable
                  onPress={handleAddFriend}
                  disabled={!friendName.trim()}
                  style={[styles.addConfirmBtn, !friendName.trim() && { opacity: 0.4 }]}
                >
                  <Ionicons name="checkmark" size={22} color={Colors.black} />
                </Pressable>
              </View>
            )}

            <FlatList
              data={friends}
              keyExtractor={item => item.id}
              renderItem={renderFriendCard}
              contentContainerStyle={[
                styles.friendsList,
                { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 20 },
              ]}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>No friends yet</Text>
                  <Text style={styles.emptyText}>
                    Add friends by name or scan their QR code to start watching together
                  </Text>
                </View>
              }
            />
          </View>
        ) : (
          <View style={styles.tabContent}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 90 }}
            >
              <Text style={styles.watchSectionLabel}>Select friends</Text>
              <FlatList
                data={friends}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.friendChipList}
                scrollEnabled={friends.length > 0}
                renderItem={({ item }) => {
                  const isSelected = selectedFriends.includes(item.id);
                  return (
                    <Pressable onPress={() => toggleFriend(item.id)} style={styles.friendChip}>
                      <View style={[styles.chipAvatar, isSelected && styles.chipAvatarSelected]}>
                        <Text style={[styles.chipAvatarText, isSelected && { color: Colors.text }]}>
                          {item.displayName.charAt(0).toUpperCase()}
                        </Text>
                        {isSelected && (
                          <View style={styles.checkMark}>
                            <Ionicons name="checkmark" size={10} color={Colors.text} />
                          </View>
                        )}
                      </View>
                      <Text style={styles.chipName} numberOfLines={1}>{item.displayName}</Text>
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('friends'); }}
                    style={styles.noFriendsLink}
                  >
                    <Ionicons name="person-add-outline" size={18} color={Colors.gold} />
                    <Text style={styles.noFriendsText}>Add friends first</Text>
                  </Pressable>
                }
              />

              <Text style={[styles.watchSectionLabel, { marginTop: 20 }]}>
                Want List ({sharedWantList.length} titles)
              </Text>
              <Text style={styles.helpText}>
                Pick a random title from your Want list to watch together
              </Text>

              {pickedItem && (
                <Animated.View style={[styles.resultCard, animStyle]}>
                  <Pressable
                    onPress={() => router.push({ pathname: '/details/[id]', params: { id: pickedItem.mediaId.toString(), type: pickedItem.mediaType } })}
                    style={styles.resultInner}
                  >
                    {pickedItem.posterPath ? (
                      <Image source={{ uri: getPosterUrl(pickedItem.posterPath, 'w342')! }} style={styles.resultPoster} contentFit="cover" />
                    ) : (
                      <View style={[styles.resultPoster, { backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="film-outline" size={24} color={Colors.textMuted} />
                      </View>
                    )}
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultTitle}>{pickedItem.title}</Text>
                      <Text style={styles.resultMeta}>
                        {pickedItem.mediaType === 'tv' ? 'TV Series' : 'Movie'}
                        {pickedItem.genreIds.length > 0 ? ` \u00B7 ${getGenreName(pickedItem.genreIds[0])}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={20} color={Colors.textMuted} />
                  </Pressable>
                </Animated.View>
              )}

              <FlatList
                data={sharedWantList.slice(0, 10)}
                keyExtractor={item => `${item.mediaId}`}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => router.push({ pathname: '/details/[id]', params: { id: item.mediaId.toString(), type: item.mediaType } })}
                    style={styles.titleRow}
                  >
                    {item.posterPath ? (
                      <Image source={{ uri: getPosterUrl(item.posterPath, 'w92')! }} style={styles.titlePoster} contentFit="cover" />
                    ) : (
                      <View style={[styles.titlePoster, { backgroundColor: Colors.surface }]} />
                    )}
                    <Text style={styles.titleName} numberOfLines={1}>{item.title}</Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </Pressable>
                )}
              />
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 10 }]}>
              <Pressable
                onPress={pickRandom}
                disabled={sharedWantList.length === 0 || selectedFriends.length === 0}
                style={({ pressed }) => [
                  styles.pickBtn,
                  (sharedWantList.length === 0 || selectedFriends.length === 0) && { opacity: 0.4 },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Ionicons name="shuffle" size={22} color={Colors.black} />
                <Text style={styles.pickBtnText}>
                  {pickedItem ? 'Re-roll' : 'Fair Pick'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <Modal visible={!!removeModal} transparent animationType="fade" onRequestClose={() => setRemoveModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="person-remove" size={28} color={Colors.danger} />
            </View>
            <Text style={styles.modalTitle}>Remove Friend?</Text>
            <Text style={styles.modalDesc}>
              Remove {removeModal?.displayName} from your friends list?
            </Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setRemoveModal(null)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmRemove} style={styles.modalDeleteBtn}>
                <Text style={styles.modalDeleteText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.text,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: Colors.glass,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.gold,
  },
  tabContent: {
    flex: 1,
  },
  friendsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.text,
  },
  friendsHeaderBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accentBorder,
  },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 10,
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
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
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsList: {
    paddingHorizontal: 20,
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
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarText: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: Colors.gold,
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
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 50,
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
  watchSectionLabel: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.textSecondary,
    marginBottom: 10,
    marginTop: 10,
    marginHorizontal: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  friendChipList: {
    paddingHorizontal: 20,
    gap: 14,
  },
  friendChip: {
    alignItems: 'center',
    width: 64,
  },
  chipAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.glassBorder,
  },
  chipAvatarSelected: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  chipAvatarText: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: Colors.textSecondary,
  },
  checkMark: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  chipName: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: Colors.text,
    marginTop: 4,
  },
  noFriendsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  noFriendsText: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: Colors.gold,
  },
  helpText: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
    marginBottom: 10,
    marginHorizontal: 20,
  },
  resultCard: {
    backgroundColor: Colors.glass,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.gold,
    overflow: 'hidden',
    marginBottom: 16,
    marginHorizontal: 20,
  },
  resultInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  resultPoster: {
    width: 52,
    height: 78,
    borderRadius: 8,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultTitle: {
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
  },
  resultMeta: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    gap: 10,
  },
  titlePoster: {
    width: 36,
    height: 54,
    borderRadius: 6,
  },
  titleName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: Colors.text,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
  },
  pickBtnText: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.black,
  },
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
    width: 56,
    height: 56,
    borderRadius: 28,
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
