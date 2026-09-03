import React, { useEffect, useId, useRef } from 'react';
import packingApparel from '../../assets/packing/apparel.jpg';
import packingApparel01 from '../../assets/packing/apparel-01.jpg';
import packingApparel02 from '../../assets/packing/apparel-02.jpg';
import packingApparel03 from '../../assets/packing/apparel-03.jpg';
import packingApparel04 from '../../assets/packing/apparel-04.jpg';
import packingBakery from '../../assets/packing/bakery.jpg';
import packingBakery01 from '../../assets/packing/bakery-01.jpg';
import packingBakery02 from '../../assets/packing/bakery-02.jpg';
import packingBakery03 from '../../assets/packing/bakery-03.jpg';
import packingBakery04 from '../../assets/packing/bakery-04.jpg';
import packingDrinks from '../../assets/packing/drinks.jpg';
import packingDrinks01 from '../../assets/packing/drinks-01.jpg';
import packingDrinks02 from '../../assets/packing/drinks-02.jpg';
import packingDrinks03 from '../../assets/packing/drinks-03.jpg';
import packingDrinks04 from '../../assets/packing/drinks-04.jpg';
import packingFlower from '../../assets/packing/flower.jpg';
import packingFlower01 from '../../assets/packing/flower-01.jpg';
import packingFlower02 from '../../assets/packing/flower-02.jpg';
import packingFlower03 from '../../assets/packing/flower-03.jpg';
import packingFlower04 from '../../assets/packing/flower-04.jpg';
import packingFood01 from '../../assets/packing/food-01.jpg';
import packingFood02 from '../../assets/packing/food-02.jpg';
import packingFood03 from '../../assets/packing/food-03.jpg';
import packingFood04 from '../../assets/packing/food-04.jpg';
import packingGrocery from '../../assets/packing/grocery.jpg';
import packingGrocery01 from '../../assets/packing/grocery-01.jpg';
import packingGrocery02 from '../../assets/packing/grocery-02.jpg';
import packingGrocery03 from '../../assets/packing/grocery-03.jpg';
import packingGrocery04 from '../../assets/packing/grocery-04.jpg';
import packingParcel from '../../assets/packing/parcel.jpg';
import type { PackingLang, PackingProfile, PackingProfileId } from '../../utils/platformPackingGuide';

type PackingGuideModalProps = {
  open: boolean;
  profile: PackingProfile;
  storeTypeLabel: string;
  lang: PackingLang;
  copy: {
    kicker: string;
    forType: string;
    confirm: string;
    close: string;
    confirmHint: string;
  };
  onClose: () => void;
  onConfirm: () => void;
};

const SPEC_PHOTOS: Partial<Record<PackingProfileId, string[]>> = {
  food_safety: [packingFood01, packingFood02, packingFood03, packingFood04],
  drinks_seal: [packingDrinks01, packingDrinks02, packingDrinks03, packingDrinks04],
  bakery_box: [packingBakery01, packingBakery02, packingBakery03, packingBakery04],
  flower_wrap: [packingFlower01, packingFlower02, packingFlower03, packingFlower04],
  apparel_bag: [packingApparel01, packingApparel02, packingApparel03, packingApparel04],
  grocery_sort: [packingGrocery01, packingGrocery02, packingGrocery03, packingGrocery04],
};

const FALLBACK_PHOTO: Record<PackingProfileId, string> = {
  food_safety: packingFood01,
  drinks_seal: packingDrinks,
  bakery_box: packingBakery,
  flower_wrap: packingFlower,
  apparel_bag: packingApparel,
  grocery_sort: packingGrocery,
  parcel_standard: packingParcel,
};

const PackingSpecVisual: React.FC<{ profile: PackingProfile; lang: PackingLang; photos: string[] }> = ({
  profile,
  lang,
  photos,
}) => {
  const panels = profile.visualPanels || [];
  return (
    <div className="pack-spec">
      <div className="pack-spec__head">
        <p className="pack-spec__brand">MARKET LINK EXPRESS · {profile.title[lang]}</p>
        {profile.visualRider ? <p className="pack-spec__rider">{profile.visualRider[lang]}</p> : null}
      </div>
      <div className="pack-spec__grid">
        {panels.map((panel, index) => (
          <article key={panel.title.zh} className="pack-spec__card">
            <div className="pack-spec__media">
              <span className="pack-spec__num">{String(index + 1).padStart(2, '0')}</span>
              <img className="pack-spec__photo" src={photos[index]} alt={panel.title[lang]} />
            </div>
            <div className="pack-spec__cap">
              <h3>{panel.title[lang]}</h3>
              <p>{panel.caption[lang]}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

const PackingStyleVisual: React.FC<{ profile: PackingProfile; lang: PackingLang }> = ({ profile, lang }) => {
  const photos = SPEC_PHOTOS[profile.id];
  if (photos && profile.visualPanels?.length === 4) {
    return <PackingSpecVisual profile={profile} lang={lang} photos={photos} />;
  }

  return (
    <div className="pack-visual" aria-hidden="true">
      <div className="pack-visual__board">
        <div className="pack-visual__frame">
          <img className="pack-visual__photo" src={FALLBACK_PHOTO[profile.id]} alt="" />
        </div>
      </div>
    </div>
  );
};

const PackingGuideModal: React.FC<PackingGuideModalProps> = ({
  open,
  profile,
  storeTypeLabel,
  lang,
  copy,
  onClose,
  onConfirm,
}) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => dialogRef.current?.focus(), 40);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="pack-guide-overlay" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="pack-guide-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="pack-guide-modal__close" onClick={onClose} aria-label={copy.close}>
          ×
        </button>
        <div className="pack-guide-modal__body">
          <p className="pack-guide-modal__kicker">{copy.kicker}</p>
          <h2 id={titleId} className="pack-guide-modal__title">
            {profile.title[lang]}
          </h2>
          <p className="pack-guide-modal__for">
            {copy.forType} · {storeTypeLabel}
          </p>
          <PackingStyleVisual profile={profile} lang={lang} />
          {profile.visualRider ? null : <p className="pack-guide-modal__lead">{profile.lead[lang]}</p>}
          <ol className="pack-guide-steps">
            {profile.steps.map((step) => (
              <li key={step.zh}>{step[lang]}</li>
            ))}
          </ol>
          <p className="pack-guide-caution">{profile.caution[lang]}</p>
        </div>
        <div className="pack-guide-modal__foot">
          <p className="pack-guide-modal__hint">{copy.confirmHint}</p>
          <button type="button" className="pack-guide-modal__confirm" onClick={onConfirm}>
            {copy.confirm}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PackingGuideModal;
