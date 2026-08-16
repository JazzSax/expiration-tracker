import { isRunningInExpoGo } from 'expo';

/**
 * Expo Go warns on import that expo-notifications is "not fully supported"
 * there. That warning is about *remote* push, which this app never uses — its
 * alerts are all scheduled locally, and those work in Expo Go. The warning is
 * still worth explaining rather than hiding, so the owner isn't left wondering
 * whether alerts are broken.
 */
export function runningInExpoGo(): boolean {
  return isRunningInExpoGo();
}

/** The two warning strings expo-notifications emits inside Expo Go. */
export const EXPO_GO_NOTIFICATION_WARNINGS = [
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'expo-notifications: Android Push notifications (remote notifications) functionality',
];
