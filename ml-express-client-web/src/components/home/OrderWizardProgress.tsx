import React from 'react';
import './OrderWizardProgress.css';

export type OrderWizardStepIndex = 0 | 1 | 2 | 3;

const STEP_COUNT = 4;

type Props = {
  currentStep: OrderWizardStepIndex;
  labels: string[];
};

export default function OrderWizardProgress({ currentStep, labels }: Props) {
  return (
    <div className="order-wizard-progress" role="tablist" aria-label="Order steps">
      {labels.map((label, index) => {
        const done = index < currentStep;
        const active = index === currentStep;
        return (
          <div key={label} className="order-wizard-progress__item">
            <div className="order-wizard-progress__top">
              <div
                className={[
                  'order-wizard-progress__dot',
                  done ? 'order-wizard-progress__dot--done' : '',
                  active ? 'order-wizard-progress__dot--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {done ? '✓' : index + 1}
              </div>
              {index < STEP_COUNT - 1 && (
                <div
                  className={[
                    'order-wizard-progress__line',
                    index < currentStep ? 'order-wizard-progress__line--done' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />
              )}
            </div>
            <span
              className={[
                'order-wizard-progress__label',
                active ? 'order-wizard-progress__label--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
