import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const SRC = require('../../assets/brand-rider-3d.png');
/** Native pixel ratio of brand-rider-3d.png (748×900). */
export const BRAND_RIDER_RATIO = 748 / 900;

type Props = {
  width: number;
  style?: StyleProp<ImageStyle>;
};

export default function BrandRider({ width, style }: Props) {
  const height = Math.round(width / BRAND_RIDER_RATIO);
  return (
    <Image
      source={SRC}
      style={[{ width, height }, style]}
      resizeMode="contain"
    />
  );
}

export function brandRiderHeight(width: number) {
  return Math.round(width / BRAND_RIDER_RATIO);
}
