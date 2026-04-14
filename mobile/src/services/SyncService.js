import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SQLiteService } from './SQLiteService';
import { UploadService } from './UploadService';

const API_BASE_URL = 'https://api.heshanws.top/api';

const getAuthHeaders = async (isJson = true) => {
  const token = await AsyncStorage.getItem('quickman_token');
  if (!token) throw new Error("未登录或身份凭证已失效");
  
  const headers = { 'Authorization': `Bearer ${token}` };
  if (isJson) headers['Content-Type'] = 'application/json';
  return headers;
};

export const SyncService = {
  runSync: async () => {
    try {
      await SyncService.uploadPendingPhotos();
      const pushedCount = await SyncService.pushChanges();
      const pulledCount = await SyncService.pullChanges();

      return { success: true, pushed: pushedCount, pulled: pulledCount };
    } catch (error) {
      console.error("❌ async stop:", error);
      return { success: false, error: error.message };
    }
  },

  uploadPendingPhotos: async () => {
    const pendingAssets = await SQLiteService.getPendingAssets();
    
    for (let asset of pendingAssets) {
      if (asset.photo_uri && asset.photo_uri.startsWith('file://') && !asset.remote_photo_uri) {
        const customFileName = `asset_${asset.code}_${Date.now()}.jpg`;
        // ⚠️ 提醒：UploadService 内部的 fetch 也需要带上 Token，请确保你修改了 UploadService.js
        const result = await UploadService.uploadImage(asset.photo_uri, customFileName);
        
        if (result.success) {
          await SQLiteService.updateAssetRemoteUri(asset.id, result.url);
        }
      }
    }
  },

  pushChanges: async () => {
    const pendingCabinets = await SQLiteService.getPendingCabinets();
    const pendingAssets = await SQLiteService.getPendingAssets(); 
    const pendingTransactions = await SQLiteService.getPendingTransactions();
    
    const totalCount = pendingCabinets.length + pendingAssets.length + pendingTransactions.length;
    if (totalCount === 0) return 0;

    const assetsPayload = pendingAssets.map(asset => ({
      ...asset,
      photo_uri: asset.remote_photo_uri || null, 
      is_deleted: asset.is_deleted || 0 
    }));

    const payload = {
      device_id: "IOS_CLIENT_001", 
      timestamp: Date.now(),
      data: { cabinets: pendingCabinets, assets: assetsPayload, transactions: pendingTransactions }
    };

    const headers = await getAuthHeaders(true);

    const response = await fetch(`${API_BASE_URL}/sync/push`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    if (response.status === 401 || response.status === 403) {
      throw new Error("同步被拒绝：登录已过期或权限不足");
    }

    const rawText = await response.text();
    const result = JSON.parse(rawText);

    if (result.success) {
      const cabIds = pendingCabinets.map(c => c.id);
      const assetIds = pendingAssets.map(a => a.id);
      const txIds = pendingTransactions.map(t => t.id);

      if(cabIds.length > 0) await SQLiteService.markCabinetsAsSynced(cabIds);
      if(assetIds.length > 0) await SQLiteService.markAssetsAsSynced(assetIds);
      if(txIds.length > 0) await SQLiteService.markTransactionsAsSynced(txIds);

      return totalCount;
    } else {
      throw new Error("服务器拒绝了同步请求");
    }
  },

  pullChanges: async () => {
    try {
      const lastSyncStr = await AsyncStorage.getItem('@last_sync_time');
      const lastSyncTime = lastSyncStr ? parseInt(lastSyncStr) : 0;
      
      const headers = await getAuthHeaders(false);

      const response = await fetch(`${API_BASE_URL}/sync/pull?last_sync_time=${lastSyncTime}`, {
        method: 'GET',
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error("拉取被拒绝：登录已过期或权限不足");
      }

      const result = await response.json();

      if (result.success) {
        const { cabinets, assets, transactions } = result.data;
        const totalPulled = cabinets.length + assets.length + transactions.length;
        
        if (totalPulled > 0) {
          for (let i = 0; i < assets.length; i++) {
            let serverAsset = assets[i];
            
            if (serverAsset.photo_uri && serverAsset.photo_uri.startsWith('http')) {
              serverAsset.remote_photo_uri = serverAsset.photo_uri; 

              const localAsset = await SQLiteService.getAssetById(serverAsset.id);

              if (localAsset && localAsset.remote_photo_uri === serverAsset.photo_uri && localAsset.photo_uri && localAsset.photo_uri.startsWith('file://')) {
                serverAsset.photo_uri = localAsset.photo_uri; 
              } 
              else {
                try {
                  const fileName = `pulled_${serverAsset.code}_${Date.now()}.jpg`;
                  const localPath = FileSystem.documentDirectory + fileName;
                  
                  const downloadResult = await FileSystem.downloadAsync(serverAsset.remote_photo_uri, localPath);
                  
                  serverAsset.photo_uri = downloadResult.uri; 
                } catch (err) {
                  serverAsset.photo_uri = null; 
                }
              }
            }
          }

          await SQLiteService.savePulledData(cabinets, assets, transactions);
        } else {
        }

        if (result.server_timestamp) {
          await AsyncStorage.setItem('@last_sync_time', result.server_timestamp.toString());
        }

        return totalPulled;
      } else {
        throw new Error(result.error || "拉取失败");
      }
    } catch (error) {
      throw error;
    }
  }
};