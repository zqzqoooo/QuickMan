import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SQLiteService } from '../services/SQLiteService';
import { SyncService } from '../services/SyncService';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const uStr = username.trim();
    const pStr = password.trim();

    if (!uStr || !pStr) {
      return Alert.alert('Notice', 'Username and password are required');
    }

    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

      let response;
      try {
        response = await fetch('https://api.heshanws.top/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: uStr, password: pStr }),
          signal: controller.signal
        });
      } catch (e) {
        clearTimeout(timeoutId);
        throw new Error('Network request failed. Check your connection.');
      }
      clearTimeout(timeoutId);

      if (!response.ok && response.status >= 500) {
        throw new Error('Server error or no response');
      }

      const data = await response.json();

      if (response.ok && data.success) {
        const userRole = (data.user && data.user.role) ? String(data.user.role) : (data.role ? String(data.role) : 'user');
        const userName = (data.user && data.user.username) ? String(data.user.username) : (data.username ? String(data.username) : String(uStr));

        // 仅保留基础Token和身份存储
        await AsyncStorage.setItem('quickman_token', data.token ? String(data.token) : 'temp_token');
        await AsyncStorage.setItem('quickman_username', userName);
        await AsyncStorage.setItem('quickman_role', userRole);

        try {
          await SQLiteService.initDB();
          await SyncService.runSync();
        } catch (error) {
          console.log("DB init or sync failed:", error);
        }

        navigation.replace('MainApp');
      } else {
        Alert.alert('Login Failed', data.error || 'Incorrect username or password');
      }
    } catch (error) {
      Alert.alert('Login Error', error.message || '由于网络问题或服务器异常，Login Failed。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GEARSTACK</Text>
      <Text style={styles.subtitle}>Terminal Operations</Text>

      <View style={styles.form}>
        <TextInput 
          style={styles.input} 
          placeholder="Username or Staff ID" 
          placeholderTextColor="#666"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput 
          style={styles.input} 
          placeholder="Password" 
          placeholderTextColor="#666"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.loginText}>Sign In</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 30 },
  title: { color: '#32D74B', fontSize: 36, fontWeight: '900', textAlign: 'center', letterSpacing: 4 },
  subtitle: { color: '#555', fontSize: 14, textAlign: 'center', marginBottom: 50, letterSpacing: 1 },
  form: { backgroundColor: '#1C1C1E', padding: 20, borderRadius: 20 },
  input: { backgroundColor: '#2C2C2E', color: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, fontSize: 16 },
  loginBtn: { backgroundColor: '#00E676', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  loginText: { color: '#000', fontSize: 16, fontWeight: 'bold', letterSpacing: 2 }
});
