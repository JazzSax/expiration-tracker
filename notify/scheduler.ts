import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getDb } from '../db';
import { getActiveBatches, getSettings } from '../db/queries';
import { todayIso } from '../domain/expiry';
import { computeSchedule, type ScheduledDigest } from '../domain/schedule';

const ANDROID_CHANNEL = 'expiry-alerts';

/** Foreground behaviour: an alert still shows while the app is open. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: 'Expiry alerts',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      lightColor: '#8E1F2F',
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return asked.granted;
}

function triggerFor(entry: ScheduledDigest): Notifications.NotificationTriggerInput {
  const [year, month, day] = entry.date.split('-').map(Number);
  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: new Date(year, month - 1, day, entry.hour, 0, 0),
    channelId: ANDROID_CHANNEL,
  };
}

/**
 * Rebuilds the entire notification schedule from the current database.
 *
 * Always cancels first: the schedule is derived state, so replacing it wholesale
 * is the only way it can't drift out of step with the stock on file. Call after
 * every mutation and whenever the app comes back to the foreground.
 */
export async function rescheduleNotifications(): Promise<ScheduledDigest[]> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const db = await getDb();
  const settings = await getSettings(db);
  if (!settings.notificationsEnabled) return [];
  if (!(await ensureNotificationPermission())) return [];

  const now = new Date();
  const schedule = computeSchedule(await getActiveBatches(db), settings, {
    today: todayIso(now),
    currentHour: now.getHours(),
  });

  for (const entry of schedule) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: entry.title,
        body: entry.body,
        data: { date: entry.date },
      },
      trigger: triggerFor(entry),
    });
  }

  return schedule;
}

/** Fires straight away so the owner can confirm alerts reach this phone. */
export async function sendTestNotification(): Promise<boolean> {
  if (!(await ensureNotificationPermission())) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Alerts are working',
      body: "This is what an expiry alert looks like. You'll get one at your chosen time.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      repeats: false,
      channelId: ANDROID_CHANNEL,
    },
  });
  return true;
}
