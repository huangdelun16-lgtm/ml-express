import { Alert } from 'react-native';

/** 任务完成时的统一成功提示 */
export function showTaskSuccess(
  title: string,
  message?: string,
  onOk?: () => void,
): void {
  Alert.alert(title, message?.trim() || undefined, [
    { text: 'OK', onPress: onOk },
  ]);
}
