import { Linking, Platform } from 'react-native';

type LatLng = { lat: number; lng: number };

function fmt(point: LatLng): string {
  return `${point.lat},${point.lng}`;
}

/** 优先打开 Google Maps 语音导航；失败时回退 Web / Apple Maps */
export async function openGoogleMapsDrivingNavigation(options: {
  origin?: LatLng;
  destination: LatLng;
  waypoints?: LatLng[];
}): Promise<void> {
  const { origin, destination, waypoints = [] } = options;
  const dest = fmt(destination);

  const candidates: string[] = [];

  if (Platform.OS === 'android' && waypoints.length === 0) {
    candidates.push(`google.navigation:q=${dest}`);
  }

  if (origin) {
    const originStr = fmt(origin);
    if (waypoints.length > 0) {
      const wp = waypoints.slice(0, 9).map(fmt).join('|');
      candidates.push(
        `comgooglemaps://?saddr=${originStr}&daddr=${dest}&waypoints=${wp}&directionsmode=driving`,
      );
      candidates.push(
        `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${dest}&waypoints=${wp}&travelmode=driving`,
      );
    } else {
      candidates.push(
        `comgooglemaps://?saddr=${originStr}&daddr=${dest}&directionsmode=driving`,
      );
      candidates.push(
        `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${dest}&travelmode=driving`,
      );
    }
  } else {
    candidates.push(`comgooglemaps://?daddr=${dest}&directionsmode=driving`);
    candidates.push(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`);
  }

  for (const url of candidates) {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // try next
    }
  }

  if (Platform.OS === 'ios') {
    const originStr = origin ? fmt(origin) : '';
    const appleUrl = origin
      ? `http://maps.apple.com/?saddr=${originStr}&daddr=${dest}&dirflg=d`
      : `http://maps.apple.com/?daddr=${dest}&dirflg=d`;
    await Linking.openURL(appleUrl);
    return;
  }

  await Linking.openURL(
    `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`,
  );
}
