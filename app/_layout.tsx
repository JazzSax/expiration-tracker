import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  useFonts,
} from '@expo-google-fonts/archivo';
import { IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { AppState, LogBox, type AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';
import { palette } from '../constants/theme';
import { EXPO_GO_NOTIFICATION_WARNINGS } from '../lib/runtime';
import { rescheduleNotifications } from '../notify/scheduler';

// These two warnings are about remote push, which this app never uses; its
// alerts are scheduled locally and work in Expo Go. Alerts explains this in the
// UI rather than leaving it implied. Nothing else is silenced.
LogBox.ignoreLogs(EXPO_GO_NOTIFICATION_WARNINGS);

SplashScreen.preventAutoHideAsync().catch(() => {
  /* The splash screen may already be hidden on a fast reload. */
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  const appState = useRef(AppState.currentState);
  const router = useRouter();

  useEffect(() => {
    // Tapping an alert should land on the list it was talking about.
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      router.navigate('/');
    });
    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  useEffect(() => {
    // The schedule is derived from the database, and "today" moves on while the
    // app is closed. Rebuilding on every return to the foreground keeps the
    // pending alerts honest without anything running in the background.
    rescheduleNotifications().catch(() => {});

    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        rescheduleNotifications().catch(() => {});
      }
      appState.current = next;
    });
    return () => subscription.remove();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.paper } }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
