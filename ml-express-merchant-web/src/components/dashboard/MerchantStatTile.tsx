import React from 'react';

type Props = {
  label: string;
  value: React.ReactNode;
  onClick?: () => void;
  alert?: boolean;
  children?: React.ReactNode;
};

const MerchantStatTile: React.FC<Props> = ({ label, value, onClick, alert, children }) => (
  <div
    className={`merchant-stat-tile${alert ? ' merchant-stat-tile--alert' : ''}`}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={
      onClick
        ? (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onClick();
            }
          }
        : undefined
    }
  >
    <div className="merchant-stat-tile__value">{value}</div>
    <div className="merchant-stat-tile__label">{label}</div>
    {children}
  </div>
);

export default MerchantStatTile;
