import { Alert } from 'react-native';

type ScanStopOptions = {
  title: string;
  message: string;
  scanAgainLabel: string;
  dismissLabel: string;
  onScanAgain?: () => void;
  photoLabel?: string;
  onPhoto?: () => void;
  detailLabel?: string;
  onOpenDetail?: () => void;
};

/** 扫码被拦住时说明原因，并给出再扫、拍照或打开详情。 */
export function explainScanStop(options: ScanStopOptions): void {
  const buttons: { text: string; style?: 'cancel'; onPress?: () => void }[] = [];
  if (options.onScanAgain) {
    buttons.push({ text: options.scanAgainLabel, onPress: options.onScanAgain });
  }
  if (options.onPhoto && options.photoLabel) {
    buttons.push({ text: options.photoLabel, onPress: options.onPhoto });
  }
  if (options.onOpenDetail && options.detailLabel) {
    buttons.push({ text: options.detailLabel, onPress: options.onOpenDetail });
  }
  buttons.push({ text: options.dismissLabel, style: 'cancel' });
  Alert.alert(options.title, options.message, buttons, { cancelable: true });
}
