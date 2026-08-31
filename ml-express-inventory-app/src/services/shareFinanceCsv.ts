import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export type ShareFinanceCsvResult = 'shared' | 'copied';

function csvWithoutBom(csv: string): string {
  return csv.startsWith('\uFEFF') ? csv.slice(1) : csv;
}

async function copyCsv(csv: string): Promise<'copied'> {
  await Clipboard.setStringAsync(csvWithoutBom(csv));
  return 'copied';
}

/** 写入缓存目录并调起系统分享；无法分享时回退剪贴板。 */
export async function shareFinanceCsvFile(params: {
  csv: string;
  filename: string;
  dialogTitle: string;
}): Promise<ShareFinanceCsvResult> {
  const safeName = params.filename.replace(/[/\\]/g, '_');
  try {
    const available = await Sharing.isAvailableAsync();
    const dir = FileSystem.cacheDirectory;
    if (!available || !dir) {
      return copyCsv(params.csv);
    }
    const path = `${dir}${safeName}`;
    await FileSystem.writeAsStringAsync(path, params.csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    await Sharing.shareAsync(path, {
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
      dialogTitle: params.dialogTitle,
    });
    return 'shared';
  } catch {
    return copyCsv(params.csv);
  }
}
