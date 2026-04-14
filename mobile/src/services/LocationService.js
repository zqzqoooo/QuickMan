import * as Location from 'expo-location';

export const LocationService = {
  getCurrentPosition: async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission is required to get current position');
    }
    
    let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    };
  }
};
