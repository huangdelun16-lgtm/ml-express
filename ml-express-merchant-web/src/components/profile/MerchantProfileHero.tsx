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
      <div className="merchant-profile-brand-panel__lead">
        <Logo size="compact" clickable={false} />
      </div>
      <div className="merchant-profile-brand-panel__meta">
        <p className="merchant-profile-header__page">
          {language === 'zh' ? '我的账号' : language === 'my' ? 'ကျွန်ုပ်၏အကောင့်' : 'My account'}
        </p>
        {isPartnerStore && pendingConfirmation > 0 ? (
          <span className="merchant-profile-hero__chip">
            {language === 'zh'
              ? `待接单 ${pendingConfirmation}`
              : `${pendingConfirmation} pending`}
          </span>
        ) : null}
      </div>
    </section>
  </div>
);

export default MerchantProfileHero;
