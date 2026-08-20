import React from 'react';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient as SvgGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

type Props = {
  width?: number;
  height?: number;
};

/** Track-page courier: clay 3D cartoon, no black outlines, soft volume lighting. */
export default function TrackRider3D({ width = 228, height = 206 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 360 320">
      <Defs>
        <RadialGradient id="trkShadow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#1A6F7A" stopOpacity="0.28" />
          <Stop offset="1" stopColor="#1A6F7A" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="trkTire" cx="32%" cy="28%" r="72%">
          <Stop offset="0" stopColor="#64748B" />
          <Stop offset="0.42" stopColor="#334155" />
          <Stop offset="1" stopColor="#0F172A" />
        </RadialGradient>
        <RadialGradient id="trkRim" cx="36%" cy="30%" r="64%">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.38" stopColor="#E2E8F0" />
          <Stop offset="1" stopColor="#64748B" />
        </RadialGradient>
        <RadialGradient id="trkHub" cx="40%" cy="34%" r="58%">
          <Stop offset="0" stopColor="#F8FAFC" />
          <Stop offset="1" stopColor="#94A3B8" />
        </RadialGradient>
        <SvgGradient id="trkDeckTop" x1="0" y1="0" x2="0.15" y2="1">
          <Stop offset="0" stopColor="#9AEAF3" />
          <Stop offset="0.45" stopColor="#3FC4D4" />
          <Stop offset="1" stopColor="#2C98A6" />
        </SvgGradient>
        <SvgGradient id="trkDeckSide" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2C98A6" />
          <Stop offset="1" stopColor="#145F6A" />
        </SvgGradient>
        <SvgGradient id="trkFork" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#F4FCFE" />
          <Stop offset="0.55" stopColor="#C5E8EE" />
          <Stop offset="1" stopColor="#7ECAD6" />
        </SvgGradient>
        <SvgGradient id="trkBoxFront" x1="0" y1="0" x2="0.2" y2="1">
          <Stop offset="0" stopColor="#F6D7A8" />
          <Stop offset="1" stopColor="#D59A4A" />
        </SvgGradient>
        <SvgGradient id="trkBoxTop" x1="0.2" y1="1" x2="0.8" y2="0">
          <Stop offset="0" stopColor="#FFE9C4" />
          <Stop offset="1" stopColor="#F0C078" />
        </SvgGradient>
        <SvgGradient id="trkBoxSide" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#C98A3C" />
          <Stop offset="1" stopColor="#8F5A1E" />
        </SvgGradient>
        <SvgGradient id="trkSuit" x1="0.15" y1="0" x2="0.9" y2="1">
          <Stop offset="0" stopColor="#8AE8F2" />
          <Stop offset="0.42" stopColor="#2C98A6" />
          <Stop offset="1" stopColor="#176978" />
        </SvgGradient>
        <SvgGradient id="trkPants" x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor="#5B6B82" />
          <Stop offset="1" stopColor="#1E293B" />
        </SvgGradient>
        <RadialGradient id="trkSkin" cx="36%" cy="26%" r="72%">
          <Stop offset="0" stopColor="#FFE7CF" />
          <Stop offset="0.5" stopColor="#F2C094" />
          <Stop offset="1" stopColor="#D08A58" />
        </RadialGradient>
        <RadialGradient id="trkHelmet" cx="32%" cy="22%" r="74%">
          <Stop offset="0" stopColor="#B6F4FB" />
          <Stop offset="0.38" stopColor="#3FC4D4" />
          <Stop offset="1" stopColor="#1A7A86" />
        </RadialGradient>
        <SvgGradient id="trkVisor" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F4FEFF" stopOpacity="0.92" />
          <Stop offset="1" stopColor="#6EC4D0" stopOpacity="0.42" />
        </SvgGradient>
        <RadialGradient id="trkPinBall" cx="34%" cy="28%" r="70%">
          <Stop offset="0" stopColor="#FF8A7A" />
          <Stop offset="0.45" stopColor="#EF4444" />
          <Stop offset="1" stopColor="#B91C1C" />
        </RadialGradient>
        <SvgGradient id="trkPinTip" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#EF4444" />
          <Stop offset="1" stopColor="#991B1B" />
        </SvgGradient>
      </Defs>

      <Ellipse cx="176" cy="292" rx="108" ry="16" fill="url(#trkShadow)" />

      {/* rear wheel */}
      <Ellipse cx="92" cy="236" rx="40" ry="40" fill="url(#trkTire)" />
      <Ellipse cx="92" cy="236" rx="24" ry="24" fill="url(#trkRim)" />
      <Ellipse cx="92" cy="236" rx="10" ry="10" fill="url(#trkHub)" />
      <Ellipse cx="80" cy="224" rx="9" ry="5.5" fill="#FFFFFF" opacity="0.32" />

      {/* front wheel */}
      <Ellipse cx="258" cy="238" rx="35" ry="35" fill="url(#trkTire)" />
      <Ellipse cx="258" cy="238" rx="21" ry="21" fill="url(#trkRim)" />
      <Ellipse cx="258" cy="238" rx="9" ry="9" fill="url(#trkHub)" />
      <Ellipse cx="247" cy="227" rx="8" ry="4.8" fill="#FFFFFF" opacity="0.32" />

      {/* deck thickness then top */}
      <Path
        d="M84 214 C122 198 198 196 238 212 L248 230 C196 218 124 220 78 232 Z"
        fill="url(#trkDeckSide)"
      />
      <Path
        d="M82 198 C124 180 200 178 242 196 L238 214 C196 198 122 200 84 214 Z"
        fill="url(#trkDeckTop)"
      />
      <Ellipse cx="164" cy="196" rx="58" ry="8" fill="#FFFFFF" opacity="0.22" />

      {/* fork + bar */}
      <Path
        d="M244 146 C250 146 256 148 256 156 L254 204 C254 210 248 214 242 214 C236 214 232 210 232 204 L234 156 C234 148 238 146 244 146 Z"
        fill="url(#trkFork)"
      />
      <Ellipse cx="244" cy="146" rx="12" ry="8" fill="#F7FCFE" />
      <Path
        d="M226 138 C242 124 268 124 284 140 L278 150 C266 140 246 140 232 148 Z"
        fill="#D5EEF3"
      />
      <Ellipse cx="270" cy="136" rx="10" ry="6" fill="#FFFFFF" opacity="0.5" />

      {/* stacked cargo cubes */}
      <Path d="M46 172 L92 156 L138 172 L92 190 Z" fill="url(#trkBoxTop)" />
      <Path d="M46 172 L92 190 L92 226 L46 206 Z" fill="url(#trkBoxSide)" />
      <Path d="M92 190 L138 172 L138 208 L92 226 Z" fill="url(#trkBoxFront)" />
      <Path d="M66 180 L118 180 L118 188 L66 188 Z" fill="#FFFFFF" opacity="0.28" />

      <Path d="M56 144 L92 130 L128 144 L92 160 Z" fill="url(#trkBoxTop)" />
      <Path d="M56 144 L92 160 L92 186 L56 168 Z" fill="url(#trkBoxSide)" />
      <Path d="M92 160 L128 144 L128 170 L92 186 Z" fill="url(#trkBoxFront)" />
      <Path d="M72 150 L112 150 L112 157 L72 157 Z" fill="#FFFFFF" opacity="0.34" />

      {/* legs + shoes */}
      <Path
        d="M148 198 C142 222 140 244 152 260 L170 258 C166 236 168 216 172 198 Z"
        fill="url(#trkPants)"
      />
      <Path
        d="M172 198 C178 220 192 242 206 256 L222 248 C204 230 190 212 184 198 Z"
        fill="url(#trkPants)"
      />
      <Ellipse cx="158" cy="262" rx="18" ry="9" fill="#243140" />
      <Ellipse cx="210" cy="256" rx="16" ry="8" fill="#1B2633" />
      <Ellipse cx="152" cy="258" rx="8" ry="3" fill="#FFFFFF" opacity="0.18" />
      <Ellipse cx="204" cy="252" rx="7" ry="2.6" fill="#FFFFFF" opacity="0.16" />

      {/* torso */}
      <Path
        d="M140 132 C124 152 122 184 144 202 C164 212 192 204 202 182 C212 158 200 128 178 118 Z"
        fill="url(#trkSuit)"
      />
      <Ellipse cx="156" cy="154" rx="20" ry="28" fill="#FFFFFF" opacity="0.18" />

      {/* rear arm + parcel in hand */}
      <Path
        d="M144 148 C126 164 114 184 124 198"
        stroke="url(#trkSuit)"
        strokeWidth="18"
        strokeLinecap="round"
        fill="none"
      />
      <Path d="M22 154 L52 142 L78 154 L48 168 Z" fill="url(#trkBoxTop)" />
      <Path d="M22 154 L48 168 L48 192 L22 176 Z" fill="url(#trkBoxSide)" />
      <Path d="M48 168 L78 154 L78 178 L48 192 Z" fill="url(#trkBoxFront)" />
      <Ellipse cx="124" cy="198" rx="11" ry="10" fill="url(#trkSkin)" />
      <Ellipse cx="120" cy="194" rx="3.4" ry="2" fill="#FFFFFF" opacity="0.3" />

      {/* waving arm */}
      <Path
        d="M188 144 C216 132 236 112 228 92"
        stroke="url(#trkSuit)"
        strokeWidth="20"
        strokeLinecap="round"
        fill="none"
      />
      <Ellipse cx="228" cy="88" rx="13" ry="12" fill="url(#trkSkin)" />
      <Ellipse cx="223" cy="84" rx="4.5" ry="2.6" fill="#FFFFFF" opacity="0.38" />

      {/* neck + head */}
      <Ellipse cx="170" cy="128" rx="12" ry="10" fill="url(#trkSkin)" />
      <Ellipse cx="168" cy="108" rx="30" ry="28" fill="url(#trkSkin)" />
      <Ellipse cx="156" cy="98" rx="10" ry="8" fill="#FFFFFF" opacity="0.3" />

      {/* helmet */}
      <Path
        d="M138 108 C140 74 198 70 202 108 C190 98 154 96 138 108 Z"
        fill="url(#trkHelmet)"
      />
      <Ellipse cx="172" cy="86" rx="26" ry="12" fill="url(#trkHelmet)" />
      <Ellipse cx="158" cy="80" rx="12" ry="6" fill="#FFFFFF" opacity="0.42" />
      <Path
        d="M142 110 C154 118 186 118 200 108 C192 124 152 126 142 110 Z"
        fill="url(#trkVisor)"
      />
      <Ellipse cx="198" cy="100" rx="10" ry="10" fill="#1A7A86" />
      <Ellipse cx="196" cy="96" rx="3.6" ry="2.4" fill="#FFFFFF" opacity="0.42" />

      {/* face — filled shapes only */}
      <Ellipse cx="156" cy="112" rx="3.6" ry="4.2" fill="#5B3A2A" opacity="0.82" />
      <Ellipse cx="176" cy="111" rx="3.6" ry="4.2" fill="#5B3A2A" opacity="0.82" />
      <Ellipse cx="155" cy="110" rx="1.3" ry="1.4" fill="#FFFFFF" opacity="0.6" />
      <Ellipse cx="175" cy="109" rx="1.3" ry="1.4" fill="#FFFFFF" opacity="0.6" />
      <Ellipse cx="166" cy="120" rx="8" ry="4" fill="#E08A6A" opacity="0.32" />
      <Ellipse cx="166" cy="124" rx="5" ry="2.2" fill="#C47B5A" opacity="0.28" />

      {/* 3D map pin */}
      <Path d="M292 86 L308 128 L276 128 Z" fill="url(#trkPinTip)" />
      <Ellipse cx="292" cy="78" rx="28" ry="28" fill="url(#trkPinBall)" />
      <Ellipse cx="284" cy="70" rx="10" ry="7" fill="#FFFFFF" opacity="0.28" />
      <Ellipse cx="292" cy="78" rx="14" ry="14" fill="#FFFFFF" />
      <Path d="M284 82 L292 74 L300 82 L298 86 L294 84 L294 88 L290 88 L290 84 L286 86 Z" fill="#FBBF24" />
      <Ellipse cx="288" cy="84" rx="3.2" ry="3.2" fill="#F59E0B" />
      <Ellipse cx="296" cy="84" rx="3.2" ry="3.2" fill="#F59E0B" />
    </Svg>
  );
}
