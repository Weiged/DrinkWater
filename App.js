import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { NotificationUtils } from './src/utils/notifications';
import { COLORS } from './src/constants';

const Tab = createBottomTabNavigator();

// 简单的图标组件
const TabIcon = ({ name, focused }) => {
  const getIcon = () => {
    switch (name) {
      case 'Home':
        return focused ? '🏠' : '🏡';
      case 'Stats':
        return focused ? '📊' : '📈';
      case 'Settings':
        return focused ? '⚙️' : '🔧';
      default:
        return '📱';
    }
  };

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 24 }}>{getIcon()}</Text>
    </View>
  );
};

export default function App() {
  useEffect(() => {
    // 初始化通知权限
    const initializeApp = async () => {
      try {
        await NotificationUtils.requestPermissions();
      } catch (error) {
        console.error('初始化应用失败:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor={COLORS.primary} />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused }) => (
              <TabIcon name={route.name} focused={focused} />
            ),
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.textSecondary,
            tabBarStyle: {
              backgroundColor: COLORS.surface,
              borderTopColor: COLORS.background,
              borderTopWidth: 1,
              paddingBottom: 5,
              paddingTop: 5,
              height: 60,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
            },
            headerShown: false,
          })}
        >
          <Tab.Screen 
            name="Home" 
            component={HomeScreen}
            options={{
              tabBarLabel: '首页',
            }}
          />
          <Tab.Screen 
            name="Stats" 
            component={StatsScreen}
            options={{
              tabBarLabel: '统计',
            }}
          />
          <Tab.Screen 
            name="Settings" 
            component={SettingsScreen}
            options={{
              tabBarLabel: '设置',
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
