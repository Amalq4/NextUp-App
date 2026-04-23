/**
 * notifications.ts — Local notification service for NextUp
 *
 * Handles all scheduling, cancellation, and preference persistence for
 * local notifications. All notifications are local-only — no push tokens
 * or server involvement required.
 *
 * Notification types:
 *   1. Daily Watch Reminder — fires every evening at the user's chosen hour.
 *      Message adapts based on what's in the user's lists (watching vs want).
 *   2. New Item Reminder — fires ~20 hours after adding a title to the Want
 *      list, nudging the user to start watching it.
 *
 * Platform notes:
 *   - Android requires a notification channel to be created before scheduling.
 *   - iOS shows a permission dialog on first request.
 *   - Web: expo-notifications has partial web support; scheduling is silently
 *     ignored on web so no special guard is needed.
 *
 * AsyncStorage keys:
 *   @nextup_notif_enabled   → boolean (stringified)
 *   @nextup_notif_hour      → number 0–23 (stringified), default 19 (7 PM)
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ListEntry, ProgressEntry } from '@/types/media';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Android notification channel ID */
const CHANNEL_ID = 'nextup-reminders';

/** AsyncStorage keys for notification preferences */
const PREF_KEYS = {
  enabled: '@nextup_notif_enabled',
  hour: '@nextup_notif_hour',
};

/** Identifier for the scheduled daily reminder notification */
const DAILY_REMINDER_ID = 'nextup-daily-reminder';

/** Default reminder hour (7 PM) */
export const DEFAULT_REMINDER_HOUR = 19;

// ─── Android Channel Setup ────────────────────────────────────────────────────

/**
 * Creates the Android notification channel required before any notification
 * can be posted on Android 8+. Safe to call multiple times — Expo ignores
 * duplicate channel creation.
 */
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'NextUp Reminders',
      description: 'Daily watch reminders and new title nudges',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C9A24D', // Gold accent to match the app theme
    });
  }
}

// ─── Notification Behaviour ───────────────────────────────────────────────────

/**
 * Configures how notifications are presented when the app is in the foreground.
 * Without this, foreground notifications are silently dropped on iOS.
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,  // Show banner even when app is open
      shouldPlaySound: false, // No sound — unobtrusive
      shouldSetBadge: false,
    }),
  });
}

// ─── Permission ───────────────────────────────────────────────────────────────

/**
 * Requests notification permission from the OS.
 * On iOS, this shows the system permission dialog.
 * On Android 13+, this shows the POST_NOTIFICATIONS permission dialog.
 *
 * @returns true if permission was granted, false otherwise
 */
export async function requestNotificationPermission(): Promise<boolean> {
  // First check if already granted to avoid showing the dialog again
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Returns the current notification permission status without showing a dialog.
 * Use this to reflect the current state in Settings without triggering a prompt.
 *
 * @returns 'granted' | 'denied' | 'undetermined'
 */
export async function getNotificationPermissionStatus(): Promise<string> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

// ─── Preference Persistence ───────────────────────────────────────────────────

/** Saves the user's notification preferences to AsyncStorage. */
export async function saveNotificationPrefs(enabled: boolean, hour: number): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(PREF_KEYS.enabled, JSON.stringify(enabled)),
    AsyncStorage.setItem(PREF_KEYS.hour, JSON.stringify(hour)),
  ]);
}

/**
 * Loads the user's notification preferences from AsyncStorage.
 * Returns sensible defaults if no preferences have been saved yet.
 */
export async function loadNotificationPrefs(): Promise<{ enabled: boolean; hour: number }> {
  const [enabledStr, hourStr] = await Promise.all([
    AsyncStorage.getItem(PREF_KEYS.enabled),
    AsyncStorage.getItem(PREF_KEYS.hour),
  ]);
  return {
    enabled: enabledStr ? JSON.parse(enabledStr) : false,
    hour: hourStr ? JSON.parse(hourStr) : DEFAULT_REMINDER_HOUR,
  };
}

// ─── Scheduling ───────────────────────────────────────────────────────────────

/**
 * Schedules (or reschedules) the daily watch reminder.
 * Cancels any previously scheduled daily reminder first so there are never
 * duplicate notifications.
 *
 * The notification body adapts based on the user's current list:
 *   - Has "Watching" items → "Resume watching [Title]"
 *   - Has "Want" items → "You have N titles waiting..."
 *   - Neither → generic "What's on tonight?"
 *
 * @param hour     — Hour of the day to fire (0–23, e.g. 19 = 7 PM)
 * @param lists    — The user's current watchlist entries
 * @param progress — The user's episode progress entries (for continue-watching)
 */
export async function scheduleDailyReminder(
  hour: number,
  lists: ListEntry[],
  progress: ProgressEntry[],
): Promise<void> {
  // Always cancel the old reminder before creating a new one
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});

  // Build an adaptive notification message
  const watchingItems = lists.filter(l => l.status === 'watching');
  const wantItems = lists.filter(l => l.status === 'want');

  let title = "What's on tonight? 🎬";
  let body = "Open NextUp and pick something to watch.";

  if (watchingItems.length > 0) {
    // Prioritise "continue watching" nudge
    const firstWatching = watchingItems[0];
    const prog = progress.find(p => p.mediaId === firstWatching.mediaId);
    if (prog && firstWatching.mediaType === 'tv') {
      title = `Continue watching ${firstWatching.title}`;
      body = `You're on Season ${prog.seasonNumber}, Episode ${prog.episodeNumber}. Pick up where you left off.`;
    } else {
      title = `Continue watching ${firstWatching.title}`;
      body = "You left something unfinished. Time to watch?";
    }
  } else if (wantItems.length > 0) {
    title = "Ready to watch something new? 🍿";
    body =
      wantItems.length === 1
        ? `${wantItems[0].title} is waiting on your list.`
        : `You have ${wantItems.length} titles on your Want list. Pick one tonight!`;
  }

  // Schedule as a daily repeating notification at the specified hour
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title,
      body,
      sound: false,
      data: { type: 'daily_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
    },
  });
}

/**
 * Schedules a one-shot reminder for a newly added title.
 * Fires 20 hours after the item is added, nudging the user to start watching.
 * Uses a unique identifier per item so multiple reminders can coexist.
 *
 * @param title    — Display title of the media item
 * @param mediaId  — TMDB media ID (used to create a unique notification identifier)
 */
export async function scheduleNewItemReminder(title: string, mediaId: number): Promise<void> {
  const identifier = `nextup-new-item-${mediaId}`;

  // Cancel any previous reminder for this item before scheduling a new one
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: `Don't forget about ${title}`,
      body: "It's on your list — tonight's a great time to start watching!",
      sound: false,
      data: { type: 'new_item_reminder', mediaId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 20 * 60 * 60, // 20 hours from now
      repeats: false,
    },
  });
}

/**
 * Cancels the scheduled daily reminder only.
 * Call this when the user turns notifications off.
 */
export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
}

/**
 * Cancels ALL scheduled notifications for this app.
 * Used when the user clears all data or disables notifications.
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
