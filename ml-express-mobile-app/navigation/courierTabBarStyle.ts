import { Platform, type ViewStyle } from 'react-native';

export function courierTabBarStyle(bottomInset: number): ViewStyle {
  const inset = Math.max(bottomInset, 0);
  return {
    height: Platform.OS === 'ios' ? 62 + inset : 64 + Math.max(inset, 8),
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? inset + 2 : Math.max(inset, 8),
    paddingHorizontal: 8,
    borderTopWidth: StyleSheetHairline,
    borderTopColor: 'rgba(148, 163, 184, 0.22)',
    backgroundColor: '#101826',
    elevation: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
  };
}

const StyleSheetHairline = Platform.OS === 'ios' ? 0.5 : 1;
