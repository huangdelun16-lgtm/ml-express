import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/** 从推送或深度链接打开包裹详情（含导航未就绪时的重试） */
export function navigateToPackageDetail(packageId: string): void {
  if (!packageId) return;
  tryNavigatePackageDetail(packageId);
}

function navigatePackageDetailUnsafe(packageId: string) {
  (navigationRef as any).navigate('PackageDetail', { packageId });
}

function tryNavigatePackageDetail(packageId: string, attempt = 0): void {
  if (navigationRef.isReady()) {
    navigatePackageDetailUnsafe(packageId);
    return;
  }
  if (attempt < 20) {
    setTimeout(() => tryNavigatePackageDetail(packageId, attempt + 1), 200);
  }
}
