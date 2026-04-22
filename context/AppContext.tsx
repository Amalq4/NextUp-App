/**
 * AppContext.tsx
 *
 * Global application state management using React Context + AsyncStorage.
 *
 * Architecture overview:
 * - All user data (profile, lists, progress, friends) is stored locally on-device
 *   using AsyncStorage. There is no cloud sync.
 * - Multi-user support is achieved by scoping every AsyncStorage key to the
 *   logged-in user's email address (e.g. "@nextup_user_john@example.com_lists").
 * - Two global keys exist outside of user scope:
 *     @nextup_auth_users    → registry of all accounts created on this device
 *     @nextup_current_auth  → email of the currently active session
 * - Mutations use functional setState so they read the latest state snapshot
 *   before writing, avoiding stale-closure bugs.
 * - All context methods are memoised with useCallback to prevent unnecessary
 *   re-renders in consumer components.
 */

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

// ─── Type Definitions ────────────────────────────────────────────────────────

/** Credentials stored in the global auth registry. Passwords are stored in
 *  plain text because all data lives locally on the device (no server). */
export interface AuthUser {
  email: string;
  password: string;
  name: string;
}

/** Shape of the raw state slice held in the AppContext provider. */
interface AppState {
  profile: UserProfile | null;
  lists: ListEntry[];
  progress: ProgressEntry[];
  friends: Friend[];
  isLoading: boolean;
  isAuthenticated: boolean;
  authUser: AuthUser | null;
}

/** Full context value exposed to consumers — state + all action methods. */
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

// ─── Context Initialisation ───────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

// ─── AsyncStorage Key Helpers ─────────────────────────────────────────────────

/**
 * Keys that are NOT scoped to a specific user — shared across all accounts
 * on this device.
 */
const GLOBAL_KEYS = {
  authUsers: "@nextup_auth_users",   // JSON array of all AuthUser objects
  currentAuth: "@nextup_current_auth", // email string of the active session
};

/**
 * Returns the four per-user AsyncStorage keys for a given email address.
 * Using the email as a namespace lets multiple accounts coexist on one device.
 *
 * Example: userKeys("alice@example.com").lists
 *   → "@nextup_user_alice@example.com_lists"
 */
function userKeys(email: string) {
  const prefix = `@nextup_user_${email}`;
  return {
    profile: `${prefix}_profile`,
    lists: `${prefix}_lists`,
    progress: `${prefix}_progress`,
    friends: `${prefix}_friends`,
  };
}

// ─── Data I/O Helpers ─────────────────────────────────────────────────────────

/**
 * Reads all four data buckets for a user in parallel from AsyncStorage.
 * Returns empty defaults when a key has never been written.
 */
async function loadUserData(email: string): Promise<{
  profile: UserProfile | null;
  lists: ListEntry[];
  progress: ProgressEntry[];
  friends: Friend[];
}> {
  const keys = userKeys(email);
  // Fetch all four keys simultaneously to minimise I/O latency
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

/**
 * Persists a single data field for the given user to AsyncStorage.
 * Called from within functional setState callbacks so the serialised value
 * reflects the latest state at the time of the write.
 */
async function saveUserField(
  email: string,
  field: "profile" | "lists" | "progress" | "friends",
  data: unknown,
): Promise<void> {
  const keys = userKeys(email);
  await AsyncStorage.setItem(keys[field], JSON.stringify(data));
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    profile: null,
    lists: [],
    progress: [],
    friends: [],
    isLoading: true,   // true until the stored session has been resolved
    isAuthenticated: false,
    authUser: null,
  });

  /**
   * Ref instead of state for the current user's email so that it is always
   * up-to-date inside async callbacks without requiring re-renders or being
   * listed as a useCallback dependency.
   */
  const currentEmailRef = useRef<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    loadSession();
  }, []);

  /**
   * Checks AsyncStorage for a persisted session on app start.
   * If a valid session exists, loads that user's data and authenticates them
   * without showing the login screen.
   */
  const loadSession = async () => {
    try {
      const [currentAuthEmail, authUsersStr] = await Promise.all([
        AsyncStorage.getItem(GLOBAL_KEYS.currentAuth),
        AsyncStorage.getItem(GLOBAL_KEYS.authUsers),
      ]);

      // No session stored — show the login screen
      if (!currentAuthEmail || !authUsersStr) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const users: AuthUser[] = JSON.parse(authUsersStr);
      const found = users.find((u) => u.email === currentAuthEmail);

      // Session email doesn't match any registered account — clean up stale key
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
      // If anything fails (corrupt data, etc.) fall back to unauthenticated
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // ─── Profile ──────────────────────────────────────────────────────────────

  /** Saves the updated profile both in-memory and to AsyncStorage. */
  const saveProfile = useCallback(async (profile: UserProfile) => {
    const email = currentEmailRef.current;
    if (!email) return;
    await saveUserField(email, "profile", profile);
    setState((prev) => ({ ...prev, profile }));
  }, []);

  // ─── Watchlist ────────────────────────────────────────────────────────────

  /**
   * Adds or replaces a list entry (upsert behaviour).
   * If the media is already in the list, the old entry is removed first so
   * there are never duplicates.
   */
  const addToList = useCallback(async (entry: ListEntry) => {
    const email = currentEmailRef.current;
    if (!email) return;
    setState((prev) => {
      // Remove any existing entry for this media item before inserting
      const filtered = prev.lists.filter((e) => e.mediaId !== entry.mediaId);
      const newLists = [...filtered, entry];
      saveUserField(email, "lists", newLists); // fire-and-forget persist
      return { ...prev, lists: newLists };
    });
  }, []);

  /** Removes a media item from the watchlist entirely. */
  const removeFromList = useCallback(async (mediaId: number) => {
    const email = currentEmailRef.current;
    if (!email) return;
    setState((prev) => {
      const newLists = prev.lists.filter((e) => e.mediaId !== mediaId);
      saveUserField(email, "lists", newLists);
      return { ...prev, lists: newLists };
    });
  }, []);

  /**
   * Changes the status of an existing list entry (want → watching → watched).
   * Only updates the matching entry; all others are left untouched.
   */
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

  /** Returns all list entries matching the given status (want / watching / watched). */
  const getListByStatus = useCallback(
    (status: ListStatus) => {
      return state.lists.filter((e) => e.status === status);
    },
    [state.lists],
  );

  /** Looks up a single list entry by TMDB media ID. Returns undefined if not in list. */
  const getListEntry = useCallback(
    (mediaId: number) => {
      return state.lists.find((e) => e.mediaId === mediaId);
    },
    [state.lists],
  );

  // ─── Episode Progress ─────────────────────────────────────────────────────

  /**
   * Saves or updates the watch progress for a TV show (upsert).
   * Tracks the most recently watched season + episode for each show.
   */
  const updateProgress = useCallback(async (entry: ProgressEntry) => {
    const email = currentEmailRef.current;
    if (!email) return;
    setState((prev) => {
      // Remove the old progress record for this show before inserting the new one
      const filtered = prev.progress.filter((p) => p.mediaId !== entry.mediaId);
      const newProgress = [...filtered, entry];
      saveUserField(email, "progress", newProgress);
      return { ...prev, progress: newProgress };
    });
  }, []);

  /** Returns the progress record for a given TV show, or undefined if none exists. */
  const getProgress = useCallback(
    (mediaId: number) => {
      return state.progress.find((p) => p.mediaId === mediaId);
    },
    [state.progress],
  );

  // ─── Friends ──────────────────────────────────────────────────────────────

  /** Adds a new friend to the local friends list. */
  const addFriend = useCallback(async (friend: Friend) => {
    const email = currentEmailRef.current;
    if (!email) return;
    setState((prev) => {
      const newFriends = [...prev.friends, friend];
      saveUserField(email, "friends", newFriends);
      return { ...prev, friends: newFriends };
    });
  }, []);

  /** Removes a friend by their UUID. */
  const removeFriend = useCallback(async (id: string) => {
    const email = currentEmailRef.current;
    if (!email) return;
    setState((prev) => {
      const newFriends = prev.friends.filter((f) => f.id !== id);
      saveUserField(email, "friends", newFriends);
      return { ...prev, friends: newFriends };
    });
  }, []);

  // ─── Auth ─────────────────────────────────────────────────────────────────

  /**
   * Wipes all data for the current user and clears the active session.
   * Used from Settings → "Clear All Data".
   */
  const clearAllData = useCallback(async () => {
    const email = currentEmailRef.current;
    if (email) {
      const keys = userKeys(email);
      // Delete all four per-user keys simultaneously
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

  /**
   * Validates credentials against the local auth registry.
   * On success, loads the user's data and marks the session as active.
   * Returns true on success, false on invalid credentials.
   */
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const authUsersStr = await AsyncStorage.getItem(GLOBAL_KEYS.authUsers);
      if (!authUsersStr) return false;

      const users: AuthUser[] = JSON.parse(authUsersStr);
      const found = users.find(
        (u) => u.email === email && u.password === password,
      );
      if (!found) return false;

      // Persist the session so next app launch auto-logs in
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

  /**
   * Creates a new account, initialises empty data buckets, and logs the user in.
   * Returns false if the email is already registered on this device.
   *
   * Profile ID is generated using a timestamp + random suffix to avoid
   * collisions (the uuid package is avoided because it requires
   * crypto.getRandomValues() which crashes on some React Native environments).
   */
  const signup = useCallback(
    async (name: string, email: string, password: string): Promise<boolean> => {
      try {
        const authUsersStr = await AsyncStorage.getItem(GLOBAL_KEYS.authUsers);
        const users: AuthUser[] = authUsersStr ? JSON.parse(authUsersStr) : [];

        // Prevent duplicate accounts with the same email
        const exists = users.find((u) => u.email === email);
        if (exists) return false;

        const newUser: AuthUser = { email, password, name };
        const updatedUsers = [...users, newUser];

        // Build a minimal default profile; onboarded=false triggers the
        // onboarding flow on first login
        const newProfile: UserProfile = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name,
          favoriteGenres: [],
          language: "en",
          region: "US",
          onboarded: false,
        };

        const keys = userKeys(email);

        // Write everything in one parallel batch to minimise async round-trips
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

  /**
   * Ends the current session without deleting user data.
   * The user can log back in later and their lists will still be there.
   */
  const logout = useCallback(async (): Promise<void> => {
    await AsyncStorage.removeItem(GLOBAL_KEYS.currentAuth);
    currentEmailRef.current = null;
    // Reset in-memory state; data is preserved in AsyncStorage under the email key
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

  // ─── Memoised Context Value ───────────────────────────────────────────────

  /**
   * Wrap the full value in useMemo so consumers only re-render when something
   * they actually depend on changes — not on every unrelated state update.
   */
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

// ─── Consumer Hook ────────────────────────────────────────────────────────────

/**
 * Custom hook for consuming AppContext. Throws a descriptive error when called
 * outside of AppProvider to surface mis-use early in development.
 */
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
