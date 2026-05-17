import React, { useEffect, useRef, useState } from 'react';
import {
  NavigationContainer,
  NavigationContainerRef,
  DarkTheme,
} from '@react-navigation/native';
import { PaperProvider, ActivityIndicator } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as QuickActions from 'expo-quick-actions';
import { useFonts } from 'expo-font';
import { colors, interFontAssets, paperTheme } from './src/theme';
import { getDatabase } from './src/db/database';
import { seedDatabase } from './src/db/seed';
import { useSettingsStore } from './src/stores/useSettingsStore';
import { useFDStore } from './src/stores/useFDStore';
import { useRecurringStore } from './src/stores/useRecurringStore';
import RootNavigator from './src/navigation/RootNavigator';
import LockScreen from './src/components/LockScreen';
import type { RootStackParamList } from './src/navigation/types';

export default function App() {
  const [fontsLoaded] = useFonts(interFontAssets);
  const [ready, setReady] = React.useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const screenLockEnabled = useSettingsStore(
    (s) => s.settings.screenLockEnabled,
  );
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList>>(null);
  const appStateRef = useRef(AppState.currentState);
  const backgroundAtRef = useRef<number | null>(null);
  useEffect(() => {
    (async () => {
      const db = await getDatabase();
      await seedDatabase(db);

      const { loadSettings } = useSettingsStore.getState();
      await loadSettings();

      const { settings } = useSettingsStore.getState();
      if (!settings.screenLockEnabled) {
        setIsLocked(false);
      }

      const { processMaturedDeposits } = useFDStore.getState();
      await processMaturedDeposits();

      try {
        const { processDue } = useRecurringStore.getState();
        await processDue();
      } catch (e) {
        console.error('[Recurring] processDue failed:', e);
      }

      try {
        QuickActions.setItems([
          {
            id: 'add_expense',
            title: 'Add Expense',
            icon: 'symbol:minus.circle',
            params: { type: 'expense' },
          },
          {
            id: 'add_income',
            title: 'Add Income',
            icon: 'symbol:plus.circle',
            params: { type: 'income' },
          },
        ]);
      } catch {
        // Quick Actions may not be available in Expo Go
      }

      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!screenLockEnabled) return;

    const LOCK_GRACE_MS = 10_000;
    const subscription = AppState.addEventListener('change', (nextState) => {
      // User leaves the app (e.g. presses home, switches apps, pulls notification shade)
      // Record the timestamp so we can measure how long the app was in the background
      if (
        appStateRef.current === 'active' &&
        nextState.match(/inactive|background/)
      ) {
        backgroundAtRef.current = Date.now();
      }

      // User returns to the app
      // Only re-lock if they were away for longer than the grace period (10s)
      // User returns to the app
      // Only re-lock if they were away for longer than the grace period (10s)
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        if (Date.now() - (backgroundAtRef.current ?? 0) >= LOCK_GRACE_MS) {
          setIsLocked(true);
        }
        backgroundAtRef.current = null;
      }

      // Always track the latest state so the next transition can be detected
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [screenLockEnabled]);

  useEffect(() => {
    if (!ready) return;

    const handleQuickAction = (action: QuickActions.Action) => {
      const type = (action.params as Record<string, unknown>)?.type as
        | 'income'
        | 'expense'
        | undefined;
      setTimeout(() => {
        navigationRef.current?.navigate('AddTransaction', {
          type: type ?? 'expense',
        });
      }, 500);
    };

    const initialAction = QuickActions.initial;
    if (initialAction) {
      handleQuickAction(initialAction);
    }

    const sub = QuickActions.addListener(handleQuickAction);
    return () => sub.remove();
  }, [ready]);

  if (!ready || !fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <NavigationContainer
            ref={navigationRef}
            theme={{
              ...DarkTheme,
              colors: {
                ...DarkTheme.colors,
                background: colors.background,
                card: colors.background,
                border: colors.border,
                primary: colors.primary,
                text: colors.text,
                notification: colors.primary,
              },
            }}
          >
            <StatusBar style="light" backgroundColor={colors.background} />
            <RootNavigator />
            {isLocked && screenLockEnabled && (
              <LockScreen onUnlock={() => setIsLocked(false)} />
            )}
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
