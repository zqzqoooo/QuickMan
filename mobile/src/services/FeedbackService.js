// src/services/FeedbackService.js
import { Vibration, Platform } from 'react-native';

export const FeedbackService = {
  loadSounds: async () => {
    return true;
  },

  playBeep: () => {
    if (Platform.OS === 'ios') {
      Vibration.vibrate(50);
    } else {
      Vibration.vibrate(50);
    }
  },

  playError: () => {
    Vibration.vibrate([0, 100, 100, 200]);
  }
};