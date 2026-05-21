import React from 'react';
import type { ExportFormat, ExportMethod } from '../../services/exportMerchantStatement';
import type { MerchantLanguage } from '../../constants/merchantOrderStatus';
import '../orders/merchantOrderModals.css';

export interface MerchantExportStatementModalProps {
  open: boolean;
  language: MerchantLanguage;
  isExporting: boolean;
  startDate: string;
  endDate: string;
  format: ExportFormat;
  method: ExportMethod;
  recipientEmail?: string;
  onClose: () => void;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onFormatChange: (v: ExportFormat) => void;
  onMethodChange: (v: ExportMethod) => void;
  onExport: () => void;
}

const MerchantExportStatementModal: React.FC<MerchantExportStatementModalProps> = ({
  open,
  language,
  isExporting,
  startDate,
  endDate,
  format,
  method,
  recipientEmail,
  onClose,
  onStartDateChange,
  onEndDateChange,
  onFormatChange,
  onMethodChange,
  onExport,
}) => {
  if (!open) return null;
  const zh = language === 'zh';

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.2)',
    color: 'white',
    outline: 'none',
  };

  const choiceBtn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: 12,
    borderRadius: 12,
    background: active ? '#6366f1' : 'rgba(255,255,255,0.05)',
    color: 'white',
    border: 'none',
    fontWeight: 700,
    cursor: 'pointer',
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 30000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={() => !isExporting && onClose()}
    >
      <div
        style={{
          background: '#1e293b',
          borderRadius: 35,
          width: '100%',
          maxWidth: 500,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📊</div>
          <h2 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 950, margin: 0 }}>
            {zh ? '导出结算对账单' : 'Export Statement'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            {zh ? '选择日期范围和导出方式' : 'Select date range and method'}
          </p>
        </div>

        <div style={{ padding: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: 8 }}>
                {zh ? '开始日期' : 'Start Date'}
              </label>
              <input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: 8 }}>
                {zh ? '结束日期' : 'End Date'}
              </label>
              <input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '1rem' }}>
              {zh ? '文件格式' : 'File Format'}
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" style={choiceBtn(format === 'pdf')} onClick={() => onFormatChange('pdf')}>PDF</button>
              <button type="button" style={choiceBtn(format === 'excel')} onClick={() => onFormatChange('excel')}>Excel (XLSX)</button>
            </div>
          </div>

          <div style={{ marginBottom: '2.5rem' }}>
            <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '1rem' }}>
              {zh ? '导出方式' : 'Export Method'}
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" style={{ ...choiceBtn(method === 'download'), background: method === 'download' ? '#10b981' : choiceBtn(false).background }} onClick={() => onMethodChange('download')}>
                ⬇️ {zh ? '直接下载' : 'Download'}
              </button>
              <button type="button" style={{ ...choiceBtn(method === 'email'), background: method === 'email' ? '#10b981' : choiceBtn(false).background }} onClick={() => onMethodChange('email')}>
                📧 {zh ? '发送至邮箱' : 'Email'}
              </button>
            </div>
            {method === 'email' && recipientEmail ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '0.8rem', textAlign: 'center' }}>
                {zh ? `将发送至: ${recipientEmail}` : `Will send to: ${recipientEmail}`}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onExport}
            disabled={isExporting}
            style={{
              width: '100%',
              padding: '1.25rem',
              borderRadius: 18,
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: 'white',
              fontWeight: 900,
              cursor: isExporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            {isExporting ? (
              <>
                <span className="merchant-modal-spinner" />
                <span>{zh ? '正在生成...' : 'Generating...'}</span>
              </>
            ) : (
              <>🚀 {zh ? '立即执行导出' : 'Generate & Export Now'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MerchantExportStatementModal;
