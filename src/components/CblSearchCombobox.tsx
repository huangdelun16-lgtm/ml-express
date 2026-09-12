import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  filterComboOptions,
  moveComboActiveIndex,
  type CblSearchOption,
} from '../utils/cblSearchCombobox';
import '../styles/crossBorderLogistics.css';

export type { CblSearchOption };

type Props = {
  value: string;
  onChange: (next: string) => void;
  options: CblSearchOption[];
  placeholder: string;
  emptyText: string;
  isEn: boolean;
  count?: number;
  variant?: 'dark' | 'light';
  onSelect?: (option: CblSearchOption) => void;
};

type MenuPos = { top: number; left: number; width: number; maxHeight: number };

export default function CblSearchCombobox({
  value,
  onChange,
  options,
  placeholder,
  emptyText,
  isEn,
  count,
  variant = 'dark',
  onSelect,
}: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pos, setPos] = useState<MenuPos | null>(null);

  const visible = useMemo(() => filterComboOptions(options, value), [options, value]);
  const visibleKey = useMemo(() => visible.map((item) => item.id).join('\n'), [visible]);

  const updatePos = () => {
    const input = inputRef.current;
    if (!input) return;
    const rect = input.getBoundingClientRect();
    const gap = 6;
    const estimated = Math.min(320, 8 + visible.length * 48 + (visible.length ? 0 : 44));
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUp = spaceBelow < Math.min(estimated, 240) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(estimated, openUp ? spaceAbove : spaceBelow));
    setPos({
      top: openUp ? rect.top - gap - maxHeight : rect.bottom + gap,
      left: rect.left,
      width: Math.max(rect.width, 240),
      maxHeight,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePos();
  }, [open, visible.length, value]);

  useEffect(() => {
    if (!value.trim()) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex(visible.length ? 0 : -1);
  }, [value, visibleKey, visible.length]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePos();
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || activeIndex < 0) return;
    const item = menuRef.current?.querySelector<HTMLElement>(`[data-combo-index="${activeIndex}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const confirm = (option: CblSearchOption) => {
    onChange(option.value);
    onSelect?.(option);
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((current) =>
        moveComboActiveIndex(current, event.key === 'ArrowDown' ? 1 : -1, visible.length),
      );
      return;
    }
    if (event.key === 'Enter') {
      if (!open || activeIndex < 0 || !visible[activeIndex]) return;
      event.preventDefault();
      confirm(visible[activeIndex]);
    }
  };

  const activeId =
    open && activeIndex >= 0 && visible[activeIndex]
      ? `${listId}-${visible[activeIndex].id}`
      : undefined;

  return (
    <div className={`cbl-search cbl-search-combo cbl-search-combo--${variant}`} ref={wrapRef}>
      <div className="cbl-search-combo__field">
        <input
          ref={inputRef}
          type="text"
          className={`cbl-search__input${variant === 'light' ? ' cbl-search__input--light' : ''}`}
          value={value}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="cbl-search-combo__chevron"
          tabIndex={-1}
          aria-label={open ? (isEn ? 'Hide matches' : '收起匹配') : isEn ? 'Show matches' : '展开匹配'}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setOpen((prev) => !prev);
            inputRef.current?.focus();
          }}
        >
          {open ? '▴' : '▾'}
        </button>
      </div>
      {value.trim() ? (
        <span className="cbl-search__count">
          {isEn ? `${count ?? visible.length} matches` : `${count ?? visible.length} 条匹配`}
        </span>
      ) : null}

      {open && pos
        ? createPortal(
            <ul
              ref={menuRef}
              id={listId}
              className={`cbl-search-combo__menu cbl-search-combo__menu--${variant}`}
              role="listbox"
              aria-label={placeholder}
              style={{
                top: pos.top,
                left: pos.left,
                width: pos.width,
                maxHeight: pos.maxHeight,
              }}
            >
              {visible.length === 0 ? (
                <li className="cbl-search-combo__empty" role="presentation">
                  {emptyText}
                </li>
              ) : (
                visible.map((option, index) => {
                  const active = index === activeIndex;
                  return (
                    <li key={option.id} role="presentation">
                      <button
                        type="button"
                        id={`${listId}-${option.id}`}
                        data-combo-index={index}
                        role="option"
                        aria-selected={active}
                        className={`cbl-search-combo__option${active ? ' is-active' : ''}`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => confirm(option)}
                      >
                        <span className="cbl-search-combo__option-label">{option.label}</span>
                        {option.detail ? (
                          <span className="cbl-search-combo__option-detail">{option.detail}</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
