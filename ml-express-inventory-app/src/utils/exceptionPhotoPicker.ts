import * as ImagePicker from 'expo-image-picker';
import { svc } from '../errors/serviceError';

export async function pickExceptionPhoto(source: 'camera' | 'library'): Promise<string | null> {
  const permission = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw svc('exceptionCameraDenied');

  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync({
        quality: 0.72,
        allowsEditing: false,
        exif: false,
      })
    : await ImagePicker.launchImageLibraryAsync({
        quality: 0.72,
        allowsEditing: false,
        selectionLimit: 1,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets[0].uri;
}
