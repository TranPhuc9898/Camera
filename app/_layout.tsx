import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/lib/hooks/use-color-scheme';
import { QueryProvider } from '@/lib/api/query-provider';
import { initSentry } from '@/lib/analytics/sentry';
import { logger } from '@/lib/logger';
import { Neo } from '@/theme/colors';
import '@/lib/i18n';

initSentry();
logger.info('Unicorn boot');
SystemUI.setBackgroundColorAsync(Neo.bgApp);

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // App-level side effects (e.g. analytics screen tracking) go here.
  }, []);

  const navTheme = useMemo(() => {
    const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: Neo.bgApp } };
  }, [colorScheme]);

  return (
    <QueryProvider>
      <SafeAreaProvider style={{ flex: 1, backgroundColor: Neo.bgApp }}>
        <ThemeProvider value={navTheme}>
          <Stack screenOptions={{ contentStyle: { backgroundColor: Neo.bgApp } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryProvider>
  );
}
