import React from 'react';

// 上传进度接口
interface UploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  fileSize?: number;
  uploadedSize?: number;
}

// 进度条组件属性
interface ProgressBarProps {
  progress: UploadProgress;
  showDetails?: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
}

// 单个文件进度条组件
export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showDetails = true,
  onCancel,
  onRetry
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#6b7280';
      case 'uploading': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'uploading': return '📤';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      {/* 文件信息 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flex: 1,
          minWidth: 0
        }}>
          <span style={{ fontSize: '16px' }}>
            {getStatusIcon(progress.status)}
          </span>
          <span style={{
            fontSize: '14px',
            fontWeight: 500,
            color: 'white',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {progress.fileName}
          </span>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {showDetails && progress.fileSize && (
            <span style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.7)'
            }}>
              {formatFileSize(progress.fileSize)}
            </span>
          )}
          
          {progress.status === 'error' && onRetry && (
            <button
              onClick={onRetry}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              重试
            </button>
          )}
          
          {(progress.status === 'pending' || progress.status === 'uploading') && onCancel && (
            <button
              onClick={onCancel}
              style={{
                background: 'rgba(107, 114, 128, 0.2)',
                color: '#d1d5db',
                border: '1px solid rgba(107, 114, 128, 0.3)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              取消
            </button>
          )}
        </div>
      </div>

      {/* 进度条 */}
      <div style={{
        width: '100%',
        height: '6px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '3px',
        overflow: 'hidden',
        marginBottom: '4px'
      }}>
        <div style={{
          width: `${progress.progress}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${getStatusColor(progress.status)} 0%, ${getStatusColor(progress.status)} 100%)`,
          borderRadius: '3px',
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* 进度信息 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.7)'
      }}>
        <span>
          {progress.status === 'completed' ? '上传完成' :
           progress.status === 'error' ? '上传失败' :
           progress.status === 'uploading' ? '上传中...' : '等待中...'}
        </span>
        <span>
          {progress.progress}%
        </span>
      </div>

      {/* 错误信息 */}
      {progress.status === 'error' && progress.error && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#fca5a5'
        }}>
          {progress.error}
        </div>
      )}
    </div>
  );
};

// 批量上传进度组件属性
interface BatchProgressProps {
  progresses: UploadProgress[];
  onCancelAll?: () => void;
  onRetryAll?: () => void;
}

// 批量上传进度组件
export const BatchProgress: React.FC<BatchProgressProps> = ({
  progresses,
  onCancelAll,
  onRetryAll
}) => {
  const completedCount = progresses.filter(p => p.status === 'completed').length;
  const errorCount = progresses.filter(p => p.status === 'error').length;
  const uploadingCount = progresses.filter(p => p.status === 'uploading').length;
  const pendingCount = progresses.filter(p => p.status === 'pending').length;

  const hasErrors = errorCount > 0;
  const hasUploading = uploadingCount > 0 || pendingCount > 0;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      {/* 总体进度信息 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: 600,
          color: 'white'
        }}>
          上传进度 ({completedCount}/{progresses.length})
        </h3>
        
        <div style={{
          display: 'flex',
          gap: '8px'
        }}>
          {hasErrors && onRetryAll && (
            <button
              onClick={onRetryAll}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              重试失败
            </button>
          )}
          
          {hasUploading && onCancelAll && (
            <button
              onClick={onCancelAll}
              style={{
                background: 'rgba(107, 114, 128, 0.2)',
                color: '#d1d5db',
                border: '1px solid rgba(107, 114, 128, 0.3)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              取消全部
            </button>
          )}
        </div>
      </div>

      {/* 进度统计 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '8px',
          background: 'rgba(16, 185, 129, 0.1)',
          borderRadius: '6px',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
            {completedCount}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
            已完成
          </div>
        </div>
        
        <div style={{
          textAlign: 'center',
          padding: '8px',
          background: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '6px',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>
            {uploadingCount + pendingCount}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
            进行中
          </div>
        </div>
        
        <div style={{
          textAlign: 'center',
          padding: '8px',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '6px',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>
            {errorCount}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
            失败
          </div>
        </div>
        
        <div style={{
          textAlign: 'center',
          padding: '8px',
          background: 'rgba(107, 114, 128, 0.1)',
          borderRadius: '6px',
          border: '1px solid rgba(107, 114, 128, 0.2)'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#6b7280' }}>
            {progresses.length}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
            总计
          </div>
        </div>
      </div>

      {/* 单个文件进度 */}
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {progresses.map((progress, index) => (
          <ProgressBar
            key={index}
            progress={progress}
            showDetails={true}
          />
        ))}
      </div>
    </div>
  );
};

// 导出类型
export type { UploadProgress, ProgressBarProps, BatchProgressProps };
