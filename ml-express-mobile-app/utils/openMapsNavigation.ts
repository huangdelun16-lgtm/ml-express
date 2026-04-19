import { Linking, Platform } from "react-native";

/** 打开系统地图导航到指定地址；若有经纬度则优先用坐标。 */
export function openMapsToAddress(
  address?: string | null,
  lat?: number | string | null,
  lng?: number | string | null,
): void {
  const addr = (address || "").trim();
  const la = lat != null && lat !== "" ? Number(lat) : NaN;
  const ln = lng != null && lng !== "" ? Number(lng) : NaN;
  if (Number.isFinite(la) && Number.isFinite(ln)) {
    const destination = `${la},${ln}`;
    const url = Platform.select({
      ios: `maps:0,0?q=${destination}`,
      android: `geo:0,0?q=${destination}(${encodeURIComponent(addr || `${la},${ln}`)})`,
    });
    if (url) {
      Linking.openURL(url);
      return;
    }
  }
  if (addr) {
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`,
    );
  }
}
