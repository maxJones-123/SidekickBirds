import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { RootStackParamList, MainTabParamList } from '../types';
import HomeScreen from '../screens/HomeScreen';
import AvatarScreen from '../screens/AvatarScreen';
import RestockScreen from '../screens/RestockScreen';
import AddMedicationScreen from '../screens/AddMedicationScreen';
import EditRemindersScreen from '../screens/EditRemindersScreen';
import EmergencyContactsScreen from '../screens/EmergencyContactsScreen';
import TakeSuccessScreen from '../screens/TakeSuccessScreen';
import HowItWorksScreen from '../screens/HowItWorksScreen';
import BirdDetailScreen from '../screens/BirdDetailScreen';
import ShopScreen from '../screens/ShopScreen';
import CustomiseHomeScreen from '../screens/CustomiseHomeScreen';
import ManageMedicationsScreen from '../screens/ManageMedicationsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E8EFF3',
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 4,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarActiveTintColor: '#00BCD4',
        tabBarInactiveTintColor: '#7A8B9A',
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Avatar"
        component={AvatarScreen}
        options={{
          tabBarLabel: 'Avatar',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🐦" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Restock"
        component={RestockScreen}
        options={{
          tabBarLabel: 'Restock',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📦" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#F5F9FA' },
          headerTintColor: '#1A2B3C',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#F5F9FA' },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="AddMedication"
          component={AddMedicationScreen}
          options={{ title: 'Add Medication' }}
        />
        <Stack.Screen
          name="EditReminders"
          component={EditRemindersScreen}
          options={{ title: 'Edit Reminders' }}
        />
        <Stack.Screen
          name="EmergencyContacts"
          component={EmergencyContactsScreen}
          options={{ title: 'Emergency Contacts' }}
        />
        <Stack.Screen
          name="TakeSuccess"
          component={TakeSuccessScreen}
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="HowItWorks"
          component={HowItWorksScreen}
          options={{ title: 'How It Works' }}
        />
        <Stack.Screen
          name="BirdDetail"
          component={BirdDetailScreen}
          options={{ title: '' }}
        />
        <Stack.Screen
          name="Shop"
          component={ShopScreen}
          options={{ title: 'Cosmetics Shop' }}
        />
        <Stack.Screen
          name="CustomiseHome"
          component={CustomiseHomeScreen}
          options={{ title: 'Customize Home' }}
        />
        <Stack.Screen
          name="ManageMedications"
          component={ManageMedicationsScreen}
          options={{ title: 'Manage Medications' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
