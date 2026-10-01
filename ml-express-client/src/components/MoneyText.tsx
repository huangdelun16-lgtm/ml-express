import React from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';

/** 金额单行显示：空间不够时缩小字号，不从数字中间折行。 */
export const moneyLineProps: Pick<
  TextProps,
  'numberOfLines' | 'adjustsFontSizeToFit' | 'minimumFontScale' | 'ellipsizeMode'
> = {
  numberOfLines: 1,
  adjustsFontSizeToFit: true,
  minimumFontScale: 0.62,
  ellipsizeMode: 'clip',
};

export function formatClientMoney(amount: number | string | null | undefined): string {
  const num = Number(amount);
  if (!Number.isFinite(num)) return '0';
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

type Props = {
  amount: number | string | null | undefined;
  currency?: string | null;
  prefix?: string;
  style?: StyleProp<TextStyle>;
};

export default function MoneyText({ amount, currency = 'MMK', prefix = '', style }: Props) {
  const body = `${prefix}${formatClientMoney(amount)}${currency ? ` ${currency}` : ''}`;
  return (
    <Text {...moneyLineProps} style={style}>
      {body}
    </Text>
  );
}
