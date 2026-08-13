import React from 'react';
import ParticleBackground from './ParticleBackground';

export type DeliveryAmbientVariant = 'default' | 'mall' | 'cart' | 'landing';

type Props = {
  variant?: DeliveryAmbientVariant;
  /** 嵌在首页 landing 区块内：粒子更少、更淡 */
  embedded?: boolean;
};

const COUNT: Record<DeliveryAmbientVariant, number> = {
  landing: 110,
  default: 90,
  mall: 88,
  cart: 80,
};

/**
 * 客户端 Web 动态背景入口：科技感粒子连线（Express × Link）。
 * 实现见 ParticleBackground.tsx。
 */
const DeliveryAmbientBackground: React.FC<Props> = ({
  variant = 'default',
  embedded = false,
}) => (
  <div
    aria-hidden
    style={{
      position: 'absolute',
      inset: 0,
      zIndex: 0,
      pointerEvents: 'none',
      overflow: 'hidden',
    }}
  >
    <ParticleBackground
      particleCount={embedded ? 56 : COUNT[variant]}
      maxDistance={embedded ? 100 : variant === 'landing' ? 128 : 120}
      speed={embedded ? 0.32 : 0.45}
      background="transparent"
    />
  </div>
);

export default DeliveryAmbientBackground;
