/**
 * 各端应用商店链接（构建期 REACT_APP_* 优先，未配置时使用包名默认 Google Play 地址）
 * 与 ml-express-mobile-app/app.json android.package 等保持一致
 */

const trim = (v: string | undefined) => (v || '').trim();

export const ANDROID_PACKAGE = {
  client: 'com.mlexpress.client',
  merchant: 'com.mlexpress.merchant',
  rider: 'com.mlexpress.courier',
} as const;

function googlePlayUrl(packageId: string): string {
  return `https://play.google.com/store/apps/details?id=${packageId}`;
}

function resolveUrl(envValue: string | undefined, fallbackPackageId?: string): string {
  const fromEnv = trim(envValue);
  if (fromEnv) return fromEnv;
  if (fallbackPackageId) return googlePlayUrl(fallbackPackageId);
  return '';
}

/** 联系我们页与各下载入口使用 */
export function getPublicStoreUrls() {
  return {
    clientIos: trim(process.env.REACT_APP_CLIENT_APP_IOS_URL),
    clientAndroid: trim(process.env.REACT_APP_CLIENT_APP_ANDROID_URL),
    merchantIos: trim(process.env.REACT_APP_MERCHANT_APP_IOS_URL),
    merchantAndroid: trim(process.env.REACT_APP_MERCHANT_APP_ANDROID_URL),
    riderIos: trim(process.env.REACT_APP_RIDER_APP_IOS_URL),
    riderAndroid: resolveUrl(process.env.REACT_APP_RIDER_APP_ANDROID_URL, ANDROID_PACKAGE.rider),
  };
}
