import { Linking } from 'react-native';
import { openGoogleMapsDrivingNavigation } from './googleMapsNavigation';

/** 打开 Google Maps 导航到指定地址；若有经纬度则优先用坐标。 */
export function openMapsToAddress(
  address?: string | null,
  lat?: number | string | null,
  lng?: number | string | null,
): void {
  const la = lat != null && lat !== '' ? Number(lat) : NaN;
  const ln = lng != null && lng !== '' ? Number(lng) : NaN;
  if (Number.isFinite(la) && Number.isFinite(ln)) {
    void openGoogleMapsDrivingNavigation({
      destination: { lat: la, lng: ln },
    });
    return;
  }
  const addr = (address || '').trim();
  if (addr) {
    void Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}&travelmode=driving`,
    );
  }
}
