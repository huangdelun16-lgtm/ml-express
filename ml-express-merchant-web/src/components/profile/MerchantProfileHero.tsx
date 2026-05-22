import React from 'react';
import Logo from '../Logo';
import type { MerchantLanguage } from '../../constants/merchantOrderStatus';

export interface MerchantProfileHeroProps {
  pendingConfirmation: number;
  isPartnerStore: boolean;
  visible: boolean;
  language: MerchantLanguage;
}

const MerchantProfileHero: React.FC<MerchantProfileHeroProps> = ({
  pendingConfirmation,
  isPartnerStore,
  visible,
  language,
}) => (
  <div
    className={`merchant-profile-header${visible ? ' merchant-profile-header--visible' : ''}`}
  >
    <section className="merchant-profile-brand-panel" aria-label="Company">
      <Logo size="compact" clickable={false} />
      {isPartnerStore && pendingConfirmation > 0 ? (
        <span className="merchant-profile-hero__chip merchant-profile-hero__chip--alert">
          🔔{' '}
          {language === 'zh'
            ? `待接单 ${pendingConfirmation}`
            : `${pendingConfirmation} pending`}
        </span>
      ) : null}
    </section>
  </div>
);

export default MerchantProfileHero;
