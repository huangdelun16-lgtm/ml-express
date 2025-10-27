import React from 'react';

// 骨架屏卡片组件
export const SkeletonCard: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        animation: 'skeleton-pulse 1.5s ease-in-out infinite'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            marginRight: '12px'
          }} />
          <div style={{ flex: 1 }}>
            <div style={{
              height: '16px',
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '4px',
              marginBottom: '8px',
              width: '70%'
            }} />
            <div style={{
              height: '14px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              width: '50%'
            }} />
          </div>
        </div>
        <div style={{
          height: '14px',
          background: 'rgba(255, 255, 255, 0.12)',
          borderRadius: '4px',
          marginBottom: '8px',
          width: '90%'
        }} />
        <div style={{
          height: '14px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          width: '60%'
        }} />
      </div>
    ))}
  </div>
);

// 骨架屏表格组件
export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div style={{ display: 'grid', gap: '8px' }}>
    {/* 表头 */}
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '12px', marginBottom: '12px' }}>
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          style={{
            height: '20px',
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '4px'
          }}
        />
      ))}
    </div>
    {/* 表格行 */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '12px' }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div
            key={colIndex}
            style={{
              height: '40px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              animation: 'skeleton-pulse 1.5s ease-in-out infinite'
            }}
          />
        ))}
      </div>
    ))}
  </div>
);

// 骨架屏统计卡片组件
export const SkeletonStats: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
    {Array.from({ length: count }).map((_, i) => (
      <div 
        key={i} 
        style={{
          background: 'rgba(255, 255, 255, 0.12)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          animation: 'skeleton-pulse 1.5s ease-in-out infinite'
        }}
      >
        <div style={{
          height: '14px',
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '4px',
          marginBottom: '12px',
          width: '60%'
        }} />
        <div style={{
          height: '32px',
          background: 'rgba(255, 255, 255, 0.12)',
          borderRadius: '4px',
          width: '40%'
        }} />
      </div>
    ))}
  </div>
);
