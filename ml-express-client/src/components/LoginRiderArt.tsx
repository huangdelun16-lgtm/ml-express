import React from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

type Props = {
  width?: number;
  height?: number;
};

/** Stylized 3D-like courier matching the login mock (scooter + box + pin). */
export default function LoginRiderArt({ width = 236, height = 214 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 260 236">
      <Defs>
        <SvgGradient id="body" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#4EC4D6" />
          <Stop offset="1" stopColor="#1E8FA6" />
        </SvgGradient>
        <SvgGradient id="deck" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3BB3C8" />
          <Stop offset="1" stopColor="#187A8E" />
        </SvgGradient>
        <SvgGradient id="skin" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F8D2B0" />
          <Stop offset="1" stopColor="#E4AE80" />
        </SvgGradient>
        <SvgGradient id="box" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#E8C48A" />
          <Stop offset="1" stopColor="#C4924A" />
        </SvgGradient>
      </Defs>

      <Ellipse cx="132" cy="218" rx="78" ry="10" fill="rgba(11,58,92,0.12)" />

      {/* rear wheel */}
      <Circle cx="78" cy="186" r="26" fill="#1C2430" />
      <Circle cx="78" cy="186" r="16" fill="#4B5563" />
      <Circle cx="78" cy="186" r="6" fill="#E6EEF2" />
      {/* front wheel */}
      <Circle cx="188" cy="186" r="24" fill="#1C2430" />
      <Circle cx="188" cy="186" r="14" fill="#4B5563" />
      <Circle cx="188" cy="186" r="5" fill="#E6EEF2" />

      {/* deck */}
      <Path
        d="M70 168 C92 156 150 154 176 164 L184 176 C150 170 96 172 74 180 Z"
        fill="url(#deck)"
      />
      <Path d="M168 150 L196 168 L188 178 L162 162 Z" fill="#2C9DB3" />
      <Rect x="178" y="118" width="8" height="42" rx="3" fill="#D7EEF3" />
      <Path d="M174 116 L204 128 L198 136 L170 124 Z" fill="#F4FBFD" />

      {/* cargo box */}
      <Rect x="42" y="118" width="52" height="42" rx="6" fill="url(#box)" />
      <Rect x="42" y="132" width="52" height="8" fill="rgba(255,255,255,0.28)" />
      <Rect x="54" y="126" width="28" height="14" rx="3" fill="#1E7A8C" />

      {/* rider */}
      <Path d="M118 128 C108 148 108 168 128 172 C150 168 156 146 146 126 Z" fill="url(#body)" />
      <Path d="M124 168 L118 198 L132 198 L138 170 Z" fill="#243140" />
      <Path d="M136 168 L148 198 L160 196 L146 166 Z" fill="#1B2633" />
      <Ellipse cx="128" cy="122" rx="22" ry="20" fill="url(#skin)" />
      <Path d="M108 116 C112 92 150 90 150 118 C140 108 118 108 108 116 Z" fill="#1E8FA6" />
      <Circle cx="150" cy="112" r="7" fill="#167A8C" />
      <Circle cx="122" cy="122" r="2.4" fill="#3A2A22" />
      <Circle cx="134" cy="122" r="2.4" fill="#3A2A22" />
      <Path d="M122 132 Q128 136 135 132" stroke="#C47B5A" strokeWidth="1.6" fill="none" />

      {/* waving arm */}
      <Path d="M146 136 C168 118 178 102 170 92" stroke="#2C9DB3" strokeWidth="12" strokeLinecap="round" fill="none" />
      <Circle cx="168" cy="88" r="9" fill="url(#skin)" />

      {/* floating parcel */}
      <G>
        <Rect x="28" y="70" width="28" height="22" rx="3" fill="#D7A35A" />
        <Rect x="28" y="78" width="28" height="5" fill="#F0D09A" />
        <Path d="M42 70 L42 92" stroke="#F7F0E4" strokeWidth="2" />
      </G>

      {/* location pin bubble */}
      <Circle cx="214" cy="84" r="22" fill="#FFFFFF" />
      <Path d="M214 70 C206 70 200 76 200 84 C200 94 214 106 214 106 C214 106 228 94 228 84 C228 76 222 70 214 70 Z" fill="#2C9DB3" />
      <Circle cx="214" cy="83" r="4.2" fill="#FFFFFF" />
    </Svg>
  );
}

export function LoginBagMark({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44">
      <Rect x="0" y="0" width="44" height="44" rx="12" fill="#0B4A63" />
      <Path
        d="M12 18 H32 L30.5 34 H13.5 Z"
        fill="#F4FBFD"
      />
      <Path
        d="M16 18 C16 13.8 19.2 11 22 11 C24.8 11 28 13.8 28 18"
        stroke="#F4FBFD"
        strokeWidth="2.4"
        fill="none"
      />
      <Path
        d="M16.5 24 H27.5 V30.5 H24.2 L23.2 28.2 H20.8 L19.8 30.5 H16.5 Z"
        fill="#2C9DB3"
      />
      <Circle cx="18.6" cy="30.5" r="1.3" fill="#0B4A63" />
      <Circle cx="25.4" cy="30.5" r="1.3" fill="#0B4A63" />
    </Svg>
  );
}
