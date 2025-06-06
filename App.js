import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, AppState } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { NotificationUtils } from './src/utils/notifications';
import { BackgroundTaskUtils } from './src/utils/backgroundTasks';
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
    // 初始化应用
    const initializeApp = async () => {
      try {
        console.log('🚀 初始化应用...');
        
        // 1. 请求通知权限
        await NotificationUtils.requestPermissions();
        
        // 2. 优化后台通知
        await BackgroundTaskUtils.optimizeNotificationsForBackground();
        
        // 3. 注册后台任务
        await BackgroundTaskUtils.registerBackgroundTask();
        
        // 4. 检查并更新今日提醒状态
        await NotificationUtils.updateTodayReminders();
        
        console.log('✅ 应用初始化完成');
      } catch (error) {
        console.error('❌ 初始化应用失败:', error);
      }
    };

    // 设置应用状态监听
    const handleAppStateChange = (nextAppState) => {
      console.log('📱 应用状态变化:', nextAppState);
      
      if (nextAppState === 'active') {
        // 应用回到前台时，重新检查提醒状态
        console.log('🔄 应用回到前台，检查提醒状态...');
        NotificationUtils.updateTodayReminders().catch(error => {
          console.error('更新提醒状态失败:', error);
        });
      } else if (nextAppState === 'background') {
        console.log('📱 应用进入后台');
      }
    };

    // 添加应用状态监听器
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // 初始化
    initializeApp();

    // 清理函数
    return () => {
      subscription?.remove();
    };
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
