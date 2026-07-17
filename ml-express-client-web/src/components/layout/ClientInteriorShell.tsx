import React from 'react';
import DeliveryAmbientBackground from './DeliveryAmbientBackground';
import '../../styles/clientInterior.css';

export type ClientInteriorAmbient = 'default' | 'mall' | 'cart';

type Props = {
  children: React.ReactNode;
  /** 背景动效一致，浮动符号随场景微调（商场 / 购物车）。 */
  ambient?: ClientInteriorAmbient;
  /** 嵌在首页 landing 内：透明底，仅叠加轻量动效 */
  embedded?: boolean;
};

/**
 * 客户端内页统一外壳：配送主题动态背景 + 内容区。
 */
const ClientInteriorShell: React.FC<Props> = ({
  children,
  ambient = 'default',
  embedded = false,
}) => {
  const mod = [
    ambient !== 'default' ? `client-interior--${ambient}` : '',
    embedded ? 'client-interior--embedded' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`client-interior${mod ? ` ${mod}` : ''}`}>
      <DeliveryAmbientBackground variant={ambient} embedded={embedded} />
      <div className="client-interior__content">{children}</div>
    </div>
  );
};

export default ClientInteriorShell;
