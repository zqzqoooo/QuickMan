import { Platform } from 'react-native';

const API_BASE_URL = 'https://api.heshanws.top/api';

export const UploadService = {
  /**
   * 通用单张图片上传服务
   * @param {string} fileUri 本地图片路径 (通常以 file:// 开头)
   * @param {string} fileName 上传后的指定文件名
   * @returns {object} { success: boolean, url?: string, error?: string }
   */
  uploadImage: async (fileUri, fileName = 'photo.jpg') => {
    try {
      if (!fileUri) throw new Error('未提供有效的文件路径');

      // 兼容性处理：部分 iOS 版本的 fetch 配合 FormData 时，去掉 file:// 前缀更稳定
      const safeUri = Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri;

      const formData = new FormData();
      formData.append('photo', {
        uri: safeUri,
        name: fileName,
        type: 'image/jpeg'
      });

      console.log(`🚀 [UploadService] 开始上传图片...`);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`服务器响应异常, 状态码: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ [UploadService] 上传成功: ${result.url}`);
        return { success: true, url: result.url };
      } else {
        throw new Error(result.error || '服务器返回失败状态');
      }

    } catch (error) {
      console.error('❌ [UploadService] 上传崩溃:', error.message);
      return { success: false, error: error.message };
    }
  }
};