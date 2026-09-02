import React from 'react';
import type { MerchantRiderApproachHit } from '../../services/_shared/merchantRiderApproach';
import { merchantRiderApproachCopy } from '../../services/_shared/merchantRiderApproach';
import './MerchantRiderApproachModal.css';

export function MerchantRiderApproachBanner({
  hit,
  language,
  onOpen,
}: {
  hit: MerchantRiderApproachHit;
  language: 'zh' | 'en' | 'my';
  onOpen: () => void;
}) {
  const copy = merchantRiderApproachCopy(hit, language);
  return (
    <div
      className={`rider-approach-banner${hit.band === 'near' ? ' rider-approach-banner--near' : ''}`}
      role="status"
    >
      <div>
        <strong>
          {copy.badge} · {copy.title}
        </strong>
        <span>
          {copy.subtitle} · {copy.metersLabel}
        </span>
      </div>
      <button type="button" onClick={onOpen}>
        {language === 'zh' ? '查看' : language === 'en' ? 'Open' : 'ကြည့်ရန်'}
      </button>
    </div>
  );
}

export default function MerchantRiderApproachModal({
  visible,
  hit,
  language,
  onClose,
}: {
  visible: boolean;
  hit: MerchantRiderApproachHit | null;
  language: 'zh' | 'en' | 'my';
  onClose: () => void;
}) {
  if (!visible || !hit) return null;
  const copy = merchantRiderApproachCopy(hit, language);
  const hint =
    language === 'zh'
      ? '对齐骑手端 120 米提示：系统不会自动改状态，请当面交接后再在订单里操作。'
      : language === 'en'
        ? 'Same 120 m cue as the rider map. Status does not change automatically — hand over in person first.'
        : 'စီးနင်းသူမြေပုံ 120 m အချက်ပေးချက်နှင့် တူညီသည်။ အခြေအနေ အလိုအလျောက် မပြောင်းပါ။';

  return (
    <div
      className="rider-approach-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rider-approach-title"
      onClick={onClose}
    >
      <div
        className={`rider-approach-panel${hit.band === 'near' ? ' rider-approach-panel--near' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rider-approach-head">
          <span className="rider-approach-badge">🛵 {copy.badge}</span>
          <h2 id="rider-approach-title" className="rider-approach-title">
            {copy.title}
          </h2>
          <p className="rider-approach-sub">{copy.subtitle}</p>
          <p className="rider-approach-meters">{copy.metersLabel}</p>
        </div>
        <div className="rider-approach-body">
          <p className="rider-approach-hint">{hint}</p>
          <button type="button" className="rider-approach-btn" onClick={onClose}>
            {language === 'zh' ? '知道了' : language === 'en' ? 'Got it' : 'ရပါပြီ'}
          </button>
        </div>
      </div>
    </div>
  );
}
