import React from 'react';

interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  children
}) => {
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
      
      {children}
      
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

export default FormField;

