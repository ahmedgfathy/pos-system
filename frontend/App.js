import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { registerRootComponent } from 'expo';
import { colors } from './src/theme';
import LoginScreen from './src/screens/LoginScreen';
import POSScreen from './src/screens/POSScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import AccountingScreen from './src/screens/AccountingScreen';
import CashierScreen from './src/screens/CashierScreen';

const Tab = createBottomTabNavigator();

function MainTabs({ user, onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'web' ? 8 : 4,
          paddingTop: 4,
          height: Platform.OS === 'web' ? 60 : 70,
        },
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="POS"
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="shopping-cart" size={size} color={color} />,
        }}
      >
        {() => <POSScreen user={user} onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen
        name="Inventory"
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="package" size={size} color={color} />,
        }}
      >
        {() => <InventoryScreen user={user} onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen
        name="Cashier"
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      >
        {() => <CashierScreen user={user} onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen
        name="Accounting"
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" size={size} color={color} />,
        }}
      >
        {() => <AccountingScreen user={user} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  const handleLogout = () => setUser(null);

  if (!user) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <LoginScreen onLogin={setUser} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <MainTabs user={user} onLogout={handleLogout} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

registerRootComponent(App);
