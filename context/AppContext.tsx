import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
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

export interface AuthUser {
  email: string;
  password: string;
  name: string;
}

interface AppState {
  profile: UserProfile | null;
  lists: ListEntry[];
  progress: ProgressEntry[];
  friends: Friend[];
  isLoading: boolean;
  isAuthenticated: boolean;
  authUser: AuthUser | null;
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
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const GLOBAL_KEYS = {
  authUsers: "@nextup_auth_users",
  currentAuth: "@nextup_current_auth",
};

function userKeys(email: string) {
  const prefix = `@nextup_user_${email}`;
  return {
    profile: `${prefix}_profile`,
    lists: `${prefix}_lists`,
    progress: `${prefix}_progress`,
    friends: `${prefix}_friends`,
  };
}

async function loadUserData(email: string): Promise<{
  profile: UserProfile | null;
  lists: ListEntry[];
  progress: ProgressEntry[];
  friends: Friend[];
}> {
  const keys = userKeys(email);
  const [profileStr, listsStr, progressStr, friendsStr] = await Promise.all([
    AsyncStorage.getItem(keys.profile),
    AsyncStorage.getItem(keys.lists),
    AsyncStorage.getItem(keys.progress),
    AsyncStorage.getItem(keys.friends),
  ]);
  return {
    profile: profileStr ? JSON.parse(profileStr) : null,
    lists: listsStr ? JSON.parse(listsStr) : [],
    progress: progressStr ? JSON.parse(progressStr) : [],
    friends: friendsStr ? JSON.parse(friendsStr) : [],
  };
}

async function saveUserField(email: string, field: "profile" | "lists" | "progress" | "friends", data: unknown): Promise<void> {
  const keys = userKeys(email);
  await AsyncStorage.setItem(keys[field], JSON.stringify(data));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    profile: null,
    lists: [],
    progress: [],
    friends: [],
    isLoading: true,
    isAuthenticated: false,
    authUser: null,
  });

  const currentEmailRef = useRef<string | null>(null);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const [currentAuthEmail, authUsersStr] = await Promise.all([
        AsyncStorage.getItem(GLOBAL_KEYS.currentAuth),
        AsyncStorage.getItem(GLOBAL_KEYS.authUsers),
      ]);

      if (!currentAuthEmail || !authUsersStr) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const users: AuthUser[] = JSON.parse(authUsersStr);
      const found = users.find((u) => u.email === currentAuthEmail);
      if (!found) {
        await AsyncStorage.removeItem(GLOBAL_KEYS.currentAuth);
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      currentEmailRef.current = currentAuthEmail;
      const userData = await loadUserData(currentAuthEmail);

      setState({
        ...userData,
        isLoading: false,
        isAuthenticated: true,
        authUser: found,
      });
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const saveProfile = useCallback(async (profile: UserProfile) => {
    const email = currentEmailRef.current;
    if (!email) return;
    await saveUserField(email, "profile", profile);
    setState((prev) => ({ ...prev, profile }));
  }, []);

  const addToList = useCallback(async (entry: ListEntry) => {
    const email = currentEmailRef.current;
    if (!email) return;
    setState((prev) => {
      const filtered = prev.lists.filter((e) => e.mediaId !== entry.mediaId);
      const newLists = [...filtered, entry];
      saveUserField(email, "lists", newLists);
      return { ...prev, lists: newLists };
    });
  }, []);

  const removeFromList = useCallback(async (mediaId: number) => {
    const email = currentEmailRef.current;
    if (!email) return;
    setState((prev) => {
      const newLists = prev.lists.filter((e) => e.mediaId !== mediaId);
      saveUserField(email, "lists", newLists);
      return { ...prev, lists: newLists };
    });
  }, []);

  const updateListStatus = useCallback(
    async (mediaId: number, status: ListStatus) => {
      const email = currentEmailRef.current;
      if (!email) return;
      setState((prev) => {
        const newLists = prev.lists.map((e) =>
          e.mediaId === mediaId ? { ...e, status } : e,
        );
        saveUserField(email, "lists", newLists);
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
    const email = currentEmailRef.current;
    if (!email) return;
    setState((prev) => {
      const filtered = prev.progress.filter((p) => p.mediaId !== entry.mediaId);
      const newProgress = [...filtered, entry];
      saveUserField(email, "progress", newProgress);
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
    const email = currentEmailRef.current;
    if (!email) return;
    setState((prev) => {
      const newFriends = [...prev.friends, friend];
      saveUserField(email, "friends", newFriends);
      return { ...prev, friends: newFriends };
    });
  }, []);

  const removeFriend = useCallback(async (id: string) => {
    const email = currentEmailRef.current;
    if (!email) return;
    setState((prev) => {
      const newFriends = prev.friends.filter((f) => f.id !== id);
      saveUserField(email, "friends", newFriends);
      return { ...prev, friends: newFriends };
    });
  }, []);

  const clearAllData = useCallback(async () => {
    const email = currentEmailRef.current;
    if (email) {
      const keys = userKeys(email);
      await Promise.all(
        Object.values(keys).map((k) => AsyncStorage.removeItem(k)),
      );
    }
    await AsyncStorage.removeItem(GLOBAL_KEYS.currentAuth);
    currentEmailRef.current = null;
    setState({
      profile: null,
      lists: [],
      progress: [],
      friends: [],
      isLoading: false,
      isAuthenticated: false,
      authUser: null,
    });
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const authUsersStr = await AsyncStorage.getItem(GLOBAL_KEYS.authUsers);
      if (!authUsersStr) return false;

      const users: AuthUser[] = JSON.parse(authUsersStr);
      const found = users.find(
        (u) => u.email === email && u.password === password,
      );
      if (!found) return false;

      await AsyncStorage.setItem(GLOBAL_KEYS.currentAuth, email);
      currentEmailRef.current = email;

      const userData = await loadUserData(email);

      setState((prev) => ({
        ...prev,
        ...userData,
        isAuthenticated: true,
        authUser: found,
      }));

      return true;
    } catch {
      return false;
    }
  }, []);

  const signup = useCallback(
    async (name: string, email: string, password: string): Promise<boolean> => {
      try {
        const authUsersStr = await AsyncStorage.getItem(GLOBAL_KEYS.authUsers);
        const users: AuthUser[] = authUsersStr ? JSON.parse(authUsersStr) : [];

        const exists = users.find((u) => u.email === email);
        if (exists) return false;

        const newUser: AuthUser = { email, password, name };
        const updatedUsers = [...users, newUser];

        const newProfile: UserProfile = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name,
          favoriteGenres: [],
          language: "en",
          region: "US",
          onboarded: false,
        };

        const keys = userKeys(email);
        await Promise.all([
          AsyncStorage.setItem(GLOBAL_KEYS.authUsers, JSON.stringify(updatedUsers)),
          AsyncStorage.setItem(GLOBAL_KEYS.currentAuth, email),
          AsyncStorage.setItem(keys.profile, JSON.stringify(newProfile)),
          AsyncStorage.setItem(keys.lists, JSON.stringify([])),
          AsyncStorage.setItem(keys.progress, JSON.stringify([])),
          AsyncStorage.setItem(keys.friends, JSON.stringify([])),
        ]);

        currentEmailRef.current = email;

        setState((prev) => ({
          ...prev,
          isAuthenticated: true,
          authUser: newUser,
          profile: newProfile,
          lists: [],
          progress: [],
          friends: [],
        }));

        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    await AsyncStorage.removeItem(GLOBAL_KEYS.currentAuth);
    currentEmailRef.current = null;
    setState((prev) => ({
      ...prev,
      isAuthenticated: false,
      authUser: null,
      profile: null,
      lists: [],
      progress: [],
      friends: [],
    }));
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
      login,
      signup,
      logout,
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
      login,
      signup,
      logout,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
