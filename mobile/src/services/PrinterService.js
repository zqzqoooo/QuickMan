import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { PrinterModule } = NativeModules;

export const PrinterService = {
  init: async () => {
    return await PrinterModule.initSDK();
  },

  scan: async () => {
    return await PrinterModule.scanPrinters();
  },

  connect: async (printerName) => {
    const success = await PrinterModule.connectPrinter(printerName);
    if (success) {
      await AsyncStorage.setItem('@last_printer', printerName); // 记住设备
    }
    return success;
  },

  autoConnect: async () => {
    try {
      const lastPrinter = await AsyncStorage.getItem('@last_printer');
      if (!lastPrinter) return null;

      const list = await PrinterModule.scanPrinters();
      if (list.includes(lastPrinter)) {
        await PrinterModule.connectPrinter(lastPrinter);
        return lastPrinter;
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  printTemplate: async (config, elements, copies = 1) => {
    try {
      if (!config) config = { width: 40, height: 35 };
      if (!elements) elements = [];
      await PrinterModule.preparePrint(config.width || 40, config.height || 35, copies);

      for (const el of elements) {
        if (!el) continue;
        if (el.type === 'text') {
          await PrinterModule.drawText(el.x || 0, el.y || 0, el.width || 0, el.height || 0, String(el.text || ''), el.fontSize || 3);
        } else if (el.type === 'qrcode') {
          await PrinterModule.drawQRCode(el.x || 0, el.y || 0, el.size || 0, String(el.text || ''));
        }
      }

      return await PrinterModule.commitPrint(copies);
    } catch (error) {
      console.error('打印异常:', error);
      throw error;
    }
  }
};