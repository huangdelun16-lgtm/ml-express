import React, { useId } from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient as SvgGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

type SizeProps = { size?: number };

const TEAL_HI = '#8AE8F2';
const TEAL = '#2C98A6';
const TEAL_LO = '#176978';

function gid(raw: string) {
  return `p${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
}

function tealStops() {
  return [
    <Stop key="hi" offset="0" stopColor={TEAL_HI} />,
    <Stop key="mid" offset="0.45" stopColor={TEAL} />,
    <Stop key="lo" offset="1" stopColor={TEAL_LO} />,
  ];
}

/** Circular 3D courier avatar (teal hoodie, no outlines). */
export function ProfileAvatar3D({ size = 76 }: SizeProps) {
  const id = gid(useId());
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <RadialGradient id={`${id}bg`} cx="50%" cy="40%" r="60%">
          <Stop offset="0" stopColor="#E7F7F9" />
          <Stop offset="1" stopColor="#BFE4EA" />
        </RadialGradient>
        <RadialGradient id={`${id}skin`} cx="36%" cy="28%" r="70%">
          <Stop offset="0" stopColor="#FFE7CF" />
          <Stop offset="0.55" stopColor="#F2C094" />
          <Stop offset="1" stopColor="#D08A58" />
        </RadialGradient>
        <SvgGradient id={`${id}hood`} x1="0.2" y1="0" x2="0.9" y2="1">
          {tealStops()}
        </SvgGradient>
        <SvgGradient id={`${id}hair`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#4B3A32" />
          <Stop offset="1" stopColor="#1F1612" />
        </SvgGradient>
      </Defs>
      <Circle cx="60" cy="60" r="60" fill={`url(#${id}bg)`} />
      <Ellipse cx="60" cy="108" rx="38" ry="16" fill={`url(#${id}hood)`} />
      <Path d="M28 108 C30 78 42 68 60 68 C78 68 90 78 92 108" fill={`url(#${id}hood)`} />
      <Ellipse cx="46" cy="92" rx="10" ry="16" fill="#FFFFFF" opacity="0.18" />
      <Ellipse cx="60" cy="58" rx="24" ry="26" fill={`url(#${id}skin)`} />
      <Path d="M38 52 C40 28 80 26 82 54 C74 44 46 44 38 52 Z" fill={`url(#${id}hair)`} />
      <Ellipse cx="50" cy="48" rx="8" ry="5" fill="#2A211C" />
      <Ellipse cx="50" cy="62" rx="3.2" ry="3.8" fill="#5B3A2A" />
      <Ellipse cx="68" cy="62" rx="3.2" ry="3.8" fill="#5B3A2A" />
      <Ellipse cx="49" cy="61" rx="1.1" ry="1.2" fill="#FFFFFF" opacity="0.55" />
      <Ellipse cx="67" cy="61" rx="1.1" ry="1.2" fill="#FFFFFF" opacity="0.55" />
      <Ellipse cx="60" cy="70" rx="6" ry="3" fill="#E08A6A" opacity="0.35" />
      <Ellipse cx="42" cy="88" rx="8" ry="6" fill={`url(#${id}skin)`} />
    </Svg>
  );
}

export function ProfileHeaderClouds({ width = 390, height = 160 }: { width?: number; height?: number }) {
  const id = gid(useId());
  return (
    <Svg width={width} height={height} viewBox="0 0 390 160" pointerEvents="none">
      <Defs>
        <RadialGradient id={`${id}c`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.15" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="40" cy="36" rx="42" ry="18" fill={`url(#${id}c)`} />
      <Ellipse cx="78" cy="32" rx="28" ry="16" fill={`url(#${id}c)`} />
      <Ellipse cx="310" cy="28" rx="50" ry="20" fill={`url(#${id}c)`} />
      <Ellipse cx="348" cy="36" rx="30" ry="16" fill={`url(#${id}c)`} />
      <Ellipse cx="200" cy="18" rx="36" ry="12" fill={`url(#${id}c)`} opacity="0.7" />
    </Svg>
  );
}

export function ClayGear({ size = 40 }: SizeProps) {
  const id = gid(useId());
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgGradient id={`${id}g`} x1="0.2" y1="0" x2="0.9" y2="1">
          {tealStops()}
        </SvgGradient>
      </Defs>
      <Ellipse cx="32" cy="58" rx="16" ry="4" fill="#2C98A6" opacity="0.16" />
      <Path
        d="M26 8 L38 8 L41 14 L50 17 L52 28 L47 34 L50 44 L41 50 L38 56 L26 56 L23 50 L14 47 L12 36 L17 30 L14 20 L23 14 Z"
        fill={`url(#${id}g)`}
      />
      <Circle cx="32" cy="32" r="11" fill="#E8FBFD" />
      <Circle cx="32" cy="32" r="6.5" fill={TEAL} />
      <Ellipse cx="24" cy="22" rx="6" ry="3.5" fill="#FFFFFF" opacity="0.35" />
    </Svg>
  );
}

export function ClayCoupon({ size = 40 }: SizeProps) {
  const id = gid(useId());
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgGradient id={`${id}g`} x1="0.2" y1="0" x2="0.9" y2="1">
          {tealStops()}
        </SvgGradient>
      </Defs>
      <Ellipse cx="32" cy="56" rx="16" ry="4" fill="#2C98A6" opacity="0.14" />
      <Path
        d="M10 22 C10 18 14 16 18 16 L46 16 C50 16 54 18 54 22 L54 28 C50 28 48 31 48 32 C48 33 50 36 54 36 L54 42 C54 46 50 48 46 48 L18 48 C14 48 10 46 10 42 L10 36 C14 36 16 33 16 32 C16 31 14 28 10 28 Z"
        fill={`url(#${id}g)`}
      />
      <Ellipse cx="32" cy="32" rx="1.6" ry="14" fill="#FFFFFF" opacity="0.4" />
      <Circle cx="24" cy="32" r="4" fill="#F4FEFF" />
      <Circle cx="40" cy="32" r="4" fill="#F4FEFF" />
      <Ellipse cx="22" cy="22" rx="7" ry="3.2" fill="#FFFFFF" opacity="0.32" />
    </Svg>
  );
}

export function ClayCoin({ size = 40 }: SizeProps) {
  const id = gid(useId());
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <RadialGradient id={`${id}c`} cx="35%" cy="30%" r="70%">
          <Stop offset="0" stopColor="#FFF3C4" />
          <Stop offset="0.45" stopColor="#F5C84A" />
          <Stop offset="1" stopColor="#D49214" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="32" cy="56" rx="16" ry="4" fill="#D49214" opacity="0.18" />
      <Ellipse cx="32" cy="34" rx="20" ry="20" fill={`url(#${id}c)`} />
      <Ellipse cx="32" cy="34" rx="13" ry="13" fill="#FFE9A0" />
      <Path d="M32 24 L36 32 L45 33 L38 39 L40 48 L32 43 L24 48 L26 39 L19 33 L28 32 Z" fill="#F5C84A" />
      <Ellipse cx="24" cy="26" rx="7" ry="4" fill="#FFFFFF" opacity="0.4" />
    </Svg>
  );
}

export function ClayHeart({ size = 40 }: SizeProps) {
  const id = gid(useId());
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgGradient id={`${id}h`} x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor="#FF9AA8" />
          <Stop offset="0.5" stopColor="#F43F5E" />
          <Stop offset="1" stopColor="#BE123C" />
        </SvgGradient>
      </Defs>
      <Ellipse cx="32" cy="56" rx="14" ry="4" fill="#BE123C" opacity="0.14" />
      <Path
        d="M32 50 C18 40 10 30 14 20 C17 14 26 14 32 22 C38 14 47 14 50 20 C54 30 46 40 32 50 Z"
        fill={`url(#${id}h)`}
      />
      <Ellipse cx="24" cy="24" rx="6" ry="4" fill="#FFFFFF" opacity="0.38" />
    </Svg>
  );
}

export function ClayPin({ size = 40 }: SizeProps) {
  const id = gid(useId());
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <RadialGradient id={`${id}p`} cx="34%" cy="28%" r="70%">
          <Stop offset="0" stopColor={TEAL_HI} />
          <Stop offset="0.5" stopColor={TEAL} />
          <Stop offset="1" stopColor={TEAL_LO} />
        </RadialGradient>
      </Defs>
      <Ellipse cx="32" cy="58" rx="12" ry="4" fill="#2C98A6" opacity="0.16" />
      <Path d="M32 30 L42 56 L22 56 Z" fill={TEAL_LO} />
      <Circle cx="32" cy="24" r="16" fill={`url(#${id}p)`} />
      <Circle cx="32" cy="24" r="6.5" fill="#FFFFFF" />
      <Ellipse cx="26" cy="18" rx="5" ry="3" fill="#FFFFFF" opacity="0.4" />
    </Svg>
  );
}

export function ClayWallet({ size = 44 }: SizeProps) {
  const id = gid(useId());
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgGradient id={`${id}w`} x1="0.2" y1="0" x2="0.9" y2="1">
          {tealStops()}
        </SvgGradient>
      </Defs>
      <Ellipse cx="32" cy="56" rx="16" ry="4" fill="#2C98A6" opacity="0.14" />
      <Path d="M12 22 C12 18 16 16 20 16 L48 16 C52 16 54 18 54 22 L54 46 C54 50 52 52 48 52 L20 52 C16 52 12 50 12 46 Z" fill={`url(#${id}w)`} />
      <Path d="M38 30 L54 30 L54 42 L38 42 C34 42 32 40 32 36 C32 32 34 30 38 30 Z" fill="#1A7A86" />
      <Circle cx="40" cy="36" r="4" fill="#F5C84A" />
      <Ellipse cx="24" cy="24" rx="8" ry="4" fill="#FFFFFF" opacity="0.28" />
      <Circle cx="22" cy="44" r="3.5" fill="#F5C84A" />
      <Circle cx="30" cy="46" r="3" fill="#FFE9A0" />
    </Svg>
  );
}

export function ClayBox({ size = 44 }: SizeProps) {
  const id = gid(useId());
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgGradient id={`${id}t`} x1="0.2" y1="1" x2="0.8" y2="0">
          <Stop offset="0" stopColor="#FFE9C4" />
          <Stop offset="1" stopColor="#F0C078" />
        </SvgGradient>
        <SvgGradient id={`${id}f`} x1="0" y1="0" x2="0.2" y2="1">
          <Stop offset="0" stopColor="#F6D7A8" />
          <Stop offset="1" stopColor="#D59A4A" />
        </SvgGradient>
        <SvgGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#C98A3C" />
          <Stop offset="1" stopColor="#8F5A1E" />
        </SvgGradient>
      </Defs>
      <Ellipse cx="32" cy="56" rx="16" ry="4" fill="#8F5A1E" opacity="0.16" />
      <Path d="M12 28 L32 18 L52 28 L32 38 Z" fill={`url(#${id}t)`} />
      <Path d="M12 28 L32 38 L32 54 L12 44 Z" fill={`url(#${id}s)`} />
      <Path d="M32 38 L52 28 L52 44 L32 54 Z" fill={`url(#${id}f)`} />
      <Path d="M22 26 L42 26 L42 30 L22 30 Z" fill="#FFFFFF" opacity="0.3" />
    </Svg>
  );
}

/** 立即下单：立体包裹 + 加号，表示新建寄件单。 */
export function ClayPlaceOrder({ size = 44 }: SizeProps) {
  const id = gid(useId());
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgGradient id={`${id}t`} x1="0.2" y1="1" x2="0.8" y2="0">
          <Stop offset="0" stopColor="#FFE9C4" />
          <Stop offset="1" stopColor="#F0C078" />
        </SvgGradient>
        <SvgGradient id={`${id}f`} x1="0" y1="0" x2="0.2" y2="1">
          <Stop offset="0" stopColor="#F6D7A8" />
          <Stop offset="1" stopColor="#D59A4A" />
        </SvgGradient>
        <SvgGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#C98A3C" />
          <Stop offset="1" stopColor="#8F5A1E" />
        </SvgGradient>
        <SvgGradient id={`${id}p`} x1="0.2" y1="0" x2="0.9" y2="1">
          {tealStops()}
        </SvgGradient>
      </Defs>
      <Ellipse cx="30" cy="56" rx="16" ry="4" fill="#8F5A1E" opacity="0.16" />
      <Path d="M10 30 L28 20 L46 30 L28 40 Z" fill={`url(#${id}t)`} />
      <Path d="M10 30 L28 40 L28 54 L10 44 Z" fill={`url(#${id}s)`} />
      <Path d="M28 40 L46 30 L46 44 L28 54 Z" fill={`url(#${id}f)`} />
      <Path d="M20 28 L36 28 L36 32 L20 32 Z" fill="#2C98A6" opacity="0.85" />
      <Path d="M18 26 L24 23 L24 27 L18 30 Z" fill="#FFFFFF" opacity="0.35" />
      <Circle cx="46" cy="20" r="12" fill={`url(#${id}p)`} />
      <Path d="M46 14 L46 26 M40 20 L52 20" stroke="#F4FEFF" strokeWidth="3.2" strokeLinecap="round" />
      <Ellipse cx="42" cy="16" rx="4" ry="2.4" fill="#FFFFFF" opacity="0.35" />
    </Svg>
  );
}

export function ClayScooter({ size = 44 }: SizeProps) {
  const id = gid(useId());
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgGradient id={`${id}s`} x1="0.2" y1="0" x2="0.9" y2="1">
          {tealStops()}
        </SvgGradient>
        <RadialGradient id={`${id}t`} cx="35%" cy="30%" r="70%">
          <Stop offset="0" stopColor="#64748B" />
          <Stop offset="1" stopColor="#0F172A" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="32" cy="58" rx="18" ry="4" fill="#2C98A6" opacity="0.14" />
      <Circle cx="18" cy="48" r="8" fill={`url(#${id}t)`} />
      <Circle cx="18" cy="48" r="3.5" fill="#E2E8F0" />
      <Circle cx="46" cy="48" r="7" fill={`url(#${id}t)`} />
      <Circle cx="46" cy="48" r="3" fill="#E2E8F0" />
      <Path d="M16 42 C24 36 40 36 48 42 L50 46 C40 42 24 42 14 46 Z" fill={`url(#${id}s)`} />
      <Path d="M44 28 L48 42 L44 44 L40 30 Z" fill="#D5EEF3" />
      <Ellipse cx="32" cy="30" rx="8" ry="9" fill={`url(#${id}s)`} />
      <Circle cx="32" cy="20" r="6" fill="#F2C094" />
      <Path d="M26 18 C28 12 38 12 38 18 Z" fill={`url(#${id}s)`} />
    </Svg>
  );
}

export function ClayClipboard({ size = 44 }: SizeProps) {
  const id = gid(useId());
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgGradient id={`${id}c`} x1="0.2" y1="0" x2="0.9" y2="1">
          {tealStops()}
        </SvgGradient>
      </Defs>
      <Ellipse cx="32" cy="56" rx="14" ry="4" fill="#2C98A6" opacity="0.14" />
      <Path d="M18 16 L46 16 C50 16 52 18 52 22 L52 50 C52 54 50 56 46 56 L18 56 C14 56 12 54 12 50 L12 22 C12 18 14 16 18 16 Z" fill={`url(#${id}c)`} />
      <Path d="M24 12 L40 12 C42 12 44 14 44 16 L44 20 L20 20 L20 16 C20 14 22 12 24 12 Z" fill="#F4FEFF" />
      <Path d="M20 28 L44 28 L44 32 L20 32 Z" fill="#F4FEFF" opacity="0.7" />
      <Path d="M20 36 L40 36 L40 40 L20 40 Z" fill="#F4FEFF" opacity="0.55" />
      <Path d="M20 44 L36 44 L36 48 L20 48 Z" fill="#F4FEFF" opacity="0.4" />
    </Svg>
  );
}

export function ClayHeadset({ size = 44 }: SizeProps) {
  const id = gid(useId());
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgGradient id={`${id}h`} x1="0.2" y1="0" x2="0.9" y2="1">
          {tealStops()}
        </SvgGradient>
      </Defs>
      <Ellipse cx="32" cy="56" rx="14" ry="4" fill="#2C98A6" opacity="0.14" />
      <Path d="M16 34 C16 18 48 18 48 34" fill={`url(#${id}h)`} />
      <Ellipse cx="16" cy="38" rx="8" ry="12" fill={`url(#${id}h)`} />
      <Ellipse cx="48" cy="38" rx="8" ry="12" fill={`url(#${id}h)`} />
      <Path d="M44 46 C44 52 38 56 32 56 C30 56 28 55 28 53 C28 51 30 50 32 50 C36 50 40 48 40 44 Z" fill="#1A7A86" />
      <Ellipse cx="22" cy="32" rx="5" ry="3" fill="#FFFFFF" opacity="0.35" />
    </Svg>
  );
}

export function ClayGlobe({ size = 28 }: SizeProps) {
  const id = gid(useId());
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgGradient id={`${id}g`} x1="0.2" y1="0" x2="0.9" y2="1">
          {tealStops()}
        </SvgGradient>
      </Defs>
      <Circle cx="32" cy="32" r="22" fill={`url(#${id}g)`} />
      <Ellipse cx="32" cy="32" rx="8" ry="22" fill="#FFFFFF" opacity="0.18" />
      <Ellipse cx="32" cy="32" rx="22" ry="8" fill="#FFFFFF" opacity="0.12" />
      <Ellipse cx="24" cy="22" rx="7" ry="4" fill="#FFFFFF" opacity="0.35" />
    </Svg>
  );
}

export function ClayInfo({ size = 28 }: SizeProps) {
  const id = gid(useId());
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgGradient id={`${id}i`} x1="0.2" y1="0" x2="0.9" y2="1">
          {tealStops()}
        </SvgGradient>
      </Defs>
      <Circle cx="32" cy="32" r="22" fill={`url(#${id}i)`} />
      <Circle cx="32" cy="20" r="4" fill="#F4FEFF" />
      <Path d="M28 28 L36 28 L36 48 L28 48 Z" fill="#F4FEFF" />
      <Ellipse cx="24" cy="22" rx="7" ry="4" fill="#FFFFFF" opacity="0.3" />
    </Svg>
  );
}

export function ClayBook({ size = 44 }: SizeProps) {
  const id = gid(useId());
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#7ED7E2" />
          <Stop offset="1" stopColor="#2C98A6" />
        </SvgGradient>
        <SvgGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFF7E8" />
          <Stop offset="1" stopColor="#F3D7A4" />
        </SvgGradient>
      </Defs>
      <Ellipse cx="32" cy="56" rx="16" ry="4" fill="#2C98A6" opacity="0.14" />
      <Path d="M10 16 L30 12 L30 50 L10 52 Z" fill={`url(#${id}l)`} />
      <Path d="M34 12 L54 16 L54 52 L34 50 Z" fill={`url(#${id}r)`} />
      <Path d="M30 12 L34 12 L34 50 L30 50 Z" fill="#176978" />
      <Path d="M16 22 L26 20 L26 24 L16 26 Z" fill="#FFFFFF" opacity="0.45" />
      <Path d="M38 20 L48 22 L48 26 L38 24 Z" fill="#FFFFFF" opacity="0.55" />
    </Svg>
  );
}

export function ClayStoreFront({ size = 44 }: SizeProps) {
  const id = gid(useId());
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgGradient id={`${id}r`} x1="0.2" y1="0" x2="0.8" y2="1">
          {tealStops()}
        </SvgGradient>
        <SvgGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F4FEFF" />
          <Stop offset="1" stopColor="#D5EEF3" />
        </SvgGradient>
      </Defs>
      <Ellipse cx="32" cy="56" rx="16" ry="4" fill="#2C98A6" opacity="0.14" />
      <Path d="M12 28 L32 14 L52 28 L52 50 C52 53 50 55 47 55 L17 55 C14 55 12 53 12 50 Z" fill={`url(#${id}w)`} />
      <Path d="M10 26 L32 12 L54 26 L48 30 L32 18 L16 30 Z" fill={`url(#${id}r)`} />
      <Path d="M26 38 L38 38 L38 55 L26 55 Z" fill={`url(#${id}r)`} />
      <Path d="M16 36 L24 36 L24 46 L16 46 Z" fill="#8AE8F2" opacity="0.85" />
      <Path d="M40 36 L48 36 L48 46 L40 46 Z" fill="#8AE8F2" opacity="0.85" />
    </Svg>
  );
}

export function ClayShoppingBag({ size = 44 }: SizeProps) {
  const id = gid(useId());
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgGradient id={`${id}b`} x1="0.2" y1="0" x2="0.9" y2="1">
          <Stop offset="0" stopColor="#FFD9A8" />
          <Stop offset="1" stopColor="#E08A3C" />
        </SvgGradient>
        <SvgGradient id={`${id}c`} x1="0.2" y1="0" x2="0.9" y2="1">
          {tealStops()}
        </SvgGradient>
      </Defs>
      <Ellipse cx="32" cy="56" rx="16" ry="4" fill="#E08A3C" opacity="0.16" />
      <Path d="M18 24 L46 24 L50 52 C50 55 48 56 45 56 L19 56 C16 56 14 55 14 52 Z" fill={`url(#${id}b)`} />
      <Path d="M24 24 C24 16 40 16 40 24" stroke={TEAL} strokeWidth="5" fill="transparent" />
      <Circle cx="46" cy="20" r="10" fill={`url(#${id}c)`} />
      <Circle cx="46" cy="20" r="6.5" fill="#F4FEFF" />
      <Path d="M46 16 L46 20 L49 22" stroke="#2C98A6" strokeWidth="2" fill="transparent" />
    </Svg>
  );
}

export function ClayMapBoard({ size = 44 }: SizeProps) {
  const id = gid(useId());
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgGradient id={`${id}p`} x1="0.2" y1="0" x2="0.9" y2="1">
          <Stop offset="0" stopColor="#C8F0C8" />
          <Stop offset="1" stopColor="#6FBF73" />
        </SvgGradient>
        <SvgGradient id={`${id}n`} x1="0.2" y1="0" x2="0.9" y2="1">
          {tealStops()}
        </SvgGradient>
      </Defs>
      <Ellipse cx="32" cy="56" rx="16" ry="4" fill="#2C98A6" opacity="0.14" />
      <Path d="M10 16 L54 16 C56 16 58 18 58 20 L58 44 C58 46 56 48 54 48 L10 48 C8 48 6 46 6 44 L6 20 C6 18 8 16 10 16 Z" fill={`url(#${id}p)`} />
      <Path d="M14 28 C22 22 30 34 40 24 C48 18 52 30 54 28" stroke="#FFFFFF" strokeWidth="3" fill="transparent" />
      <Path d="M32 22 C38 22 42 28 32 40 C22 28 26 22 32 22 Z" fill={`url(#${id}n)`} />
      <Circle cx="32" cy="28" r="4" fill="#F4FEFF" />
    </Svg>
  );
}

export function ClayPagodas({ width = 160, height = 90 }: { width?: number; height?: number }) {
  const id = gid(useId());
  return (
    <Svg width={width} height={height} viewBox="0 0 160 90" pointerEvents="none">
      <Defs>
        <SvgGradient id={`${id}s`} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#D7F1F5" />
          <Stop offset="1" stopColor="#F4FEFF" />
        </SvgGradient>
      </Defs>
      <Path d="M18 78 L40 78 L36 52 L22 52 Z" fill={`url(#${id}s)`} opacity="0.7" />
      <Path d="M16 52 L42 52 L29 36 Z" fill={`url(#${id}s)`} opacity="0.8" />
      <Path d="M22 36 L36 36 L29 24 Z" fill={`url(#${id}s)`} />
      <Path d="M70 80 L108 80 L100 40 L78 40 Z" fill={`url(#${id}s)`} opacity="0.65" />
      <Path d="M72 40 L106 40 L89 18 Z" fill={`url(#${id}s)`} opacity="0.8" />
      <Path d="M80 18 L98 18 L89 6 Z" fill={`url(#${id}s)`} />
      <Path d="M118 78 L148 78 L142 50 L124 50 Z" fill={`url(#${id}s)`} opacity="0.7" />
      <Path d="M120 50 L146 50 L133 34 Z" fill={`url(#${id}s)`} />
    </Svg>
  );
}
