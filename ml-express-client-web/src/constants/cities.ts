export const MYANMAR_CITIES = {
  mandalay: { name: '曼德勒', nameEn: 'Mandalay', nameMm: 'မန္တလေး', lat: 21.9588, lng: 96.0891 },
  pyinoolwin: { name: '眉苗', nameEn: 'Pyin Oo Lwin', nameMm: 'ပင်းတလဲ', lat: 22.0333, lng: 96.4667 },
  yangon: { name: '仰光', nameEn: 'Yangon', nameMm: 'ရန်ကုန်', lat: 16.8661, lng: 96.1951 },
  naypyidaw: { name: '内比都', nameEn: 'Naypyidaw', nameMm: 'နေပြည်တော်', lat: 19.7633, lng: 96.0785 },
  taunggyi: { name: '东枝', nameEn: 'Taunggyi', nameMm: 'တောင်ကြီး', lat: 20.7892, lng: 97.0378 },
  lashio: { name: '腊戌', nameEn: 'Lashio', nameMm: 'လားရှိုး', lat: 22.9333, lng: 97.75 },
  muse: { name: '木姐', nameEn: 'Muse', nameMm: 'မူဆယ်', lat: 23.9833, lng: 97.9 }
} as const;

export type CityKey = keyof typeof MYANMAR_CITIES;
export const DEFAULT_CITY_KEY: CityKey = 'mandalay';
export const DEFAULT_CITY_CENTER = {
  lat: MYANMAR_CITIES[DEFAULT_CITY_KEY].lat,
  lng: MYANMAR_CITIES[DEFAULT_CITY_KEY].lng
};
