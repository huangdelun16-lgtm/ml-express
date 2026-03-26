import { Platform, Image } from 'react-native';

/**
 * 🚀 关键修复：解决 React Native 0.81+ 中 resolveAssetSource.setCustomSourceTransformer 丢失的问题
 */
if (Platform.OS !== 'web') {
  try {
    const noop = () => {};
    
    // 注入函数
    const inject = (obj: any) => {
      if (obj && (typeof obj === 'object' || typeof obj === 'function')) {
        if (typeof obj.setCustomSourceTransformer !== 'function') {
          console.log('🔧 正在注入 setCustomSourceTransformer polyfill');
          try {
            Object.defineProperty(obj, 'setCustomSourceTransformer', {
              value: noop,
              writable: true,
              configurable: true,
              enumerable: true
            });
          } catch (e) {
            obj.setCustomSourceTransformer = noop;
          }
        }
      }
    };

    // 1. 从 Image 组件获取
    if ((Image as any).resolveAssetSource) {
      inject((Image as any).resolveAssetSource);
    }

    // 2. 尝试加载内部模块并注入
    try {
      const resolveAssetSource = require('react-native/Libraries/Image/resolveAssetSource');
      inject(resolveAssetSource);
      if (resolveAssetSource.default) {
        inject(resolveAssetSource.default);
      }
    } catch (e) {}

    try {
      const AssetSourceResolver = require('react-native/Libraries/Image/AssetSourceResolver');
      if (AssetSourceResolver && AssetSourceResolver.prototype) {
        inject(AssetSourceResolver.prototype);
      }
      inject(AssetSourceResolver);
    } catch (e) {}

    // 3. 拦截全局变量（针对某些打包后的环境）
    if (typeof (global as any)._resolveAssetSource === 'object') {
      inject((global as any)._resolveAssetSource);
    }

  } catch (error) {
    console.warn('执行 resolveAssetSource polyfill 失败:', error);
  }
}
