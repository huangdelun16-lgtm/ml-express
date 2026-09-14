import { useEffect, useRef, useState, type FC, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function CblTableSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="cbl-table-wrap" aria-hidden>
      <table className="cbl-table">
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row}>
              {Array.from({ length: cols }, (_, col) => (
                <td key={col}>
                  <span className="cbl-skel-line" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CblEmpty({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="cbl-empty cbl-empty--in-card">
      {children}
      {action ? <div className="cbl-empty__action">{action}</div> : null}
    </div>
  );
}

type RowMenuItem = {
  id: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export const CblRowMenu: FC<{
  label: string;
  items: RowMenuItem[];
}> = ({ label, items }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    btnTop: number;
    btnBottom: number;
    right: number;
    openUp: boolean;
  }>({
    btnTop: 0,
    btnBottom: 0,
    right: 0,
    openUp: false,
  });

  useEffect(() => {
    if (!open) return undefined;
    const sync = () => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const estimated = items.length * 36 + 12;
      setCoords({
        btnTop: rect.top,
        btnBottom: rect.bottom,
        right: Math.max(8, window.innerWidth - rect.right),
        openUp: rect.bottom + estimated > window.innerHeight - 8,
      });
    };
    sync();
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync, true);
    };
  }, [open, items.length]);

  return (
    <div className="cbl-row-menu" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className="cbl-row-menu__btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
      >
        ···
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              className="cbl-row-menu__list"
              role="menu"
              style={
                coords.openUp
                  ? { bottom: window.innerHeight - coords.btnTop + 4, right: coords.right }
                  : { top: coords.btnBottom + 4, right: coords.right }
              }
            >
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className={`cbl-row-menu__item${item.danger ? ' is-danger' : ''}`}
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};
