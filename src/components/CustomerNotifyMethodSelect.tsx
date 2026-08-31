import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CUSTOMER_NOTIFY_METHODS,
  CUSTOMER_NOTIFY_METHOD_LABELS,
  type CustomerNotifyMethod,
} from '../utils/customerNotifyMethod';

type Props = {
  value: CustomerNotifyMethod;
  onChange: (value: CustomerNotifyMethod) => void;
  disabled?: boolean;
  isEn?: boolean;
};

type MenuPos = { top: number; left: number; width: number; maxHeight: number };

export default function CustomerNotifyMethodSelect({
  value,
  onChange,
  disabled = false,
  isEn = false,
}: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);

  const updatePos = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const gap = 6;
    const estimated = 52 * CUSTOMER_NOTIFY_METHODS.length + 12;
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUp = spaceBelow < Math.min(estimated, 280) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(160, Math.min(estimated, openUp ? spaceAbove : spaceBelow));
    setPos({
      top: openUp ? rect.top - gap - maxHeight : rect.bottom + gap,
      left: rect.left,
      width: Math.max(rect.width, 220),
      maxHeight,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePos();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePos();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointer = (e: MouseEvent | PointerEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <div className="cbl-notify-select" ref={wrapRef}>
      <span className="cbl-customer-field__label">{isEn ? 'Notify method' : '通知方式'}</span>
      <button
        ref={btnRef}
        type="button"
        className="cbl-notify-select__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{CUSTOMER_NOTIFY_METHOD_LABELS[value]}</span>
        <span className="cbl-notify-select__chevron" aria-hidden="true">
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && pos
        ? createPortal(
            <ul
              ref={menuRef}
              id={listId}
              className="cbl-notify-select__menu"
              role="listbox"
              aria-label={isEn ? 'Notify method' : '通知方式'}
              style={{
                top: pos.top,
                left: pos.left,
                width: pos.width,
                maxHeight: pos.maxHeight,
              }}
            >
              {CUSTOMER_NOTIFY_METHODS.map((method) => {
                const selected = method === value;
                return (
                  <li key={method} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={
                        selected
                          ? 'cbl-notify-select__option cbl-notify-select__option--active'
                          : 'cbl-notify-select__option'
                      }
                      onClick={() => {
                        onChange(method);
                        setOpen(false);
                      }}
                    >
                      {CUSTOMER_NOTIFY_METHOD_LABELS[method]}
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
