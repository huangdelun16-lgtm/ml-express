import React from 'react';
import Logo from '../Logo';
import type { MerchantLanguage } from '../../constants/merchantOrderStatus';

export interface MerchantProfileHeroProps {
  title: string;
  subtitle: string;
  pendingConfirmation: number;
  isPartnerStore: boolean;
  visible: boolean;
  language: MerchantLanguage;
}

const MerchantProfileHero: React.FC<MerchantProfileHeroProps> = ({
  title,
  subtitle,
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
    </section>

    <div className="merchant-profile-header__divider" role="presentation" />

    <header className="merchant-profile-hero">
      <div className="merchant-profile-hero__titles">
        <div className="merchant-profile-hero__title-row">
          <h1 className="merchant-profile-hero__title">{title}</h1>
          {isPartnerStore && pendingConfirmation > 0 ? (
            <span className="merchant-profile-hero__chip merchant-profile-hero__chip--alert">
              🔔{' '}
              {language === 'zh'
                ? `待接单 ${pendingConfirmation}`
                : `${pendingConfirmation} pending`}
            </span>
          ) : null}
        </div>
        <p className="merchant-profile-hero__subtitle">{subtitle}</p>
      </div>
    </header>
  </div>
);

export default MerchantProfileHero;
