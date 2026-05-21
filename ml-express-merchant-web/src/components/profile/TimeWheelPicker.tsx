import React from 'react';

export interface TimeWheelPickerProps {
  value: string;
  onChange: (val: string) => void;
  label: string;
  icon: string;
}

const TimeWheelPicker: React.FC<TimeWheelPickerProps> = ({
  value,
  onChange,
  label,
  icon,
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
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '1.5rem',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.2rem',
        flex: 1,
        minWidth: '200px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '0.9rem',
          fontWeight: 800,
          textTransform: 'uppercase',
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>{icon}</span> {label}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          padding: '15px',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <button
            type="button"
            onClick={() =>
              handleHourChange(String((parseInt(hour, 10) + 1) % 24))
            }
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              width: '40px',
              height: '30px',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ▲
          </button>
          <div
            style={{
              fontSize: '2.2rem',
              fontWeight: 900,
              color: 'white',
              fontFamily: 'monospace',
              padding: '5px 10px',
            }}
          >
            {hour.padStart(2, '0')}
          </div>
          <button
            type="button"
            onClick={() =>
              handleHourChange(String((parseInt(hour, 10) - 1 + 24) % 24))
            }
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              width: '40px',
              height: '30px',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ▼
          </button>
        </div>

        <div
          style={{
            fontSize: '1.8rem',
            fontWeight: 900,
            color: '#fbbf24',
            marginTop: '2px',
          }}
        >
          :
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <button
            type="button"
            onClick={() =>
              handleMinuteChange(String((parseInt(minute, 10) + 5) % 60))
            }
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              width: '40px',
              height: '30px',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ▲
          </button>
          <div
            style={{
              fontSize: '2.2rem',
              fontWeight: 900,
              color: 'white',
              fontFamily: 'monospace',
              padding: '5px 10px',
            }}
          >
            {minute.padStart(2, '0')}
          </div>
          <button
            type="button"
            onClick={() =>
              handleMinuteChange(String((parseInt(minute, 10) - 5 + 60) % 60))
            }
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              width: '40px',
              height: '30px',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ▼
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeWheelPicker;
