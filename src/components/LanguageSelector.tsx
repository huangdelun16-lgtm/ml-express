import React from 'react';

interface LanguageSelectorProps {
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
  show: boolean;
  onToggle: () => void;
}

/**
 * 语言选择器组件
 * 用于在多个页面复用
 */
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  onLanguageChange,
  show,
  onToggle
}) => {
  const languages = [
    { value: 'zh', label: '中文' },
    { value: 'en', label: 'English' },
    { value: 'my', label: 'မြန်မာ' }
  ];

  const currentLabel = languages.find(l => l.value === currentLanguage)?.label || '中文';

  return (
    <div style={{ position: 'relative', zIndex: 1000 }}>
      <button
        onClick={onToggle}
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          padding: '8px 16px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.3s ease'
        }}
      >
        🌐 {currentLabel} ▼
      </button>

      {show && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            background: 'rgba(15, 32, 60, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            overflow: 'hidden',
            minWidth: '120px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}
        >
          {languages.map((lang) => (
            <button
              key={lang.value}
              onClick={() => {
                onLanguageChange(lang.value);
                onToggle();
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
                textAlign: 'left',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;

