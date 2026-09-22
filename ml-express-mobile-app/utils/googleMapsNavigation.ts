import { Linking, Platform } from 'react-native';
import { splitGoogleMapsStops } from './googleMapsRouteLimit';

type LatLng = { lat: number; lng: number };

function fmt(point: LatLng): string {
  return `${point.lat},${point.lng}`;
}

export type GoogleMapsNavPlan = {
  origin?: LatLng;
  destination: LatLng;
  waypoints: LatLng[];
  truncated: boolean;
  remainingStopCount: number;
  navigableStopCount: number;
};

/** 将骑手站点裁成 Google Maps 能吃下的一段（先走前 10 站，不跳到最后一站）。 */
export function planGoogleMapsDrivingRoute(options: {
  origin?: LatLng;
  stops: LatLng[];
}): GoogleMapsNavPlan | null {
  const { origin, stops } = options;
  if (!stops.length) return null;
  const { navigable, remaining, truncated } = splitGoogleMapsStops(stops);
  const destination = navigable[navigable.length - 1];
  const waypoints = navigable.slice(0, -1);
  return {
    origin,
    destination,
    waypoints,
    truncated,
    remainingStopCount: remaining.length,
    navigableStopCount: navigable.length,
  };
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
      const wp = waypoints.map(fmt).join('|');
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
