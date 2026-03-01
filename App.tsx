import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef, DarkTheme } from '@react-navigation/native';
import { PaperProvider, ActivityIndicator } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import * as QuickActions from 'expo-quick-actions';
import { colors, paperTheme } from './src/theme';
import { getDatabase } from './src/db/database';
import { seedDatabase } from './src/db/seed';
import { useSettingsStore } from './src/stores/useSettingsStore';
import { useFDStore } from './src/stores/useFDStore';
import RootNavigator from './src/navigation/RootNavigator';
import type { RootStackParamList } from './src/navigation/types';

export default function App() {
  const [ready, setReady] = React.useState(false);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const [fontsLoaded] = useFonts({ PlayfairDisplay_700Bold });

  useEffect(() => {
    (async () => {
      const db = await getDatabase();
      await seedDatabase(db);

      const { loadSettings } = useSettingsStore.getState();
      await loadSettings();

      const { processMaturedDeposits } = useFDStore.getState();
      await processMaturedDeposits();

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
    if (!ready) return;

    const handleQuickAction = (action: QuickActions.Action) => {
      const type = (action.params as Record<string, unknown>)?.type as 'income' | 'expense' | undefined;
      setTimeout(() => {
        navigationRef.current?.navigate('AddTransaction', { type: type ?? 'expense' });
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
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
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
