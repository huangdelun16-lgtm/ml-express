import React from 'react';
import '../../styles/deliveryAmbient.css';

export type DeliveryAmbientVariant = 'default' | 'mall' | 'cart' | 'landing';

type Props = {
  variant?: DeliveryAmbientVariant;
  /** 嵌在首页 landing 区块内：不重复铺底色，动效略淡 */
  embedded?: boolean;
};

const FLOAT_ICONS: Record<DeliveryAmbientVariant, [string, string, string, string]> = {
  default: ['📦', '🛵', '📍', '🚚'],
  mall: ['🏬', '🛒', '🍜', '✨'],
  cart: ['🛒', '📦', '💳', '✨'],
  landing: ['📦', '🛵', '📍', '🚚'],
};

/**
 * 客户端 Web 统一配送氛围背景：路网、移动载具、站点脉冲与浮动物流符号。
 */
const DeliveryAmbientBackground: React.FC<Props> = ({
  variant = 'default',
  embedded = false,
}) => {
  const [fa, fb, fc, fd] = FLOAT_ICONS[variant];
  const mod = embedded ? ' delivery-ambient--embedded' : '';
  const variantMod = variant !== 'default' ? ` delivery-ambient--${variant}` : '';

  return (
    <div className={`delivery-ambient${mod}${variantMod}`} aria-hidden>
      <div className="delivery-ambient__noise" />
      <div className="delivery-ambient__grid" />

      <svg className="delivery-ambient__routes" viewBox="0 0 1000 700" preserveAspectRatio="none">
        <path
          id="delivery-route-a"
          className="delivery-ambient__route delivery-ambient__route--a"
          d="M -40 520 Q 180 420, 360 460 T 720 320 T 1040 180"
        />
        <path
          id="delivery-route-b"
          className="delivery-ambient__route delivery-ambient__route--b"
          d="M -30 120 Q 220 280, 420 240 T 820 380 T 1040 520"
        />
        <path
          className="delivery-ambient__route delivery-ambient__route--c"
          d="M 120 680 L 880 680"
        />
        <circle className="delivery-ambient__hub" cx="500" cy="350" r="6" />
      </svg>

      <div className="delivery-ambient__radar delivery-ambient__radar--1" />
      <div className="delivery-ambient__radar delivery-ambient__radar--2" />
      <div className="delivery-ambient__radar delivery-ambient__radar--3" />

      <div className="delivery-ambient__aurora" />

      <div className="delivery-ambient__orb delivery-ambient__orb--1" />
      <div className="delivery-ambient__orb delivery-ambient__orb--2" />
      <div className="delivery-ambient__orb delivery-ambient__orb--3" />

      <span className="delivery-ambient__traveler delivery-ambient__traveler--scooter" role="presentation">
        🛵
      </span>
      <span className="delivery-ambient__traveler delivery-ambient__traveler--package" role="presentation">
        📦
      </span>
      <span className="delivery-ambient__traveler delivery-ambient__traveler--truck" role="presentation">
        🚚
      </span>

      <div className="delivery-ambient__road">
        <div className="delivery-ambient__road-line" />
      </div>

      <div className="delivery-ambient__float-icons">
        <span className="delivery-ambient__fi delivery-ambient__fi--a">{fa}</span>
        <span className="delivery-ambient__fi delivery-ambient__fi--b">{fb}</span>
        <span className="delivery-ambient__fi delivery-ambient__fi--c">{fc}</span>
        <span className="delivery-ambient__fi delivery-ambient__fi--d">{fd}</span>
      </div>

      <div className="delivery-ambient__pins">
        <span className="delivery-ambient__pin delivery-ambient__pin--1">📍</span>
        <span className="delivery-ambient__pin delivery-ambient__pin--2">📍</span>
        <span className="delivery-ambient__pin delivery-ambient__pin--3">📍</span>
      </div>
    </div>
  );
};

export default DeliveryAmbientBackground;
