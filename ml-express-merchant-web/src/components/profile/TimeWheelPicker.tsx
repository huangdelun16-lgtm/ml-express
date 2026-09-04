import React from 'react';
import './timeWheelPicker.css';

export interface TimeWheelPickerProps {
  value: string;
  onChange: (val: string) => void;
  label: string;
  icon?: string;
}

const TimeWheelPicker: React.FC<TimeWheelPickerProps> = ({
  value,
  onChange,
  label,
}) => {
  const parts = (value || '09:00').split(':');
  const hour = parts[0] || '09';
  const minute = parts[1] || '00';

  const handleHourChange = (newHour: string) => {
    onChange(`${newHour.padStart(2, '0')}:${minute}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(`${hour}:${newMinute.padStart(2, '0')}`);
  };

  return (
    <div className="merchant-time-wheel">
      <p className="merchant-time-wheel__label">{label}</p>
      <div className="merchant-time-wheel__face">
        <div className="merchant-time-wheel__col">
          <button
            type="button"
            className="merchant-time-wheel__spin"
            aria-label="hour up"
            onClick={() => handleHourChange(String((parseInt(hour, 10) + 1) % 24))}
          >
            <span className="merchant-time-wheel__chevron merchant-time-wheel__chevron--up" />
          </button>
          <div className="merchant-time-wheel__digit">{hour.padStart(2, '0')}</div>
          <button
            type="button"
            className="merchant-time-wheel__spin"
            aria-label="hour down"
            onClick={() =>
              handleHourChange(String((parseInt(hour, 10) - 1 + 24) % 24))
            }
          >
            <span className="merchant-time-wheel__chevron" />
          </button>
        </div>
        <div className="merchant-time-wheel__colon" aria-hidden="true">
          :
        </div>
        <div className="merchant-time-wheel__col">
          <button
            type="button"
            className="merchant-time-wheel__spin"
            aria-label="minute up"
            onClick={() =>
              handleMinuteChange(String((parseInt(minute, 10) + 5) % 60))
            }
          >
            <span className="merchant-time-wheel__chevron merchant-time-wheel__chevron--up" />
          </button>
          <div className="merchant-time-wheel__digit">{minute.padStart(2, '0')}</div>
          <button
            type="button"
            className="merchant-time-wheel__spin"
            aria-label="minute down"
            onClick={() =>
              handleMinuteChange(String((parseInt(minute, 10) - 5 + 60) % 60))
            }
          >
            <span className="merchant-time-wheel__chevron" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeWheelPicker;
