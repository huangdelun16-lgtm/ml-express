import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

async function getLegacyMediaLibrary() {
  return import('expo-media-library/legacy');
}

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

/** 拍照：先申请相机权限。 */
export async function takePhotoWithCamera(
  options: ImagePicker.ImagePickerOptions,
): Promise<ImagePicker.ImagePickerResult> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    return { canceled: true, assets: null };
  }
  return ImagePicker.launchCameraAsync(options);
}

/** 保存图片到相册：Android 13+ 仅需 MediaStore 写入；旧版/iOS 请求 writeOnly 权限。 */
export async function ensureSaveToLibraryPermission(): Promise<boolean> {
  if (isExpoGo()) return true;
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    return true;
  }

  const MediaLibrary = await getLegacyMediaLibrary();
  const { status } = await MediaLibrary.requestPermissionsAsync(true);
  return status === 'granted';
}

export async function saveImageToLibrary(uri: string): Promise<void> {
  if (isExpoGo()) {
    const Sharing = await import('expo-sharing');
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
      return;
    }
    throw new Error('当前环境无法保存到相册');
  }

  const MediaLibrary = await getLegacyMediaLibrary();
  await MediaLibrary.saveToLibraryAsync(uri);
}
