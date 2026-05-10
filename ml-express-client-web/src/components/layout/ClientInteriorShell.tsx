import React from 'react';
import '../../styles/clientInterior.css';

export type ClientInteriorAmbient = 'default' | 'mall' | 'cart';

type Props = {
  children: React.ReactNode;
  /** 背景动效一致，浮动符号随场景微调（商场 / 购物车）。 */
  ambient?: ClientInteriorAmbient;
};

const FLOAT_BY_AMBIENT: Record<ClientInteriorAmbient, [string, string, string, string]> = {
  default: ['📦', '🛵', '📍', '✨'],
  mall: ['🏬', '🛒', '🍜', '✨'],
  cart: ['🛒', '📦', '💳', '✨'],
};

/**
 * 客户端内页统一外壳：深色渐变底、网格、极光、浮动的物流意象符号。
 */
const ClientInteriorShell: React.FC<Props> = ({ children, ambient = 'default' }) => {
  const [fa, fb, fc, fd] = FLOAT_BY_AMBIENT[ambient];
  const mod = ambient === 'default' ? '' : ` client-interior--${ambient}`;

  return (
    <div className={`client-interior${mod}`}>
      <div className="client-interior__ambient" aria-hidden />
      <div className="client-interior__grid" aria-hidden />
      <div className="client-interior__aurora" aria-hidden />
      <div className="client-interior__orb client-interior__orb--1" aria-hidden />
      <div className="client-interior__orb client-interior__orb--2" aria-hidden />
      <div className="client-interior__orb client-interior__orb--3" aria-hidden />
      <div className="client-interior__float-icons" aria-hidden>
        <span className="client-interior__fi client-interior__fi--a">{fa}</span>
        <span className="client-interior__fi client-interior__fi--b">{fb}</span>
        <span className="client-interior__fi client-interior__fi--c">{fc}</span>
        <span className="client-interior__fi client-interior__fi--d">{fd}</span>
      </div>
      <div className="client-interior__content">{children}</div>
    </div>
  );
};

export default ClientInteriorShell;
