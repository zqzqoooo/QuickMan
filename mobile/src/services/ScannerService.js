// src/services/ScannerService.js
import { Camera } from 'expo-camera';

export const ScannerService = {
  config: {
    barcodeTypes: ['qr'],
    settings: {
      barcodeTypes: ["qr"],
    }
  },

  checkPermissions: async (requestPermission) => {
    const { granted } = await requestPermission();
    return granted;
  },

  parseData: (rawData) => {
    return rawData.trim();
  }
};