import * as Updates from 'expo-updates';
import LoggerService from './LoggerService';
import { Alert } from 'react-native';

export class UpdateService {
  static async checkForUpdates() {
    if (__DEV__) {
      LoggerService.debug('Update check skipped in development mode');
      return;
    }
    try {
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        await this.downloadAndRestart();
      }
    } catch (error) {
      LoggerService.error('Update check failed:', error);
  }
  static async downloadAndRestart() {
      await Updates.fetchUpdateAsync();
      Alert.alert(
        '发现新版本',
        '应用已更新到最新版本，需要重启应用。',
        [
          {
            text: '立即重启',
            onPress: async () => {
              await Updates.reloadAsync();
            },
            style: 'default',
          },
        ],
        { cancelable: false }
      );
      LoggerService.error('Update download failed:', error);
}
