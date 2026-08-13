import './src/utils/polyfills';
import { Image, Platform } from 'react-native';

// 🚀 全局最强修复：直接在入口拦截
if (Platform.OS !== 'web') {
  try {
    const ras = Image.resolveAssetSource || require('react-native/Libraries/Image/resolveAssetSource');
    const target = ras.default || ras;
    if (target && typeof target.setCustomSourceTransformer !== 'function') {
      target.setCustomSourceTransformer = () => {};
    }
  } catch (e) {}
}

import { installProductionConsoleGate } from './src/services/LoggerService';
installProductionConsoleGate();

import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
