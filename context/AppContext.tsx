import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  UserProfile,
  ListEntry,
  ProgressEntry,
  Friend,
  ListStatus,
  MediaType,
} from "@/types/media";

interface AppState {
  profile: UserProfile | null;
  lists: ListEntry[];
  progress: ProgressEntry[];
  friends: Friend[];
  isLoading: boolean;
}

interface AppContextValue extends AppState {
  saveProfile: (profile: UserProfile) => Promise<void>;
  addToList: (entry: ListEntry) => Promise<void>;
  removeFromList: (mediaId: number) => Promise<void>;
  updateListStatus: (mediaId: number, status: ListStatus) => Promise<void>;
  getListByStatus: (status: ListStatus) => ListEntry[];
  getListEntry: (mediaId: number) => ListEntry | undefined;
  updateProgress: (entry: ProgressEntry) => Promise<void>;
  getProgress: (mediaId: number) => ProgressEntry | undefined;
  addFriend: (friend: Friend) => Promise<void>;
  removeFriend: (id: string) => Promise<void>;
  clearAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEYS = {
  profile: "@nextup_profile",
  lists: "@nextup_lists",
  progress: "@nextup_progress",
  friends: "@nextup_friends",
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    profile: null,
    lists: [],
    progress: [],
    friends: [],
    isLoading: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileStr, listsStr, progressStr, friendsStr] = await Promise.all(
        [
          AsyncStorage.getItem(STORAGE_KEYS.profile),
          AsyncStorage.getItem(STORAGE_KEYS.lists),
          AsyncStorage.getItem(STORAGE_KEYS.progress),
          AsyncStorage.getItem(STORAGE_KEYS.friends),
        ],
      );
      setState({
        profile: profileStr ? JSON.parse(profileStr) : null,
        lists: listsStr ? JSON.parse(listsStr) : [],
        progress: progressStr ? JSON.parse(progressStr) : [],
        friends: friendsStr ? JSON.parse(friendsStr) : [],
        isLoading: false,
      });
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const saveProfile = useCallback(async (profile: UserProfile) => {
    await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
    setState((prev) => ({ ...prev, profile }));
  }, []);

  const addToList = useCallback(async (entry: ListEntry) => {
    setState((prev) => {
      const filtered = prev.lists.filter((e) => e.mediaId !== entry.mediaId);
      const newLists = [...filtered, entry];
      AsyncStorage.setItem(STORAGE_KEYS.lists, JSON.stringify(newLists));
      return { ...prev, lists: newLists };
    });
  }, []);

  const removeFromList = useCallback(async (mediaId: number) => {
    setState((prev) => {
      const newLists = prev.lists.filter((e) => e.mediaId !== mediaId);
      AsyncStorage.setItem(STORAGE_KEYS.lists, JSON.stringify(newLists));
      return { ...prev, lists: newLists };
    });
  }, []);

  const updateListStatus = useCallback(
    async (mediaId: number, status: ListStatus) => {
      setState((prev) => {
        const newLists = prev.lists.map((e) =>
          e.mediaId === mediaId ? { ...e, status } : e,
        );
        AsyncStorage.setItem(STORAGE_KEYS.lists, JSON.stringify(newLists));
        return { ...prev, lists: newLists };
      });
    },
    [],
  );

  const getListByStatus = useCallback(
    (status: ListStatus) => {
      return state.lists.filter((e) => e.status === status);
    },
    [state.lists],
  );

  const getListEntry = useCallback(
    (mediaId: number) => {
      return state.lists.find((e) => e.mediaId === mediaId);
    },
    [state.lists],
  );

  const updateProgress = useCallback(async (entry: ProgressEntry) => {
    setState((prev) => {
      const filtered = prev.progress.filter((p) => p.mediaId !== entry.mediaId);
      const newProgress = [...filtered, entry];
      AsyncStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(newProgress));
      return { ...prev, progress: newProgress };
    });
  }, []);

  const getProgress = useCallback(
    (mediaId: number) => {
      return state.progress.find((p) => p.mediaId === mediaId);
    },
    [state.progress],
  );

  const addFriend = useCallback(async (friend: Friend) => {
    setState((prev) => {
      const newFriends = [...prev.friends, friend];
      AsyncStorage.setItem(STORAGE_KEYS.friends, JSON.stringify(newFriends));
      return { ...prev, friends: newFriends };
    });
  }, []);

  const removeFriend = useCallback(async (id: string) => {
    setState((prev) => {
      const newFriends = prev.friends.filter((f) => f.id !== id);
      AsyncStorage.setItem(STORAGE_KEYS.friends, JSON.stringify(newFriends));
      return { ...prev, friends: newFriends };
    });
  }, []);

  const clearAllData = useCallback(async () => {
    await Promise.all(
      Object.values(STORAGE_KEYS).map((k) => AsyncStorage.removeItem(k)),
    );
    setState({
      profile: null,
      lists: [],
      progress: [],
      friends: [],
      isLoading: false,
    });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      saveProfile,
      addToList,
      removeFromList,
      updateListStatus,
      getListByStatus,
      getListEntry,
      updateProgress,
      getProgress,
      addFriend,
      removeFriend,
      clearAllData,
    }),
    [
      state,
      saveProfile,
      addToList,
      removeFromList,
      updateListStatus,
      getListByStatus,
      getListEntry,
      updateProgress,
      getProgress,
      addFriend,
      removeFriend,
      clearAllData,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
