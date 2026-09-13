import { Platform, Image } from 'react-native';

/**
 * RN 0.81+ 部分环境缺少 resolveAssetSource.setCustomSourceTransformer。
 * 只走公开的 Image.resolveAssetSource，不再 require 内部路径（会触发 Deep imports 警告）。
 */
if (Platform.OS !== 'web') {
  const noop = () => {};
  const inject = (obj: unknown) => {
    if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) return;
    const target = obj as { setCustomSourceTransformer?: unknown };
    if (typeof target.setCustomSourceTransformer === 'function') return;
    try {
      Object.defineProperty(target, 'setCustomSourceTransformer', {
        value: noop,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } catch {
      target.setCustomSourceTransformer = noop;
    }
  };

  inject(Image.resolveAssetSource);
  const globalResolver = (globalThis as { _resolveAssetSource?: unknown })._resolveAssetSource;
  if (globalResolver) inject(globalResolver);
}
