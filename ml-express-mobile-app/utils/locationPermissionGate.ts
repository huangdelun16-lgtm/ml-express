import * as Location from 'expo-location';
import { PermissionStatus } from 'expo-location';
import { hasAcceptedLocationDisclosure } from './locationDisclosureStorage';

/**
 * 仅在用户已在本应用内阅读并「同意」显著披露后，才向系统申请前台位置权限（Google Play 要求）。
 * 未同意时不会弹出系统位置对话框，返回与「未决」等效的结果。
 */
export async function requestForegroundPermissionsIfDisclosed(): Promise<Location.LocationPermissionResponse> {
  if (!(await hasAcceptedLocationDisclosure())) {
    return {
      status: PermissionStatus.UNDETERMINED,
      granted: false,
      canAskAgain: true,
      expires: 'never',
    };
  }
  return Location.requestForegroundPermissionsAsync();
}
