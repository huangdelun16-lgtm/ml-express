import type { CSSProperties } from 'react';
import type { MapPlaceSearchStatus, MapPlaceSuggestion } from '../utils/mapPlaceSearch';

export type MapAddressSearchLabels = {
  loading: string;
  empty: string;
  failed: string;
  retry: string;
};

type MapAddressSearchDropdownProps = {
  open: boolean;
  status: MapPlaceSearchStatus;
  suggestions: MapPlaceSuggestion[];
  labels: MapAddressSearchLabels;
  variant?: 'dark' | 'light';
  placement?: 'bottom' | 'top';
  listboxId?: string;
  onSelect: (suggestion: MapPlaceSuggestion) => void;
  onRetry: () => void;
};

export function MapAddressSearchDropdown({
  open,
  status,
  suggestions,
  labels,
  variant = 'light',
  placement = 'bottom',
  listboxId = 'map-place-search-listbox',
  onSelect,
  onRetry,
}: MapAddressSearchDropdownProps) {
  if (!open || status === 'idle') return null;

  const isDark = variant === 'dark';
  const openUp = placement === 'top';
  const panelStyle: CSSProperties = {
    position: 'absolute',
    top: openUp ? 'auto' : '100%',
    bottom: openUp ? '100%' : 'auto',
    left: 0,
    right: 0,
    marginTop: openUp ? 0 : '4px',
    marginBottom: openUp ? '4px' : 0,
    background: isDark ? 'rgba(255, 255, 255, 0.98)' : '#fff',
    backdropFilter: isDark ? 'blur(10px)' : undefined,
    borderRadius: isDark ? '8px' : '10px',
    border: isDark ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid #e2e8f0',
    boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 8px 24px rgba(0, 0, 0, 0.12)',
    maxHeight: isDark ? '400px' : '280px',
    overflowY: 'auto',
    zIndex: 1000,
  };

  const statusStyle: CSSProperties = {
    padding: '20px 16px',
    textAlign: 'center',
    color: status === 'error' ? '#b45309' : '#6b7280',
    fontSize: '0.9rem',
  };

  return (
    <div
      id={listboxId}
      role="listbox"
      aria-busy={status === 'loading'}
      style={panelStyle}
    >
      {status === 'loading' ? (
        <div style={statusStyle} aria-live="polite">
          {labels.loading}
        </div>
      ) : null}

      {status === 'empty' ? (
        <div style={statusStyle} aria-live="polite">
          {labels.empty}
        </div>
      ) : null}

      {status === 'error' ? (
        <div style={statusStyle} aria-live="polite">
          <div>{labels.failed}</div>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onRetry}
            style={{
              marginTop: '10px',
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '0.85rem',
              color: '#1f2937',
            }}
          >
            {labels.retry}
          </button>
        </div>
      ) : null}

      {status === 'success'
        ? suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.placeId}-${index}`}
              type="button"
              role="option"
              aria-selected={false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(suggestion)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '0.875rem 1rem',
                border: 'none',
                borderBottom:
                  index < suggestions.length - 1
                    ? isDark
                      ? '1px solid rgba(0, 0, 0, 0.08)'
                      : '1px solid #f1f5f9'
                    : 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#1f2937',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span aria-hidden="true" style={{ flexShrink: 0 }}>
                📍
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontWeight: 600,
                    marginBottom: '0.25rem',
                  }}
                >
                  {suggestion.mainText}
                </span>
                {suggestion.secondaryText ? (
                  <span
                    style={{
                      display: 'block',
                      color: '#6b7280',
                      fontSize: '0.85rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {suggestion.secondaryText}
                  </span>
                ) : null}
              </span>
            </button>
          ))
        : null}
    </div>
  );
}
