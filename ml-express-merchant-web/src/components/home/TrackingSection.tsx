import React, { useState } from 'react';

interface TrackingSectionProps {
  language: string;
  onTrack: (trackingNumber: string) => void;
  onScan: () => void;
}

const TrackingSection: React.FC<TrackingSectionProps> = ({ language, onTrack, onScan }) => {
  const [trackingNumber, setTrackingNumber] = useState('');

  return (
    <div style={{
      position: 'relative',
      zIndex: 5,
      marginTop: '-20px',
      padding: '0 16px',
      marginBottom: '30px'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
        border: '1px solid rgba(255,255,255,0.8)',
        maxWidth: '800px',
        margin: '0 auto',
        transform: 'translateY(-10px)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-15px)';
        e.currentTarget.style.boxShadow = '0 25px 50px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.05)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(-10px)';
        e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)';
      }}
      >
        <h2 style={{
          margin: '0 0 20px 0',
          fontSize: '1.5rem',
          color: '#1a202c',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontWeight: '700'
        }}>
          <span style={{ 
            fontSize: '1.8rem',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))'
          }}>📦</span>
          {language === 'zh' ? '运单追踪' : language === 'en' ? 'Track Package' : 'ပစ္စည်းလိုက်ရှာရန်'}
        </h2>
        
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'stretch',
          flexDirection: window.innerWidth < 768 ? 'column' : 'row'
        }}>
          <div style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <input
              type="text"
              placeholder={language === 'zh' ? '请输入运单号 (例如: MLE123456789)' : language === 'en' ? 'Enter Tracking Number (e.g. MLE123456789)' : 'ပို့ဆောင်ရေးနံပါတ်ထည့်ပါ (ဥပမာ MLE123456789)'}
              style={{
                width: '100%',
                padding: '16px 20px',
                paddingRight: '50px',
                borderRadius: '16px',
                border: '2px solid #e2e8f0',
                fontSize: '1.1rem',
                outline: 'none',
                transition: 'all 0.3s ease',
                backgroundColor: '#f8fafc',
                color: '#1e293b',
                fontWeight: '500'
              }}
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.backgroundColor = '#ffffff';
                e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.backgroundColor = '#f8fafc';
                e.target.style.boxShadow = 'none';
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && trackingNumber.trim()) {
                  onTrack(trackingNumber);
                }
              }}
            />
            {trackingNumber && (
              <button
                onClick={() => setTrackingNumber('')}
                style={{
                  position: 'absolute',
                  right: '15px',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                ✕
              </button>
            )}
          </div>
          
          <button
            onClick={() => onTrack(trackingNumber)}
            disabled={!trackingNumber.trim()}
            style={{
              padding: '16px 32px',
              background: trackingNumber.trim() ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#e2e8f0',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: trackingNumber.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease',
              boxShadow: trackingNumber.trim() ? '0 10px 20px -5px rgba(59, 130, 246, 0.4)' : 'none',
              whiteSpace: 'nowrap',
              transform: 'scale(1)'
            }}
            onMouseOver={(e) => {
              if (trackingNumber.trim()) {
                e.currentTarget.style.transform = 'scale(1.02) translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 15px 30px -5px rgba(59, 130, 246, 0.5)';
              }
            }}
            onMouseOut={(e) => {
              if (trackingNumber.trim()) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(59, 130, 246, 0.4)';
              }
            }}
          >
            {language === 'zh' ? '查询' : language === 'en' ? 'Track' : 'ရှာဖွေပါ'}
          </button>
          
          <button
            onClick={onScan}
            style={{
              padding: '16px',
              background: 'white',
              color: '#3b82f6',
              border: '2px solid #3b82f6',
              borderRadius: '16px',
              fontSize: '1.5rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              aspectRatio: '1',
              width: window.innerWidth < 768 ? '100%' : 'auto'
            }}
            title={language === 'zh' ? '扫码查询' : language === 'en' ? 'Scan QR Code' : 'QR ကုဒ်စကင်ဖတ်ပါ'}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#eff6ff';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            📷
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrackingSection;

