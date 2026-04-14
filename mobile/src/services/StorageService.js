import AsyncStorage from '@react-native-async-storage/async-storage';

const DB_KEY = '@gs_debug_db';

export const StorageService = {
  create: async (item) => {
    const list = await StorageService.read();
    const updated = [item, ...list];
    await AsyncStorage.setItem(DB_KEY, JSON.stringify(updated));
    return updated;
  },
  read: async () => {
    const val = await AsyncStorage.getItem(DB_KEY);
    return val ? JSON.parse(val) : [];
  },
  update: async (id, updates) => {
    const list = await StorageService.read();
    const updated = list.map(item => item.id === id ? { ...item, ...updates } : item);
    await AsyncStorage.setItem(DB_KEY, JSON.stringify(updated));
    return updated;
  },
  remove: async (id) => {
    const list = await StorageService.read();
    const updated = list.filter(item => item.id !== id);
    await AsyncStorage.setItem(DB_KEY, JSON.stringify(updated));
    return updated;
  },
  clear: async () => await AsyncStorage.removeItem(DB_KEY)
};