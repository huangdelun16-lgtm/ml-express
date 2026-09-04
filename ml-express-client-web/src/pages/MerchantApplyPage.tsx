import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import NavigationBar from '../components/home/NavigationBar';
import ClientInteriorShell from '../components/layout/ClientInteriorShell';
import MerchantApplySuccess from '../components/merchant/MerchantApplySuccess';
import PackingGuideModal from '../components/merchant/PackingGuideModal';
import { useLanguage } from '../contexts/LanguageContext';
import { MERCHANT_STORE_TYPE_OPTIONS } from '../services/_shared/merchantStoreTypes';
import { getMerchantApplyCopy, statusLabel } from '../utils/merchantApplyCopy';
import {
  formatCoordPair,
  geocoderLanguage,
  isLikelyMyanmarCoord,
  parseCoordinatePair,
  pickFormattedAddress,
} from '../utils/merchantApplyLocation';
import {
  lookupMerchantApplication,
  uploadMerchantApplyDocument,
  type PublicApplicationStatus,
} from '../utils/merchantApplyUpload';
import {
  appendPackingAckToNotes,
  getPackingProfile,
  type PackingLang,
} from '../utils/platformPackingGuide';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LOADER_OPTIONS } from '../utils/googleMapsLoader';
import '../styles/merchantApply.css';

const MAP_CONTAINER_STYLE: React.CSSProperties = { width: '100%', height: '100%' };
const MAP_OPTIONS = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  clickableIcons: false,
  gestureHandling: 'greedy' as const,
};

const REGIONS = [
  { id: 'mandalay', zh: '曼德勒', en: 'Mandalay', my: 'မန္တလေး', lat: 21.9588, lng: 96.0891 },
  { id: 'maymyo', zh: '彬乌伦', en: 'Pyin Oo Lwin', my: 'ပြင်ဦးလွင်', lat: 22.0333, lng: 96.4667 },
  { id: 'yangon', zh: '仰光', en: 'Yangon', my: 'ရန်ကုန်', lat: 16.8661, lng: 96.1951 },
  { id: 'naypyidaw', zh: '内比都', en: 'Naypyidaw', my: 'နေပြည်တော်', lat: 19.7633, lng: 96.0785 },
  { id: 'taunggyi', zh: '东枝', en: 'Taunggyi', my: 'တောင်ကြီး', lat: 20.7892, lng: 97.0378 },
  { id: 'lashio', zh: '腊戌', en: 'Lashio', my: 'လားရှိုး', lat: 22.9333, lng: 97.75 },
  { id: 'muse', zh: '木姐', en: 'Muse', my: 'မူဆယ်', lat: 23.9833, lng: 97.9 },
];

const STORE_TYPES = MERCHANT_STORE_TYPE_OPTIONS;

const COD_OPTIONS = [
  { value: '7', zh: '7 天', en: '7 days', my: '၇ ရက်' },
  { value: '10', zh: '10 天', en: '10 days', my: '၁၀ ရက်' },
  { value: '15', zh: '15 天', en: '15 days', my: '၁၅ ရက်' },
  { value: '30', zh: '30 天', en: '30 days', my: '၃၀ ရက်' },
];

const MAX_LICENSE_FILES = 8;

type PlaceSuggestion = {
  place_id: string;
  main_text: string;
  secondary_text: string;
  description: string;
};

type LicenseDocItem = {
  id: string;
  file: File;
  fileName: string;
  contentType: string;
  previewUrl: string;
  url?: string;
  status: 'uploading' | 'ready' | 'error';
  error?: string;
};

type FormState = {
  store_name: string;
  store_type: string;
  region: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  manager_name: string;
  manager_phone: string;
  operating_hours: string;
  cod_settlement_day: string;
  salesperson_name: string;
  application_date: string;
  notes: string;
};

type SubmittedState = {
  applicationId: string;
  phone: string;
  email: string;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLabel(iso: string, isEn: boolean, isMy: boolean): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  if (isEn) {
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  if (isMy) {
    return `${d}.${m}.${y}`;
  }
  return `${y}年${m}月${d}日`;
}

function formatDateWeekday(iso: string, isEn: boolean, isMy: boolean): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  const date = new Date(y, m - 1, d);
  if (isEn) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  if (isMy) {
    const weekdays = ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ'];
    return weekdays[date.getDay()];
  }
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return weekdays[date.getDay()];
}

function newDocId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_FORM: FormState = {
  store_name: '',
  store_type: '',
  region: 'mandalay',
  address: '',
  latitude: 21.9588,
  longitude: 96.0891,
  phone: '',
  email: '',
  manager_name: '',
  manager_phone: '',
  operating_hours: '08:00 - 22:00',
  cod_settlement_day: '7',
  salesperson_name: '',
  application_date: todayISO(),
  notes: '',
};

const MerchantApplyPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const isEn = language === 'en';
  const isMy = language === 'my';
  const packingLang: PackingLang = isEn ? 'en' : isMy ? 'my' : 'zh';
  const t = useMemo(() => getMerchantApplyCopy(packingLang), [packingLang]);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [licenseDocs, setLicenseDocs] = useState<LicenseDocItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<SubmittedState | null>(null);
  const [packingModalOpen, setPackingModalOpen] = useState(false);
  const [packingViewed, setPackingViewed] = useState(false);
  const [packingAcked, setPackingAcked] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mapAuthFailed, setMapAuthFailed] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [latInput, setLatInput] = useState(String(DEFAULT_FORM.latitude));
  const [lngInput, setLngInput] = useState(String(DEFAULT_FORM.longitude));
  const [showLookup, setShowLookup] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupRow, setLookupRow] = useState<PublicApplicationStatus | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const placesAttrRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const searchTimerRef = useRef<number | null>(null);
  const addressDirtyRef = useRef(false);
  const initialMapCenter = useRef({ lat: DEFAULT_FORM.latitude, lng: DEFAULT_FORM.longitude });
  const formCoordsRef = useRef({ lat: form.latitude, lng: form.longitude });
  formCoordsRef.current = { lat: form.latitude, lng: form.longitude };

  const { isLoaded: isMapLoaded, loadError: mapLoadError } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);
  const mapsReady = Boolean(isMapLoaded && !mapLoadError && window.google?.maps);

  useEffect(() => {
    if (mapLoadError) {
      console.error('[MerchantApply] Google Maps 加载失败:', mapLoadError);
    }
  }, [mapLoadError]);

  useEffect(() => {
    const gwindow = window as Window & { gm_authFailure?: () => void };
    const previous = gwindow.gm_authFailure;
    gwindow.gm_authFailure = () => {
      setMapAuthFailed(true);
    };
    return () => {
      gwindow.gm_authFailure = previous;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
      licenseDocs.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensurePlaces = useCallback(() => {
    if (!window.google?.maps?.places) return false;
    if (!autocompleteRef.current) {
      autocompleteRef.current = new window.google.maps.places.AutocompleteService();
    }
    if (!placesRef.current) {
      const node = mapRef.current || placesAttrRef.current;
      if (node) {
        placesRef.current = new window.google.maps.places.PlacesService(node as google.maps.Map);
      }
    }
    return Boolean(autocompleteRef.current);
  }, []);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      if (!window.google?.maps?.Geocoder) return '';
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({
        location: { lat, lng },
        language: geocoderLanguage(packingLang),
      });
      return pickFormattedAddress(response.results?.[0]);
    },
    [packingLang],
  );

  const applyPinnedLocation = useCallback(
    (
      lat: number,
      lng: number,
      options?: { zoom?: number; address?: string; fillAddress?: boolean },
    ) => {
      setLocationConfirmed(true);
      setLatInput(lat.toFixed(5));
      setLngInput(lng.toFixed(5));
      setForm((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        address: options?.address || prev.address,
      }));
      if (mapRef.current) {
        mapRef.current.panTo({ lat, lng });
        if (options?.zoom != null) mapRef.current.setZoom(options.zoom);
      }
      if (options?.fillAddress && !options.address && !addressDirtyRef.current) {
        reverseGeocode(lat, lng)
          .then((addr) => {
            if (!addr || addressDirtyRef.current) return;
            setForm((prev) => (prev.address.trim() ? prev : { ...prev, address: addr }));
          })
          .catch(() => {});
      }
    },
    [reverseGeocode],
  );

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    map.panTo(formCoordsRef.current);
    if (window.google?.maps?.places) {
      autocompleteRef.current = new window.google.maps.places.AutocompleteService();
      placesRef.current = new window.google.maps.places.PlacesService(map);
    }
  }, []);

  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      applyPinnedLocation(event.latLng.lat(), event.latLng.lng(), { fillAddress: true });
    },
    [applyPinnedLocation],
  );

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      setError(t.locateUnsupported);
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyPinnedLocation(position.coords.latitude, position.coords.longitude, {
          zoom: 16,
          fillAddress: true,
        });
        setLocating(false);
      },
      (geoError) => {
        setLocating(false);
        if (geoError.code === 1) setError(t.locateDenied);
        else if (geoError.code === 2) setError(t.locateUnavailable);
        else if (geoError.code === 3) setError(t.locateTimeout);
        else setError(t.locateFailed);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 },
    );
  }, [
    applyPinnedLocation,
    t.locateDenied,
    t.locateFailed,
    t.locateTimeout,
    t.locateUnavailable,
    t.locateUnsupported,
  ]);

  const geocodeQuery = useCallback(
    async (query: string) => {
      if (!window.google?.maps?.Geocoder) throw new Error('NO_GEOCODER');
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({
        address: `${query}, Myanmar`,
        language: geocoderLanguage(packingLang),
        componentRestrictions: { country: 'MM' },
      });
      const first = response.results?.[0];
      const loc = first?.geometry?.location;
      if (!loc) throw new Error('NO_RESULT');
      applyPinnedLocation(loc.lat(), loc.lng(), {
        zoom: 16,
        address: pickFormattedAddress(first),
      });
      addressDirtyRef.current = true;
    },
    [applyPinnedLocation, packingLang],
  );

  const selectPlace = useCallback(
    (placeId: string) => {
      ensurePlaces();
      const service = placesRef.current;
      if (!service) {
        setError(t.searchFailed);
        return;
      }
      service.getDetails(
        { placeId, fields: ['geometry', 'formatted_address', 'name'] },
        (place, status) => {
          if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) {
            setError(t.searchFailed);
            return;
          }
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const address = pickFormattedAddress(place);
          addressDirtyRef.current = true;
          applyPinnedLocation(lat, lng, { zoom: 16, address });
          setSearchQuery(address || searchQuery);
          setSuggestions([]);
          setShowSuggestions(false);
        },
      );
    },
    [applyPinnedLocation, ensurePlaces, searchQuery, t.searchFailed],
  );

  const runPredictionSearch = useCallback(
    (input: string) => {
      if (mapAuthFailed || !ensurePlaces() || !autocompleteRef.current) {
        setSearching(false);
        return;
      }
      const stuckTimer = window.setTimeout(() => setSearching(false), 4000);
      autocompleteRef.current.getPlacePredictions(
        {
          input,
          location: new window.google.maps.LatLng(formCoordsRef.current.lat, formCoordsRef.current.lng),
          radius: 50000,
          componentRestrictions: { country: 'mm' },
          language: packingLang === 'zh' ? 'zh-CN' : 'en',
        },
        (predictions, status) => {
          window.clearTimeout(stuckTimer);
          setSearching(false);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions?.length) {
            setSuggestions(
              predictions.slice(0, 8).map((prediction) => ({
                place_id: prediction.place_id,
                main_text: prediction.structured_formatting?.main_text || prediction.description,
                secondary_text: prediction.structured_formatting?.secondary_text || '',
                description: prediction.description,
              })),
            );
            setShowSuggestions(true);
            return;
          }
          setSuggestions([]);
          setShowSuggestions(false);
        },
      );
    },
    [ensurePlaces, mapAuthFailed, packingLang],
  );

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearching(false);
      return;
    }
    if (!mapsReady || mapAuthFailed) {
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimerRef.current = window.setTimeout(() => {
      runPredictionSearch(value.trim());
    }, 300);
  };

  const handleSearchSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const query = searchQuery.trim();
    if (query.length < 2) return;
    setError(null);
    if (suggestions[0]) {
      selectPlace(suggestions[0].place_id);
      return;
    }
    try {
      setSearching(true);
      await geocodeQuery(query);
      setShowSuggestions(false);
    } catch {
      setError(t.searchNoResults);
    } finally {
      setSearching(false);
    }
  };

  const handleUseTypedAddress = async () => {
    const query = form.address.trim();
    if (query.length < 3) {
      setError(t.searchFailed);
      return;
    }
    setSearchQuery(query);
    setError(null);
    try {
      setSearching(true);
      await geocodeQuery(query);
    } catch {
      setError(t.searchNoResults);
    } finally {
      setSearching(false);
    }
  };

  const handleApplyManualCoords = () => {
    const parsed = parseCoordinatePair(latInput, lngInput);
    if (!parsed.ok) {
      setError(t.invalidCoords);
      return;
    }
    setError(isLikelyMyanmarCoord(parsed.lat, parsed.lng) ? null : t.coordsOutsideHint);
    applyPinnedLocation(parsed.lat, parsed.lng, { zoom: 16, fillAddress: true });
  };

  const labelRegion = (id: string) => {
    const row = REGIONS.find((r) => r.id === id);
    if (!row) return id;
    return isEn ? row.en : isMy ? row.my : row.zh;
  };

  const labelStoreType = (value: string) => {
    const row = STORE_TYPES.find((s) => s.value === value);
    if (!row) return value;
    return isEn ? row.en : isMy ? row.my : row.zh;
  };

  const packingProfile = useMemo(() => getPackingProfile(form.store_type), [form.store_type]);

  const resetPackingAck = () => {
    setPackingViewed(false);
    setPackingAcked(false);
  };

  const handleStoreTypeChange = (storeType: string) => {
    setForm((prev) => ({ ...prev, store_type: storeType }));
    resetPackingAck();
    setPackingModalOpen(true);
  };

  const handleRegionChange = (region: string) => {
    const hub = REGIONS.find((r) => r.id === region) || REGIONS[0];
    if (locationConfirmed) {
      setForm((prev) => ({ ...prev, region }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      region,
      latitude: hub.lat,
      longitude: hub.lng,
    }));
    setLatInput(hub.lat.toFixed(5));
    setLngInput(hub.lng.toFixed(5));
    mapRef.current?.panTo({ lat: hub.lat, lng: hub.lng });
  };

  const uploadMessage = (code: string) => {
    if (code === 'UNSUPPORTED_TYPE') return t.badFileType;
    if (code === 'PDF_TOO_LARGE') return t.pdfTooLarge;
    if (code === 'IMAGE_TOO_LARGE') return t.fileTooLarge;
    return t.uploadFailed;
  };

  const startUpload = async (item: LicenseDocItem) => {
    try {
      const result = await uploadMerchantApplyDocument(item.file);
      setLicenseDocs((prev) =>
        prev.map((doc) =>
          doc.id === item.id
            ? { ...doc, status: 'ready', url: result.url, fileName: result.fileName, error: undefined }
            : doc,
        ),
      );
    } catch (err) {
      const code = err instanceof Error ? err.message : 'UPLOAD_FAILED';
      setLicenseDocs((prev) =>
        prev.map((doc) =>
          doc.id === item.id ? { ...doc, status: 'error', error: uploadMessage(code) } : doc,
        ),
      );
    }
  };

  const handlePickDocuments = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = '';
    if (!picked.length) return;

    setError(null);
    const remaining = MAX_LICENSE_FILES - licenseDocs.length;
    if (remaining <= 0) {
      setError(t.tooManyDocs);
      return;
    }

    const accepted = picked.slice(0, remaining);
    const nextItems: LicenseDocItem[] = [];

    for (const file of accepted) {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      if (!isImage && !isPdf) {
        setError(t.badFileType);
        continue;
      }
      if (isPdf && file.size > 3.5 * 1024 * 1024) {
        setError(t.pdfTooLarge);
        continue;
      }
      if (isImage && file.size > 5 * 1024 * 1024) {
        setError(t.fileTooLarge);
        continue;
      }
      nextItems.push({
        id: newDocId(),
        file,
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        previewUrl: isImage ? URL.createObjectURL(file) : '',
        status: 'uploading',
      });
    }

    if (!nextItems.length) return;
    setLicenseDocs((prev) => [...prev, ...nextItems]);
    nextItems.forEach((item) => {
      void startUpload(item);
    });
  };

  const handleRetryUpload = (id: string) => {
    const target = licenseDocs.find((item) => item.id === id);
    if (!target) return;
    setLicenseDocs((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, status: 'uploading', error: undefined } : doc)),
    );
    void startUpload({ ...target, status: 'uploading', error: undefined });
  };

  const handleRemoveDocument = (id: string) => {
    setLicenseDocs((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const clearLicenseDocs = () => {
    licenseDocs.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setLicenseDocs([]);
  };

  const readyDocUrls = licenseDocs.filter((doc) => doc.status === 'ready' && doc.url).map((doc) => doc.url as string);
  const uploadingDocs = licenseDocs.some((doc) => doc.status === 'uploading');
  const coordsLookForeign = locationConfirmed && !isLikelyMyanmarCoord(form.latitude, form.longitude);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadingDocs) {
      setError(t.uploadStillUploading);
      return;
    }
    if (readyDocUrls.length < 1) {
      setError(t.uploadNeedReady);
      return;
    }
    if (!locationConfirmed) {
      setError(t.locationRequired);
      return;
    }
    if (!packingAcked) {
      setPackingModalOpen(true);
      setError(t.packingRequired);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/.netlify/functions/merchant-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          notes: appendPackingAckToNotes(form.notes, packingProfile),
          packing_acknowledged: true,
          packing_profile: packingProfile.id,
          license_document_urls: readyDocUrls,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || t.submitError);
      }
      setSubmitted({
        applicationId: String(payload.applicationId || ''),
        phone: form.phone,
        email: form.email,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyAgain = () => {
    setSubmitted(null);
    setForm({ ...DEFAULT_FORM, application_date: todayISO() });
    setLatInput(String(DEFAULT_FORM.latitude));
    setLngInput(String(DEFAULT_FORM.longitude));
    setLocationConfirmed(false);
    addressDirtyRef.current = false;
    resetPackingAck();
    clearLicenseDocs();
    setError(null);
    setSearchQuery('');
  };

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    setLooking(true);
    setLookupError(null);
    try {
      const row = await lookupMerchantApplication(lookupPhone);
      setLookupRow(row);
    } catch (err) {
      const message = err instanceof Error ? err.message : t.lookupFailed;
      setLookupRow(null);
      setLookupError(/未找到|not found/i.test(message) ? t.lookupNotFound : t.lookupFailed);
    } finally {
      setLooking(false);
    }
  };

  const dateDisplay = formatDateLabel(form.application_date, isEn, isMy);
  const mapBlocked = !GOOGLE_MAPS_API_KEY || Boolean(mapLoadError);
  const submitDisabled = submitting || !packingAcked || uploadingDocs || readyDocUrls.length < 1 || !locationConfirmed;

  return (
    <ClientInteriorShell>
    <div className="merchant-apply-page">
      <NavigationBar
        language={language}
        onLanguageChange={(newLanguage) => {
          setLanguage(newLanguage);
          localStorage.setItem('ml-express-language', newLanguage);
        }}
        currentUser={null}
        onLogout={() => {}}
        onShowRegisterModal={(isLoginMode) => {
          navigate('/', { state: { showModal: true, isLoginMode } });
        }}
      />
      <div className="merchant-apply-page__inner">
        <header className="merchant-apply-hero">
          <div className="client-page-accent-bar" />
          <h1 className="client-page-title client-page-title--sm">{t.title}</h1>
          <p className="client-page-subtitle">{t.subtitle}</p>
          <ol className="merchant-apply-steps">
            <li className="is-current">{t.step1}</li>
            <li>{t.step2}</li>
            <li>{t.step3}</li>
          </ol>
        </header>

        <div className="merchant-apply-card">
          {submitted ? (
            <MerchantApplySuccess
              t={t}
              applicationId={submitted.applicationId}
              phone={submitted.phone}
              email={submitted.email}
              onApplyAgain={handleApplyAgain}
            />
          ) : (
            <>
              {error && (
                <div className="merchant-apply-alert merchant-apply-alert--error" role="alert">
                  {error}
                </div>
              )}

              {showLookup ? (
                <form className="merchant-apply-lookup" onSubmit={handleLookup}>
                  <div className="merchant-apply-lookup__head">
                    <div>
                      <h3>{t.successLookupTitle}</h3>
                      <p>{t.successLookupHint}</p>
                    </div>
                    <button
                      type="button"
                      className="merchant-apply-lookup-toggle"
                      onClick={() => setShowLookup(false)}
                    >
                      {t.hideStatus}
                    </button>
                  </div>
                  <label htmlFor="form_lookup_phone">{t.successLookupPhone}</label>
                  <div className="merchant-apply-lookup__row">
                    <input
                      id="form_lookup_phone"
                      value={lookupPhone}
                      onChange={(e) => setLookupPhone(e.target.value)}
                      required
                    />
                    <button type="submit" className="merchant-apply-btn merchant-apply-btn--primary" disabled={looking}>
                      {looking ? t.successLookuping : t.successLookupBtn}
                    </button>
                  </div>
                  {lookupError ? <p className="merchant-apply-lookup__error">{lookupError}</p> : null}
                  {lookupRow ? (
                    <dl className="merchant-apply-lookup__result">
                      <div>
                        <dt>{t.successId}</dt>
                        <dd>{lookupRow.applicationId}</dd>
                      </div>
                      <div>
                        <dt>{t.storeName}</dt>
                        <dd>{lookupRow.store_name || '—'}</dd>
                      </div>
                      <div>
                        <dt>{statusLabel(lookupRow.status, t)}</dt>
                        <dd>{lookupRow.created_at ? lookupRow.created_at.slice(0, 10) : '—'}</dd>
                      </div>
                    </dl>
                  ) : null}
                </form>
              ) : (
                <div className="merchant-apply-card__top">
                  <button
                    type="button"
                    className="merchant-apply-lookup-toggle"
                    onClick={() => setShowLookup(true)}
                  >
                    {t.checkStatus}
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <section className="merchant-apply-section merchant-apply-section--registration">
                  <div className="merchant-apply-section__head">
                    <span className="merchant-apply-section__icon" aria-hidden="true">
                      1
                    </span>
                    <h2>{t.registration}</h2>
                  </div>
                  <div className="merchant-apply-grid merchant-apply-grid--registration">
                    <div className="merchant-apply-field">
                      <label htmlFor="salesperson_name">{t.salesperson}</label>
                      <input
                        id="salesperson_name"
                        value={form.salesperson_name}
                        onChange={(e) => setForm({ ...form, salesperson_name: e.target.value })}
                        placeholder={t.salespersonPlaceholder}
                      />
                    </div>
                    <div className="merchant-apply-field">
                      <label htmlFor="application_date">{t.applicationDate} *</label>
                      <div className="merchant-apply-date merchant-apply-date--compact">
                        <input
                          id="application_date"
                          type="date"
                          className="merchant-apply-date__input-visible"
                          value={form.application_date}
                          onChange={(e) => setForm({ ...form, application_date: e.target.value })}
                          required
                        />
                        <span className="merchant-apply-date__hint">
                          {formatDateWeekday(form.application_date, isEn, isMy)}
                          {formatDateWeekday(form.application_date, isEn, isMy) ? ', ' : ''}
                          {dateDisplay}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="merchant-apply-upload">
                    <div className="merchant-apply-upload__head">
                      <p className="merchant-apply-upload__title">{t.uploadHint}</p>
                      <p className="merchant-apply-upload__formats">{t.uploadFormats}</p>
                      <p className="merchant-apply-upload__formats">{t.archiveHint}</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                      multiple
                      className="merchant-apply-upload__native"
                      onChange={handlePickDocuments}
                    />
                    <button
                      type="button"
                      className="merchant-apply-upload__add"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={licenseDocs.length >= MAX_LICENSE_FILES || submitting}
                    >
                      {t.uploadLicense}
                    </button>

                    {licenseDocs.length === 0 ? (
                      <p className="merchant-apply-upload__empty">{t.noDocsYet}</p>
                    ) : (
                      <ul className="merchant-apply-upload__list">
                        {licenseDocs.map((doc) => (
                          <li key={doc.id} className={`merchant-apply-upload__item merchant-apply-upload__item--${doc.status}`}>
                            {doc.previewUrl ? (
                              <img src={doc.previewUrl} alt="" className="merchant-apply-upload__thumb" />
                            ) : (
                              <div className="merchant-apply-upload__pdf">PDF</div>
                            )}
                            <div className="merchant-apply-upload__meta">
                              <span className="merchant-apply-upload__name">{doc.fileName}</span>
                              <span
                                className={`merchant-apply-upload__status merchant-apply-upload__status--${doc.status}`}
                              >
                                {doc.status === 'uploading'
                                  ? t.uploadUploading
                                  : doc.status === 'ready'
                                    ? t.uploadReady
                                    : doc.error || t.uploadFailed}
                              </span>
                            </div>
                            {doc.status === 'error' ? (
                              <button
                                type="button"
                                className="merchant-apply-upload__retry"
                                onClick={() => handleRetryUpload(doc.id)}
                                disabled={submitting}
                              >
                                {t.uploadRetry}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="merchant-apply-upload__remove"
                              onClick={() => handleRemoveDocument(doc.id)}
                              disabled={submitting}
                            >
                              {t.removeDoc}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>

                <section className="merchant-apply-section">
                  <div className="merchant-apply-section__head">
                    <span className="merchant-apply-section__icon" aria-hidden="true">
                      2
                    </span>
                    <h2>{t.basic}</h2>
                  </div>
                  <div className="merchant-apply-grid">
                    <div className="merchant-apply-field">
                      <label htmlFor="store_name">{t.storeName} *</label>
                      <input
                        id="store_name"
                        value={form.store_name}
                        onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="merchant-apply-field">
                      <label htmlFor="phone">{t.phone} *</label>
                      <input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div className="merchant-apply-field">
                      <label htmlFor="store_type">{t.storeType} *</label>
                      <select
                        id="store_type"
                        value={form.store_type}
                        onChange={(e) => handleStoreTypeChange(e.target.value)}
                        required
                      >
                        <option value="" disabled>
                          {t.storeTypePlaceholder}
                        </option>
                        {STORE_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {labelStoreType(type.value)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="merchant-apply-field">
                      <label htmlFor="region">{t.region} *</label>
                      <select
                        id="region"
                        value={form.region}
                        onChange={(e) => handleRegionChange(e.target.value)}
                        required
                      >
                        {REGIONS.map((region) => (
                          <option key={region.id} value={region.id}>
                            {labelRegion(region.id)}
                          </option>
                        ))}
                      </select>
                    </div>
                    {form.store_type ? (
                      <div className="merchant-apply-field merchant-apply-field--full">
                        <div
                          className={`merchant-apply-packing${packingAcked ? ' merchant-apply-packing--done' : ''}`}
                        >
                          <div className="merchant-apply-packing__top">
                            <div>
                              <p className="merchant-apply-packing__label">{t.packingLabel}</p>
                              <p className="merchant-apply-packing__title">{packingProfile.title[packingLang]}</p>
                              <p className="merchant-apply-packing__hint">{packingProfile.hint[packingLang]}</p>
                            </div>
                            <span
                              className={`merchant-apply-packing__status${
                                packingAcked ? ' merchant-apply-packing__status--done' : ''
                              }`}
                            >
                              {packingAcked ? t.packingDone : t.packingPending}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="merchant-apply-packing__view"
                            onClick={() => setPackingModalOpen(true)}
                          >
                            {t.packingView}
                          </button>
                          <label className="merchant-apply-packing__ack">
                            <input
                              type="checkbox"
                              checked={packingAcked}
                              onChange={(e) => {
                                if (!packingViewed) {
                                  setPackingModalOpen(true);
                                  return;
                                }
                                setPackingAcked(e.target.checked);
                              }}
                            />
                            <span>{packingViewed ? t.packingAck : t.packingNeedView}</span>
                          </label>
                        </div>
                      </div>
                    ) : null}
                    <div className="merchant-apply-field">
                      <label htmlFor="operating_hours">{t.hours} *</label>
                      <input
                        id="operating_hours"
                        value={form.operating_hours}
                        onChange={(e) => setForm({ ...form, operating_hours: e.target.value })}
                        placeholder={t.hoursPlaceholder}
                        required
                      />
                    </div>
                    <div className="merchant-apply-field">
                      <label htmlFor="cod_settlement_day">{t.cod} *</label>
                      <select
                        id="cod_settlement_day"
                        value={form.cod_settlement_day}
                        onChange={(e) => setForm({ ...form, cod_settlement_day: e.target.value })}
                        required
                      >
                        {COD_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {isEn ? opt.en : isMy ? opt.my : opt.zh}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="merchant-apply-field">
                      <label htmlFor="email">{t.email}</label>
                      <input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                    <div className="merchant-apply-field">
                      <label htmlFor="manager_name">{t.manager} *</label>
                      <input
                        id="manager_name"
                        value={form.manager_name}
                        onChange={(e) => setForm({ ...form, manager_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="merchant-apply-field">
                      <label htmlFor="manager_phone">{t.managerPhone} *</label>
                      <input
                        id="manager_phone"
                        value={form.manager_phone}
                        onChange={(e) => setForm({ ...form, manager_phone: e.target.value })}
                        required
                      />
                    </div>
                    <div className="merchant-apply-field merchant-apply-field--full">
                      <label htmlFor="address">{t.address} *</label>
                      <div className="merchant-apply-address-row">
                        <input
                          id="address"
                          value={form.address}
                          onChange={(e) => {
                            addressDirtyRef.current = true;
                            setForm({ ...form, address: e.target.value });
                          }}
                          required
                        />
                        <button
                          type="button"
                          className="merchant-apply-address-find"
                          onClick={handleUseTypedAddress}
                          disabled={searching || form.address.trim().length < 3}
                        >
                          {t.searchUseAddress}
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="merchant-apply-footnote">{t.mapHint}</p>
                  <div className="merchant-apply-search">
                    <label htmlFor="map_search">{t.searchAddress}</label>
                    <div className="merchant-apply-search__row">
                      <input
                        id="map_search"
                        value={searchQuery}
                        onChange={(e) => handleSearchInput(e.target.value)}
                        onFocus={() => suggestions.length && setShowSuggestions(true)}
                        placeholder={t.searchAddressPlaceholder}
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        className="merchant-apply-search__btn"
                        onClick={() => void handleSearchSubmit()}
                        disabled={searchQuery.trim().length < 2}
                      >
                        {t.searchAddressBtn}
                      </button>
                    </div>
                    {showSuggestions && suggestions.length > 0 ? (
                      <ul className="merchant-apply-search__list">
                        {suggestions.map((item) => (
                          <li key={item.place_id}>
                            <button type="button" onClick={() => selectPlace(item.place_id)}>
                              <strong>{item.main_text}</strong>
                              {item.secondary_text ? <span>{item.secondary_text}</span> : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <div className="merchant-apply-map-wrap">
                    {mapBlocked ? (
                      <div className="merchant-apply-map-placeholder">{t.mapUnavailable}</div>
                    ) : !isMapLoaded ? (
                      <div className="merchant-apply-map-placeholder">{t.mapLoading}</div>
                    ) : (
                      <div className="merchant-apply-map">
                        <GoogleMap
                          mapContainerStyle={MAP_CONTAINER_STYLE}
                          center={initialMapCenter.current}
                          zoom={13}
                          options={MAP_OPTIONS}
                          onLoad={handleMapLoad}
                          onClick={handleMapClick}
                        >
                          <Marker position={{ lat: form.latitude, lng: form.longitude }} />
                        </GoogleMap>
                        {mapAuthFailed ? (
                          <div className="merchant-apply-map-placeholder merchant-apply-map-placeholder--overlay">
                            {t.mapAuthFailed}
                          </div>
                        ) : null}
                      </div>
                    )}
                    <button
                      type="button"
                      className="merchant-apply-locate"
                      onClick={handleLocate}
                      disabled={locating}
                      aria-label={t.locateLabel}
                      title={t.locateLabel}
                    >
                      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                        <circle cx="12" cy="12" r="3" fill="currentColor" />
                        <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path
                          d="M12 2.5v3.2M12 18.3v3.2M2.5 12h3.2M18.3 12h3.2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="merchant-apply-coords-row">
                    <div
                      className={`merchant-apply-coords${
                        locationConfirmed ? ' merchant-apply-coords--ok' : ''
                      }`}
                    >
                      {t.coords}: {formatCoordPair(form.latitude, form.longitude)}
                      <span>{locationConfirmed ? t.locationConfirmed : t.locationPending}</span>
                    </div>
                  </div>
                  {coordsLookForeign ? (
                    <p className="merchant-apply-footnote merchant-apply-footnote--warn">{t.coordsOutsideHint}</p>
                  ) : null}
                  <div className="merchant-apply-manual">
                    <p>{t.manualCoords}</p>
                    <div className="merchant-apply-manual__row">
                      <label>
                        {t.manualLat}
                        <input
                          inputMode="decimal"
                          value={latInput}
                          onChange={(e) => setLatInput(e.target.value)}
                        />
                      </label>
                      <label>
                        {t.manualLng}
                        <input
                          inputMode="decimal"
                          value={lngInput}
                          onChange={(e) => setLngInput(e.target.value)}
                        />
                      </label>
                      <button type="button" className="merchant-apply-manual__apply" onClick={handleApplyManualCoords}>
                        {t.applyCoords}
                      </button>
                    </div>
                  </div>
                  <div className="merchant-apply-field merchant-apply-field--full merchant-apply-field--notes">
                    <label htmlFor="notes">{t.notes}</label>
                    <textarea
                      id="notes"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder={t.notesPlaceholder}
                    />
                  </div>
                </section>

                <div className="merchant-apply-actions">
                  <Link to="/" className="merchant-apply-btn merchant-apply-btn--ghost">
                    {t.home}
                  </Link>
                  <button
                    type="submit"
                    className="merchant-apply-btn merchant-apply-btn--primary"
                    disabled={submitDisabled}
                  >
                    {submitting ? t.submitting : t.submit}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
      <div ref={placesAttrRef} hidden />
      <PackingGuideModal
        open={packingModalOpen}
        profile={packingProfile}
        storeTypeLabel={labelStoreType(form.store_type)}
        lang={packingLang}
        copy={{
          kicker: t.packingKicker,
          forType: t.packingForType,
          confirm: t.packingConfirm,
          close: t.packingClose,
          confirmHint: t.packingConfirmHint,
        }}
        onClose={() => setPackingModalOpen(false)}
        onConfirm={() => {
          setPackingViewed(true);
          setPackingAcked(true);
          setPackingModalOpen(false);
          setError(null);
        }}
      />
    </div>
    </ClientInteriorShell>
  );
};

export default MerchantApplyPage;
