// src/services/FeedbackService.js
import { Vibration, Platform } from 'react-native';

export const FeedbackService = {
  loadSounds: async () => {
    return true;
  },

  playBeep: () => {
    // 短震动模拟提示音
    if (Platform.OS === 'ios') {
      Vibration.vibrate(50);
    } else {
      Vibration.vibrate(50);
    }
  },

  playError: () => {
    // 错误震动
    Vibration.vibrate([0, 100, 100, 200]);
  }
};