import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

export const ImageService = {
  takePhoto: async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        return { success: false, error: 'Camera permission is required to take photos' };
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
      });

      if (!result.canceled) {
        const tempUri = result.assets[0].uri;
        
        const fileName = tempUri.split('/').pop();
        const permanentUri = FileSystem.documentDirectory + fileName;

        await FileSystem.copyAsync({
          from: tempUri,
          to: permanentUri
        });

        console.log('✅ Photo saved to:', permanentUri);
        return { success: true, uri: permanentUri };
      }
      
      return { success: false, error: 'User canceled the photo capture' };
    } catch (e) {
      console.error('❌ Image service error:', e);
      return { success: false, error: e.message };
    }
  }
};