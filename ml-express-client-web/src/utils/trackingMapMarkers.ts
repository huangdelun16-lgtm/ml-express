import {
  TRACKING_COURIER_COLOR,
  TRACKING_DESTINATION_COLOR,
} from '../constants/trackingMapStyles';

function svgDataUrl(svg: string): string {
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

const DESTINATION_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="52" height="68" viewBox="0 0 52 68">
  <ellipse cx="26" cy="63.5" rx="11" ry="3.2" fill="#0f172a" opacity="0.22"/>
  <path d="M26 2.5c12.4 0 22.5 9.8 22.5 21.8C48.5 40.2 26 65 26 65S3.5 40.2 3.5 24.3C3.5 12.3 13.6 2.5 26 2.5z" fill="${TRACKING_DESTINATION_COLOR}"/>
  <path d="M26 5.5c-9.6 0-17.4 7.6-17.4 17.2 0 2.4.6 5.2 1.6 8.2 3.6-9.4 11.2-15.4 15.8-15.4 1.4 0 2.6.4 3.4 1.2C27.8 8.4 22.6 5.5 26 5.5z" fill="#7eb7e4" opacity="0.35"/>
  <circle cx="26" cy="24" r="13" fill="#ffffff"/>
  <path d="M19 18.2l7-3.4 7 3.4v3.1H19z" fill="${TRACKING_DESTINATION_COLOR}"/>
  <rect x="19" y="21.1" width="14" height="11.4" rx="1.6" fill="${TRACKING_DESTINATION_COLOR}"/>
  <path d="M19 24.4h14M26 17.2v15.3" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
</svg>
`.trim();

const COURIER_MOTO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
  <circle cx="36" cy="36" r="34" fill="${TRACKING_COURIER_COLOR}" opacity="0.14"/>
  <circle cx="36" cy="36" r="24" fill="${TRACKING_COURIER_COLOR}"/>
  <circle cx="36" cy="36" r="24" fill="none" stroke="#ffffff" stroke-width="2.6"/>
  <g fill="#ffffff">
    <circle cx="23.2" cy="49.2" r="6.1"/>
    <circle cx="51.2" cy="49.2" r="6.1"/>
    <rect x="16.2" y="28.6" width="12.4" height="10.6" rx="2.1"/>
    <path d="M28.4 47.8l5.2-10.2h13.6l5.6 10.2c-2.8-3.2-7.1-5-11.8-5-5 0-9.4 1.9-12.6 5z"/>
    <path d="M36.2 38.4l3.2-10.6c.7-2.2 3.1-3.3 5.2-2.4l2.4 1.1-3.6 11.9z"/>
    <circle cx="45.4" cy="23.6" r="5.7"/>
  </g>
  <g fill="${TRACKING_COURIER_COLOR}">
    <circle cx="23.2" cy="49.2" r="2.3"/>
    <circle cx="51.2" cy="49.2" r="2.3"/>
    <rect x="19.2" y="31.4" width="6.4" height="5" rx="1"/>
    <path d="M45.8 21.6c2.6.6 4.4 2.2 4.6 4.1-1.6-.2-3.2-.8-4.4-1.8-.4-.8-.6-1.5-.2-2.3z"/>
  </g>
  <path d="M47.4 37.6L54.6 31" fill="none" stroke="#ffffff" stroke-width="2.7" stroke-linecap="round"/>
  <path d="M53.4 29.8l3.2 2.4" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
</svg>
`.trim();

const COURIER_CAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
  <circle cx="36" cy="36" r="34" fill="${TRACKING_COURIER_COLOR}" opacity="0.14"/>
  <circle cx="36" cy="36" r="24" fill="${TRACKING_COURIER_COLOR}"/>
  <circle cx="36" cy="36" r="24" fill="none" stroke="#ffffff" stroke-width="2.6"/>
  <path d="M22 41.5h28l-3.6-9.4c-.5-1.3-1.7-2.1-3.1-2.1H28.7c-1.4 0-2.6.8-3.1 2.1L22 41.5z" fill="#ffffff"/>
  <path d="M28.2 30.2l1.8-4.2h12l1.8 4.2" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linejoin="round"/>
  <circle cx="28.2" cy="41.5" r="3.1" fill="#ffffff"/>
  <circle cx="44.6" cy="41.5" r="3.1" fill="#ffffff"/>
  <circle cx="28.2" cy="41.5" r="1.3" fill="${TRACKING_COURIER_COLOR}"/>
  <circle cx="44.6" cy="41.5" r="1.3" fill="${TRACKING_COURIER_COLOR}"/>
</svg>
`.trim();

export const DESTINATION_MARKER_URL = svgDataUrl(DESTINATION_SVG);
export const COURIER_MOTO_MARKER_URL = svgDataUrl(COURIER_MOTO_SVG);
export const COURIER_CAR_MARKER_URL = svgDataUrl(COURIER_CAR_SVG);

export function isCarVehicle(vehicle?: string | null): boolean {
  const value = (vehicle || '').toLowerCase();
  return /car|汽车|ကား/.test(value);
}

export function getDestinationMarkerIcon(): google.maps.Icon {
  return {
    url: DESTINATION_MARKER_URL,
    scaledSize: new window.google.maps.Size(52, 68),
    anchor: new window.google.maps.Point(26, 64),
  };
}

export function getCourierMarkerIcon(vehicle?: string | null): google.maps.Icon {
  return {
    url: isCarVehicle(vehicle) ? COURIER_CAR_MARKER_URL : COURIER_MOTO_MARKER_URL,
    scaledSize: new window.google.maps.Size(72, 72),
    anchor: new window.google.maps.Point(36, 36),
  };
}
