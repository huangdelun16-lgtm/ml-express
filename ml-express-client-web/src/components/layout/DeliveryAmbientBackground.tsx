import React from 'react';
import '../../styles/clientInterior.css';

export type DeliveryAmbientVariant = 'default' | 'mall' | 'cart' | 'landing';

type Props = {
  variant?: DeliveryAmbientVariant;
  /** 嵌在首页 landing 区块内：不重复叠骑手 */
  embedded?: boolean;
};

/**
 * 静态骑手氛围层，叠在内容下方，不挡点击。
 */
const DeliveryAmbientBackground: React.FC<Props> = ({
  variant = 'default',
  embedded = false,
}) => {
  const mods = [
    `client-rider-ambient--${variant}`,
    embedded ? 'client-rider-ambient--embedded' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`client-rider-ambient ${mods}`} aria-hidden>
      <img
        className="client-rider-ambient__img"
        src="/brand-rider-3d.png"
        alt=""
        width={748}
        height={900}
        decoding="async"
      />
    </div>
  );
};

export default DeliveryAmbientBackground;
