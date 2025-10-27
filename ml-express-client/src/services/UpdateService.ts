import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

export class UpdateService {
  static async checkForUpdates() {
    if (__DEV__) {
      console.log('Update check skipped in development mode');
      return;
    }

    try {
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        await this.downloadAndRestart();
      }
    } catch (error) {
      console.error('Update check failed:', error);
    }
  }

  static async downloadAndRestart() {
    try {
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
    } catch (error) {
      console.error('Update download failed:', error);
    }
  }
}
