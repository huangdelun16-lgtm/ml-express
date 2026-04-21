import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/** 当前 JS 运行载体（与推送能力、调试方式相关） */
export type RuntimeChannel =
  | 'expo_go_ios'
  | 'expo_go_android'
  | 'standalone'
  | 'bare'
  | 'unknown';

export function getRuntimeChannel(): RuntimeChannel {
  const env = Constants.executionEnvironment;
  if (env === ExecutionEnvironment.StoreClient) {
    return Platform.OS === 'android' ? 'expo_go_android' : 'expo_go_ios';
  }
  if (env === ExecutionEnvironment.Standalone) {
    return 'standalone';
  }
  if (env === ExecutionEnvironment.Bare) {
    return 'bare';
  }
  return 'unknown';
}
