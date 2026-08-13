import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';

/** Android 13+ 系统相册选择器无需 READ_MEDIA_* 权限（Google Play 政策要求）。 */
export async function pickImageFromLibrary(
  options: ImagePicker.ImagePickerOptions,
): Promise<ImagePicker.ImagePickerResult> {
  if (Platform.OS === 'android') {
    return ImagePicker.launchImageLibraryAsync(options);
  }

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    return { canceled: true, assets: null };
  }

  return ImagePicker.launchImageLibraryAsync(options);
}

/** 保存图片到相册：Android 13+ 仅需 MediaStore 写入；旧版/iOS 请求 writeOnly 权限。 */
export async function ensureSaveToLibraryPermission(): Promise<boolean> {
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    return true;
  }

  const { status } = await MediaLibrary.requestPermissionsAsync(true);
  return status === 'granted';
}
