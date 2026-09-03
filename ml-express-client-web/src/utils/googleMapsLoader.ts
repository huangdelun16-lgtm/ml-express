import type { Libraries } from '@react-google-maps/api';

export const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

/** Must stay a stable module-level array — useJsApiLoader rejects a new instance per call. */
export const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];

/**
 * Shared options for every `useJsApiLoader` in client-web.
 * Home, tracking, and merchant-apply must pass this exact object so the
 * Maps script is not injected twice with different options.
 */
export const GOOGLE_MAPS_LOADER_OPTIONS = {
  googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  libraries: GOOGLE_MAPS_LIBRARIES,
};
