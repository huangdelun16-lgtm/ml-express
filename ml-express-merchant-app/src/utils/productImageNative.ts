import { Image } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

const MAX_SIDE = 1000;
const INITIAL_QUALITY = 0.68;
const TARGET_MAX_BYTES = 380_000;
const MIN_QUALITY = 0.52;

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('image size timeout')), 4000);
    Image.getSize(
      uri,
      (width, height) => {
        clearTimeout(timer);
        resolve({ width, height });
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function getFileSize(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists && typeof info.size === 'number' ? info.size : 0;
}

/** 相册交回的临时文件会马上被系统删掉，先复制到缓存里才能显示。 */
export async function keepPickedProductImage(uri: string): Promise<string> {
  const raw = String(uri || '').trim();
  if (!raw) return '';
  try {
    const dest = `${FileSystem.cacheDirectory}product-pick-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    await FileSystem.copyAsync({ from: raw, to: dest });
    return dest;
  } catch {
    return raw;
  }
}

/** 商家 App：原比例缩放 + 自动 JPEG 压缩。处理失败时仍返回原图，避免选完没反应。 */
export async function autoPrepareProductImageUri(uri: string): Promise<string> {
  try {
    const actions: ImageManipulator.Action[] = [];
    try {
      const { width, height } = await getImageSize(uri);
      const longest = Math.max(width, height);
      if (longest > MAX_SIDE && width > 0 && height > 0) {
        actions.push(width >= height ? { resize: { width: MAX_SIDE } } : { resize: { height: MAX_SIDE } });
      }
    } catch {
      actions.push({ resize: { width: MAX_SIDE } });
    }

    let quality = INITIAL_QUALITY;
    let output = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    let size = await getFileSize(output.uri);
    while (size > TARGET_MAX_BYTES && quality > MIN_QUALITY) {
      quality = Math.round((quality - 0.06) * 100) / 100;
      output = await ImageManipulator.manipulateAsync(uri, actions, {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      size = await getFileSize(output.uri);
    }

    return output.uri || uri;
  } catch {
    return uri;
  }
}

export async function autoPrepareProductImageUris(uris: string[]): Promise<string[]> {
  const prepared: string[] = [];
  for (const uri of uris) {
    prepared.push(await autoPrepareProductImageUri(uri));
  }
  return prepared;
}
