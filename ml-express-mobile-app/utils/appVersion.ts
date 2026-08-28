import Constants from 'expo-constants';

export function getStaffAppVersion(): string {
  const fromExpo = String(Constants.expoConfig?.version || '').trim();
  if (fromExpo) return fromExpo;
  const native = String(Constants.nativeApplicationVersion || '').trim();
  if (native) return native;
  return '2.4.3';
}

export function getStaffBuildLabel(): string {
  const ios = String(Constants.expoConfig?.ios?.buildNumber || '').trim();
  if (ios) return ios;
  const android = Constants.expoConfig?.android?.versionCode;
  if (android != null && Number.isFinite(Number(android))) return String(android);
  const native = String(Constants.nativeBuildVersion || '').trim();
  return native;
}

export function getStaffVersionDisplay(): string {
  const version = getStaffAppVersion();
  const build = getStaffBuildLabel();
  return build ? `v${version} (${build})` : `v${version}`;
}
