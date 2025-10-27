import React from 'react';

interface InputProps {
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'search';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  label,
  error,
  disabled = false,
  required = false,
  className = '',
  style = {}
}) => {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: error ? '2px solid #e53e3e' : '2px solid rgba(255, 255, 255, 0.3)',
    fontSize: '1rem',
    background: 'rgba(15, 32, 60, 0.55)',
    color: 'white',
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
      
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        style={inputStyle}
        className={className}
        onFocus={(e) => {
          if (!error) {
            e.currentTarget.style.borderColor = '#2c5282';
            e.currentTarget.style.background = 'rgba(15, 32, 60, 0.7)';
          }
        }}
        onBlur={(e) => {
          if (!error) {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            e.currentTarget.style.background = 'rgba(15, 32, 60, 0.55)';
          }
        }}
      />
      
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

export default Input;
