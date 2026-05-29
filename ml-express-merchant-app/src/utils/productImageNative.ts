import { Image } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

const MAX_SIDE = 1000;
const INITIAL_QUALITY = 0.68;
const TARGET_MAX_BYTES = 380_000;
const MIN_QUALITY = 0.52;

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

async function getFileSize(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists && typeof info.size === 'number' ? info.size : 0;
}

/** 商家 App：原比例缩放 + 自动 JPEG 压缩 */
export async function autoPrepareProductImageUri(uri: string): Promise<string> {
  const { width, height } = await getImageSize(uri);
  const longest = Math.max(width, height);
  const actions: ImageManipulator.Action[] = [];

  if (longest > MAX_SIDE) {
    if (width >= height) {
      actions.push({ resize: { width: MAX_SIDE } });
    } else {
      actions.push({ resize: { height: MAX_SIDE } });
    }
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

  return output.uri;
}

export async function autoPrepareProductImageUris(uris: string[]): Promise<string[]> {
  const prepared: string[] = [];
  for (const uri of uris) {
    prepared.push(await autoPrepareProductImageUri(uri));
  }
  return prepared;
}
