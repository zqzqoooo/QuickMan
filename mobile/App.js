import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SQLiteService } from './src/services/SQLiteService';
import { SyncService } from './src/services/SyncService';

// 引入咱们写好的三个真实页面
import LoginScreen from './src/screens/LoginScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AdminScreen from './src/screens/AdminScreen';
import MainScreen from './src/screens/MainScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 🌟 核心：底部导航栏组件 (带角色权限判断)
function TabNavigator() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 组件加载时，从本地读取登录时存下的角色
    const fetchRole = async () => {
      const storedRole = await AsyncStorage.getItem('quickman_role');
      setRole(storedRole || 'staff');
      setLoading(false);
    };
    fetchRole();
  }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#00E676" /></View>;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#111', borderTopColor: '#222', paddingBottom: 5, paddingTop: 5 },
        tabBarActiveTintColor: '#00E676',
        tabBarInactiveTintColor: '#666',
        // 简单用 Emoji 代替图标，保证任何环境都不报错
        tabBarIcon: ({ focused }) => {
          let icon = '';
          if (route.name === 'Workspace') icon = focused ? '📦' : '⬜';
          else if (route.name === 'Admin') icon = focused ? '👑' : '🛡️';
          else if (route.name === 'Settings') icon = focused ? '⚙️' : '🔧';
          return <Text style={{ fontSize: 20 }}>{icon}</Text>;
        }
      })}
    >
      {/* 所有人都能看的工作台 */}
      <Tab.Screen name="Workspace" component={MainScreen} options={{ tabBarLabel: 'Workspace' }} />
      
      {/* 🌟 核心拦截：只有 admin 角色才会渲染这个 Tab */}
      {role === 'admin' && (
        <Tab.Screen name="Admin" component={AdminScreen} options={{ tabBarLabel: 'Assets' }} />
      )}
      
      {/* 所有人都能看的设置页 */}
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}

// 全局入口路由
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('quickman_token');
        if (token) {
          await SQLiteService.initDB();
          setInitialRoute('MainApp');
        }
      } catch (e) {
        console.log("CheckAuth DB Init Failed:", e);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#00E676" /></View>;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        {/* 登录页不在底部导航栏内，它是独立的大门 */}
        <Stack.Screen name="Login" component={LoginScreen} />
        {/* 登录Success后，进入底部导航System */}
        <Stack.Screen name="MainApp" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  title: { color: '#00E676', fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { color: '#666', fontSize: 16 }
});