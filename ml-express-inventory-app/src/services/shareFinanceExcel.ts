import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export type ShareFinanceExcelResult = 'shared' | 'unavailable';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const XLSX_UTI = 'org.openxmlformats.spreadsheetml.sheet';

export async function shareFinanceExcelFile(params: {
  base64: string;
  filename: string;
  dialogTitle: string;
}): Promise<ShareFinanceExcelResult> {
  const safeName = params.filename.replace(/[/\\]/g, '_');
  const withExt = /\.xlsx$/i.test(safeName) ? safeName : `${safeName}.xlsx`;
  try {
    const available = await Sharing.isAvailableAsync();
    const dir = FileSystem.cacheDirectory;
    if (!available || !dir) return 'unavailable';
    const path = `${dir}${withExt}`;
    await FileSystem.writeAsStringAsync(path, params.base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await Sharing.shareAsync(path, {
      mimeType: XLSX_MIME,
      UTI: XLSX_UTI,
      dialogTitle: params.dialogTitle,
    });
    return 'shared';
  } catch {
    return 'unavailable';
  }
}
