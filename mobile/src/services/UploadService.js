import { Platform } from 'react-native';

const API_BASE_URL = 'https://api.heshanws.top/api';

export const UploadService = {
  /**
   * Generic single image upload service
   * @param {string} fileUri Local image path (usually starting with file://)
   * @param {string} fileName Specified filename after upload
   * @returns {object} { success: boolean, url?: string, error?: string }
   */
  uploadImage: async (fileUri, fileName = 'photo.jpg') => {
    try {
      if (!fileUri) throw new Error('No valid file path provided');

      const safeUri = Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri;

      const formData = new FormData();
      formData.append('photo', {
        uri: safeUri,
        name: fileName,
        type: 'image/jpeg'
      });

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server response error, status code: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return { success: true, url: result.url };
      } else {
        throw new Error(result.error || 'Server returned failure status');
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};