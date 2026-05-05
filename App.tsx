import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider, useApp } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import { loadMedicationDatabase } from './src/data/medications';

function Inner() {
  const { isLoading } = useApp();
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F9FA', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#00BCD4" />
      </View>
    );
  }
  return <AppNavigator />;
}

export default function App() {
  useEffect(() => {
    loadMedicationDatabase();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <Inner />
      </AppProvider>
    </GestureHandlerRootView>
  );
}
