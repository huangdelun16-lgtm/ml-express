import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  style?: React.CSSProperties;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  label,
  placeholder = '请选择',
  error,
  disabled = false,
  required = false,
  style = {}
}) => {
  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: error ? '2px solid #e53e3e' : '2px solid rgba(255, 255, 255, 0.3)',
    fontSize: '1rem',
    background: 'rgba(15, 32, 60, 0.55)',
    color: 'white',
    cursor: disabled ? 'not-allowed' : 'pointer',
    outline: 'none',
    transition: 'border-color 0.3s ease',
    ...style
  };

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '0.9rem',
          fontWeight: 500,
          color: 'rgba(255, 255, 255, 0.9)'
        }}>
          {label}
          {required && <span style={{ color: '#e53e3e', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        style={selectStyle}
        onFocus={(e) => {
          if (!error) {
            e.currentTarget.style.borderColor = '#2c5282';
          }
        }}
        onBlur={(e) => {
          if (!error) {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          }
        }}
      >
        {placeholder && (
          <option value="" style={{ color: '#000' }}>{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} style={{ color: '#000' }}>
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <div style={{
          marginTop: '4px',
          fontSize: '0.875rem',
          color: '#e53e3e'
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default Select;

