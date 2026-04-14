import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { PrinterModule } = NativeModules;

export const PrinterService = {
  // 1. 初始化
  init: async () => {
    return await PrinterModule.initSDK();
  },

  // 2. 扫描设备
  scan: async () => {
    return await PrinterModule.scanPrinters();
  },

  // 改进：连接成功后保存名字
  connect: async (printerName) => {
    const success = await PrinterModule.connectPrinter(printerName);
    if (success) {
      await AsyncStorage.setItem('@last_printer', printerName); // 记住设备
    }
    return success;
  },

  // 新增：自动连接逻辑
  autoConnect: async () => {
    try {
      const lastPrinter = await AsyncStorage.getItem('@last_printer');
      if (!lastPrinter) return null; // 以前没连过

      // 扫一波看看附近有没有它
      const list = await PrinterModule.scanPrinters();
      if (list.includes(lastPrinter)) {
        await PrinterModule.connectPrinter(lastPrinter);
        return lastPrinter; // 自动连接成功，返回名字
      }
      return null; // 没搜到
    } catch (e) {
      return null;
    }
  },

  // 4. 万能打印模版
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