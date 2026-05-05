import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Medication } from '../types';

// Show alerts + play sound when a notification arrives while the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Request permission to send notifications. Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Cancel all scheduled notifications then re-schedule one daily notification
 * for every scheduled time across all medications.
 *
 * Safe to call whenever medications or their times change.
 */
export async function syncNotifications(medications: Medication[]): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  // Set up Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Medication Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00BCD4',
      sound: 'default',
    });
  }

  // Cancel all previously scheduled notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Re-schedule one repeating daily notification per medication × time
  for (const med of medications) {
    for (const timeKey of med.scheduledTimes) {
      const [hour, minute] = timeKey.split(':').map(Number);

      const doseLabel = [med.dose, med.form].filter(Boolean).join(' ');
      const body = doseLabel
        ? `Time to take ${med.name} — ${doseLabel}`
        : `Time to take ${med.name}`;

      await Notifications.scheduleNotificationAsync({
        identifier: `${med.id}_${timeKey}`,
        content: {
          title: `💊 ${med.birdTraits.name || med.name}`,
          body,
          sound: 'default',
          ...(Platform.OS === 'android' && { channelId: 'reminders' }),
          data: { medicationId: med.id, timeKey },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          repeats: true,
          hour,
          minute,
        },
      });
    }
  }
}

/** Cancel all notifications for a specific medication (e.g. when deleted). */
export async function cancelMedicationNotifications(medicationId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if ((n.identifier as string).startsWith(`${medicationId}_`)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}
