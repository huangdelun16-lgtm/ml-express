import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'location_in_app_disclosure_accepted_v1';

export async function hasAcceptedLocationDisclosure(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY);
  return v === 'true';
}

export async function setLocationDisclosureAccepted(): Promise<void> {
  await AsyncStorage.setItem(KEY, 'true');
}
