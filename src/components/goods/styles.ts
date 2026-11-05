import type { CSSProperties } from 'react';

export const shell: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100%',
  color: '#f8fafc',
  background: 'transparent',
};

export const stickyTop: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 40,
  margin: '0 -4px',
  padding: '16px 4px 0',
  background: 'linear-gradient(180deg, rgba(11,18,32,0.97) 70%, rgba(11,18,32,0.88) 100%)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderBottom: '1px solid rgba(148,163,184,0.14)',
};

export const headRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'flex-start',
  padding: '0 12px 12px',
};

export const eyebrow: CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'rgba(148,163,184,0.85)',
  fontWeight: 600,
};

export const title: CSSProperties = {
  margin: '6px 0 0',
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: '#f8fafc',
};

export const lede: CSSProperties = {
  margin: '6px 0 0',
  maxWidth: 560,
  lineHeight: 1.5,
  color: 'rgba(203,213,225,0.78)',
  fontSize: 13,
};

export const tabBar: CSSProperties = {
  display: 'flex',
  gap: 2,
  flexWrap: 'wrap',
  padding: '0 8px',
  overflowX: 'auto',
};

export const bodyPad: CSSProperties = {
  padding: '16px 16px 40px',
  flex: 1,
};

export const muted: CSSProperties = {
  color: 'rgba(203,213,225,0.68)',
  fontSize: 13,
  lineHeight: 1.5,
};

export const fine: CSSProperties = {
  color: 'rgba(148,163,184,0.9)',
  fontSize: 12,
  fontWeight: 500,
  lineHeight: 1.4,
};

export const alertStyle: CSSProperties = {
  color: '#fecaca',
  background: 'rgba(127,29,29,0.4)',
  border: '1px solid rgba(252,165,165,0.28)',
  borderRadius: 10,
  padding: '10px 12px',
  margin: '12px 0 0',
  fontSize: 13,
};

export const okStyle: CSSProperties = {
  color: '#bbf7d0',
  background: 'rgba(6,78,59,0.42)',
  border: '1px solid rgba(134,239,172,0.28)',
  borderRadius: 10,
  padding: '10px 12px',
  margin: '12px 0 0',
  fontSize: 13,
};

export const toolRow: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  alignItems: 'center',
};

export const sectionTitle: CSSProperties = {
  margin: '0 0 4px',
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: '-0.01em',
};

export const formFoot: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'flex-end',
  marginTop: 0,
  flexWrap: 'wrap',
};

export const dialogFoot: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  marginTop: 16,
  paddingTop: 12,
  borderTop: '1px solid rgba(148,163,184,0.16)',
};

export const stickyTools: CSSProperties = {
  position: 'sticky',
  top: 108,
  zIndex: 20,
  margin: '0 -4px 12px',
  padding: '10px 4px',
  background: 'rgba(11,18,32,0.92)',
  backdropFilter: 'blur(8px)',
  borderBottom: '1px solid rgba(148,163,184,0.1)',
};

export const stickySubmit: CSSProperties = {
  position: 'sticky',
  bottom: 0,
  zIndex: 15,
  margin: '16px -4px -4px',
  padding: '12px 4px 4px',
  background: 'linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(15,23,42,0.92) 28%, rgba(15,23,42,0.98) 100%)',
  borderTop: '1px solid rgba(148,163,184,0.14)',
};

export const deskCss = `
  .gd-tab, .gd-ghost, .gd-primary, .gd-link, .gd-chip, .gd-metric, .gd-seg-on, .gd-seg-off, .gd-icon-btn {
    font: inherit; cursor: pointer;
  }
  .gd-tab {
    border: 0; background: transparent; color: rgba(203,213,225,0.72);
    padding: 10px 14px 12px; border-bottom: 2px solid transparent;
    border-radius: 8px 8px 0 0; white-space: nowrap; font-size: 13px; font-weight: 550;
    transition: color .15s ease, background .15s ease;
  }
  .gd-tab:hover { color: #f8fafc; background: rgba(255,255,255,0.04); }
  .gd-tab:focus-visible { outline: 2px solid #60a5fa; outline-offset: 2px; }
  .gd-tab-on {
    color: #fff; font-weight: 700;
    border-bottom-color: #3b82f6;
    background: linear-gradient(180deg, rgba(59,130,246,0.12), transparent);
  }
  .gd-ghost {
    border: 1px solid rgba(148,163,184,0.28); background: rgba(15,23,42,0.35);
    color: #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 13px; font-weight: 600;
    transition: border-color .15s ease, background .15s ease;
  }
  .gd-ghost:hover { border-color: rgba(147,197,253,0.55); background: rgba(30,41,59,0.65); }
  .gd-ghost:focus-visible, .gd-primary:focus-visible, .gd-link:focus-visible, .gd-chip:focus-visible, .gd-metric:focus-visible {
    outline: 2px solid #60a5fa; outline-offset: 2px;
  }
  .gd-primary {
    border: 0; border-radius: 8px; padding: 9px 14px; font-weight: 700; font-size: 13px;
    color: #fff; background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
    box-shadow: 0 1px 0 rgba(255,255,255,0.12) inset, 0 1px 2px rgba(0,0,0,0.25);
  }
  .gd-primary:hover:not(:disabled) { background: linear-gradient(180deg, #60a5fa 0%, #2563eb 100%); }
  .gd-primary:disabled, .gd-ghost:disabled { opacity: 0.5; cursor: default; }
  .gd-link { border: 0; background: transparent; color: #93c5fd; padding: 0; font-size: 12px; font-weight: 600; }
  .gd-link:hover { color: #bfdbfe; text-decoration: underline; }
  .gd-link-danger { color: #fca5a5; }
  .gd-link-danger:hover { color: #fecaca; }
  .gd-chip {
    border: 1px solid rgba(148,163,184,0.22); background: rgba(15,23,42,0.4);
    color: #e2e8f0; border-radius: 999px; padding: 5px 11px; font-size: 12px; font-weight: 600;
  }
  .gd-chip:hover { border-color: rgba(147,197,253,0.45); }
  .gd-chip-on { background: #fff; color: #0f172a; border-color: #fff; font-weight: 700; }
  .gd-field {
    width: 100%; box-sizing: border-box; border: 1px solid rgba(148,163,184,0.4);
    background: #0b1220; color: #f1f5f9; border-radius: 8px; padding: 8px 10px;
    font: inherit; font-size: 13px; transition: border-color .15s ease, box-shadow .15s ease;
  }
  .gd-field::placeholder { color: rgba(148,163,184,0.55); }
  .gd-field:hover { border-color: rgba(148,163,184,0.65); }
  .gd-field:focus {
    outline: none; border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.28);
    background: #0f172a;
  }
  select.gd-field { appearance: none; background-image: linear-gradient(45deg, transparent 50%, #94a3b8 50%), linear-gradient(135deg, #94a3b8 50%, transparent 50%); background-position: calc(100% - 14px) calc(50% - 2px), calc(100% - 9px) calc(50% - 2px); background-size: 5px 5px, 5px 5px; background-repeat: no-repeat; padding-right: 28px; }
  .gd-num { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
  .gd-prod > .gd-num, .gd-led > .gd-num, .gd-hold > .gd-num, .gd-r { text-align: right; }
  .gd-metrics {
    display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px;
  }
  @media (max-width: 900px) { .gd-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 520px) { .gd-metrics { grid-template-columns: 1fr; } }
  .gd-metric {
    text-align: left; color: inherit; border-radius: 12px;
    border: 1px solid rgba(148,163,184,0.16);
    background: linear-gradient(165deg, rgba(30,41,59,0.75), rgba(15,23,42,0.55));
    padding: 14px 16px; display: grid; gap: 6px;
    transition: border-color .15s ease, transform .15s ease, box-shadow .15s ease;
  }
  .gd-metric:hover {
    border-color: rgba(96,165,250,0.55);
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    transform: translateY(-1px);
  }
  .gd-metric-label { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(148,163,184,0.95); font-weight: 650; }
  .gd-card {
    border: 1px solid rgba(148,163,184,0.16);
    background: linear-gradient(165deg, rgba(30,41,59,0.55), rgba(15,23,42,0.4));
    border-radius: 12px; padding: 16px;
  }
  .gd-card-soft {
    border: 1px solid rgba(148,163,184,0.12);
    background: rgba(15,23,42,0.35);
    border-radius: 12px; padding: 14px 16px;
  }
  .gd-split { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; margin-top: 16px; }
  .gd-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
  .gd-form-sections { display: grid; gap: 16px; }
  .gd-section {
    border: 1px solid rgba(148,163,184,0.14);
    background: rgba(15,23,42,0.32);
    border-radius: 12px; padding: 14px;
  }
  .gd-section-h {
    display: flex; align-items: baseline; justify-content: space-between; gap: 8px;
    margin: 0 0 12px; padding-bottom: 8px;
    border-bottom: 1px solid rgba(148,163,184,0.12);
  }
  .gd-section-h strong { font-size: 13px; font-weight: 700; }
  .gd-section-h span { font-size: 12px; color: rgba(148,163,184,0.85); }
  .gd-prod, .gd-led, .gd-hold { display: grid; gap: 8px; align-items: center; min-width: 820px; }
  .gd-prod { grid-template-columns: minmax(200px, 1.8fr) 72px 88px 118px 130px minmax(168px, auto); }
  .gd-led { grid-template-columns: 96px 92px minmax(150px, 1.4fr) minmax(110px, 1fr) 68px minmax(130px, auto); }
  .gd-hold { grid-template-columns: 1.2fr 1fr 80px; min-width: 420px; }
  .gd-table-wrap {
    border: 1px solid rgba(148,163,184,0.14);
    border-radius: 12px; overflow: hidden; background: rgba(15,23,42,0.28);
  }
  .gd-table-scroll { overflow-x: auto; }
  .gd-head {
    font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase;
    color: rgba(148,163,184,0.75); padding: 10px 12px; font-weight: 650;
    background: rgba(15,23,42,0.55); border-bottom: 1px solid rgba(148,163,184,0.12);
  }
  .gd-r { text-align: right; }
  .gd-line {
    border-top: 1px solid rgba(148,163,184,0.08);
    padding: 10px 12px;
    transition: background .12s ease;
  }
  .gd-line:first-of-type, .gd-head + .gd-line { border-top: 0; }
  .gd-line:hover { background: rgba(59,130,246,0.06); }
  .gd-actions { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; }
  .gd-tag {
    display: inline-flex; align-items: center; margin-left: 8px; border-radius: 999px;
    padding: 1px 8px; font-size: 10px; font-weight: 700; letter-spacing: 0.02em; vertical-align: 1px;
  }
  .gd-tag-bad { color: #fecaca; background: rgba(127,29,29,0.55); border: 1px solid rgba(252,165,165,0.25); }
  .gd-tag-warn { color: #fde68a; background: rgba(120,53,15,0.5); border: 1px solid rgba(253,230,138,0.22); }
  .gd-tag-ok { color: #bbf7d0; background: rgba(6,78,59,0.45); border: 1px solid rgba(134,239,172,0.22); }
  .gd-seg {
    display: inline-flex; padding: 3px; border-radius: 10px;
    background: rgba(15,23,42,0.65); border: 1px solid rgba(148,163,184,0.16); gap: 2px;
  }
  .gd-seg-on, .gd-seg-off { border: 0; border-radius: 8px; padding: 7px 12px; font-size: 12px; }
  .gd-seg-on { background: #fff; color: #0f172a; font-weight: 700; }
  .gd-seg-off { background: transparent; color: rgba(226,232,240,0.85); }
  .gd-seg-off:hover { color: #fff; background: rgba(255,255,255,0.05); }
  .gd-mask {
    position: fixed; inset: 0; z-index: 10050; background: rgba(2,6,23,0.72);
    display: flex; align-items: flex-start; justify-content: center;
    padding: 28px 16px; overflow: auto; backdrop-filter: blur(4px);
  }
  .gd-dialog {
    width: min(480px, 100%); max-height: calc(100vh - 40px); overflow: auto; margin: auto;
    background: linear-gradient(180deg, #152033 0%, #0f172a 40%);
    color: #f8fafc; border: 1px solid rgba(148,163,184,0.22);
    border-radius: 14px; padding: 0; box-shadow: 0 28px 80px rgba(0,0,0,0.55);
  }
  .gd-dialog-wide { width: min(860px, calc(100vw - 24px)); }
  .gd-dialog-head {
    display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
    padding: 16px 18px 12px; border-bottom: 1px solid rgba(148,163,184,0.14);
    position: sticky; top: 0; background: rgba(21,32,51,0.96); z-index: 1;
  }
  .gd-dialog-body { padding: 14px 18px 8px; }
  .gd-dialog-foot { padding: 0 18px 16px; }
  .gd-dialog h3 { margin: 0; font-size: 17px; font-weight: 700; letter-spacing: -0.01em; }
  .gd-kicker { font-size: 10px; letter-spacing: 0.16em; color: #93c5fd; margin-bottom: 4px; font-weight: 700; }
  .gd-dialog-note {
    margin: 0 0 12px; color: rgba(203,213,225,0.72); font-size: 12px; line-height: 1.45;
    padding: 8px 10px; border-radius: 8px; background: rgba(59,130,246,0.08);
    border: 1px solid rgba(59,130,246,0.18);
  }
  .gd-product-layout { display: grid; grid-template-columns: 168px 1fr; gap: 18px; align-items: start; }
  .gd-stock-note {
    margin: 0; padding: 8px 10px; border-radius: 8px; font-size: 12px; line-height: 1.45;
    color: #bfdbfe; background: rgba(37,99,235,0.16); border: 1px solid rgba(96,165,250,0.35);
  }
  .gd-stock-note.is-warn {
    color: #fecaca; background: rgba(127,29,29,0.35); border-color: rgba(248,113,113,0.4);
  }
  .gd-form-tight { display: grid; gap: 10px; }
  .gd-price-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .gd-price-trio { display: grid; grid-template-columns: 1.3fr 1.3fr 0.85fr; gap: 10px; }
  .gd-money { display: grid; grid-template-columns: 86px minmax(0, 1fr); gap: 8px; }
  .gd-customer-prices {
    display: grid; gap: 8px; padding: 12px; border-radius: 10px;
    border: 1px solid rgba(59,130,246,0.28); background: rgba(59,130,246,0.07);
  }
  .gd-drop {
    position: relative; display: grid; place-items: center; width: 168px; height: 168px;
    border-radius: 14px; border: 1px dashed rgba(148,163,184,0.45);
    background: rgba(15,23,42,0.55); color: rgba(226,232,240,0.88);
    text-align: center; cursor: pointer; overflow: hidden; line-height: 1.4; font-size: 13px; font-weight: 650;
  }
  .gd-drop input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .gd-drop img { width: 168px; height: 168px; object-fit: cover; }
  .gd-drop.is-over { border-color: #60a5fa; background: rgba(59,130,246,0.12); }
  .gd-price-preview {
    display: flex; justify-content: space-between; align-items: baseline; gap: 12px;
    margin-top: 14px; padding: 12px 14px; border-radius: 12px;
    background: rgba(15,23,42,0.72); border: 1px solid rgba(147,197,253,0.28);
  }
  .gd-price-preview strong { font-size: 14px; color: #bfdbfe; }
  .gd-form-error { color: #fecaca; margin: 12px 0 0; font-size: 13px; }
  .gd-hint-warn {
    color: #fde68a; margin-top: 8px; font-size: 12px; line-height: 1.4;
    padding: 8px 10px; border-radius: 8px;
    background: rgba(120,53,15,0.35); border: 1px solid rgba(253,230,138,0.28);
  }
  .gd-hint-err {
    color: #fecaca; margin-top: 8px; font-size: 12px;
    padding: 8px 10px; border-radius: 8px;
    background: rgba(127,29,29,0.35); border: 1px solid rgba(252,165,165,0.28);
  }
  .gd-thumb {
    width: 40px; height: 40px; border-radius: 8px; object-fit: cover;
    background: rgba(255,255,255,0.06); flex: 0 0 auto;
    border: 1px solid rgba(148,163,184,0.16);
  }
  .gd-thumb-empty { display: inline-block; border: 1px solid rgba(148,163,184,0.14); }
  .gd-empty {
    margin-top: 16px; text-align: center; padding: 40px 20px;
    border: 1px dashed rgba(148,163,184,0.28); border-radius: 12px;
    background: rgba(15,23,42,0.28);
  }
  .gd-quick { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
  .gd-disabled-reason { font-size: 12px; color: rgba(253,230,138,0.95); max-width: 360px; line-height: 1.4; }
  .gd-icon-btn {
    border: 1px solid rgba(148,163,184,0.22); background: transparent; color: #94a3b8;
    border-radius: 8px; width: 32px; height: 32px; display: grid; place-items: center; padding: 0;
  }
  .gd-icon-btn:hover { color: #fff; border-color: rgba(147,197,253,0.5); }
  .gd-flow-layout {
    display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 16px; align-items: start;
  }
  @media (max-width: 980px) {
    .gd-flow-layout { grid-template-columns: 1fr; }
  }
  .gd-flow-main, .gd-flow-side { min-width: 0; }
  .gd-kind-bar {
    border-left: 3px solid transparent;
    border-radius: 12px;
    padding: 14px 16px 14px 14px;
    margin: -4px -4px 14px;
  }
  .gd-kind-bar-purchase {
    border-left-color: #3b82f6;
    background: linear-gradient(90deg, rgba(59,130,246,0.14), transparent 70%);
  }
  .gd-kind-bar-sale {
    border-left-color: #10b981;
    background: linear-gradient(90deg, rgba(16,185,129,0.14), transparent 70%);
  }
  .gd-kind-bar-consign {
    border-left-color: #f59e0b;
    background: linear-gradient(90deg, rgba(245,158,11,0.12), transparent 70%);
  }
  .gd-kind-bar-recall {
    border-left-color: #94a3b8;
    background: linear-gradient(90deg, rgba(148,163,184,0.12), transparent 70%);
  }
  .gd-kind-badge {
    display: inline-flex; align-items: center; gap: 6px;
    border-radius: 999px; padding: 2px 9px; font-size: 10px; font-weight: 750;
    letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 6px;
  }
  .gd-kind-bar-purchase .gd-kind-badge { color: #bfdbfe; background: rgba(37,99,235,0.28); border: 1px solid rgba(96,165,250,0.35); }
  .gd-kind-bar-sale .gd-kind-badge { color: #a7f3d0; background: rgba(4,120,87,0.35); border: 1px solid rgba(52,211,153,0.35); }
  .gd-kind-bar-consign .gd-kind-badge { color: #fde68a; background: rgba(146,64,14,0.35); border: 1px solid rgba(251,191,36,0.35); }
  .gd-kind-bar-recall .gd-kind-badge { color: #e2e8f0; background: rgba(51,65,85,0.55); border: 1px solid rgba(148,163,184,0.35); }
  .gd-pick-search { margin-bottom: 8px; }
  .gd-pick-list {
    display: grid; gap: 6px; max-height: 280px; overflow: auto;
    margin-top: 2px; padding-right: 2px;
  }
  .gd-pick-row {
    display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
    padding: 8px 10px; border-radius: 10px; cursor: pointer; font: inherit;
    border: 1px solid rgba(148,163,184,0.18); background: rgba(15,23,42,0.4); color: inherit;
  }
  .gd-pick-row:hover, .gd-pick-row.is-on { border-color: rgba(96,165,250,0.45); background: rgba(30,58,138,0.28); }
  .gd-pick-row .gd-thumb, .gd-pick-row .gd-thumb-empty { width: 40px; height: 40px; border-radius: 8px; flex: none; }
  .gd-pick-copy { min-width: 0; flex: 1; display: grid; gap: 2px; }
  .gd-pick-copy strong { font-size: 13px; font-weight: 700; color: #f8fafc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .gd-pick-copy span, .gd-pick-stock { font-size: 11px; color: #94a3b8; }
  .gd-pick-stock { flex: none; text-align: right; }
  .gd-pick-empty, .gd-pick-more { margin: 0; padding: 8px 4px; font-size: 12px; color: #94a3b8; }
  .gd-selected-title { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .gd-selected-title strong { min-width: 0; }
  .gd-cost-preview {
    display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;
    margin-top: 12px;
  }
  .gd-po-line {
    display: grid; gap: 10px; margin-top: 12px; padding: 12px;
    border-radius: 12px; border: 1px solid rgba(148,163,184,0.18); background: rgba(15,23,42,0.28);
  }
  .gd-po-line-h { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .gd-po-add {
    margin-top: 12px; width: 100%; height: 38px; border-radius: 10px; cursor: pointer; font: inherit; font-weight: 700;
    border: 1px dashed rgba(147,197,253,0.45); background: transparent; color: #bfdbfe;
  }
  .gd-po-add:hover { background: rgba(37,99,235,0.16); }
  .gd-cost-preview div {
    display: grid; gap: 4px; padding: 10px 12px; border-radius: 10px;
    background: rgba(15,23,42,0.5); border: 1px solid rgba(148,163,184,0.18);
  }
  .gd-cost-preview span { font-size: 11px; color: #94a3b8; font-weight: 650; }
  .gd-cost-preview strong { font-size: 14px; color: #f8fafc; font-weight: 750; }
  @media (max-width: 720px) {
    .gd-cost-preview { grid-template-columns: 1fr; }
  }
  .gd-selected-product {
    display: flex; align-items: center; gap: 10px;
    margin-top: 10px; padding: 10px 12px; border-radius: 10px;
    border: 1px solid rgba(148,163,184,0.18); background: rgba(15,23,42,0.45);
  }
  .gd-selected-product .gd-thumb, .gd-selected-product .gd-thumb-empty {
    width: 48px; height: 48px; border-radius: 10px;
  }
  .gd-selected-meta { min-width: 0; flex: 1; display: grid; gap: 4px; }
  .gd-selected-meta strong { font-size: 13px; font-weight: 700; color: #f8fafc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .gd-selected-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .gd-stock-chip {
    display: inline-flex; align-items: center; gap: 4px;
    border-radius: 999px; padding: 2px 8px; font-size: 11px; font-weight: 650;
    color: #cbd5e1; background: rgba(30,41,59,0.85); border: 1px solid rgba(148,163,184,0.22);
  }
  .gd-qty-row { display: grid; grid-template-columns: 36px minmax(0, 1fr) 36px; gap: 6px; align-items: center; }
  .gd-step-btn {
    width: 36px; height: 36px; border-radius: 8px; padding: 0;
    display: grid; place-items: center; font-size: 18px; font-weight: 700; line-height: 1;
    border: 1px solid rgba(148,163,184,0.35); background: rgba(15,23,42,0.55); color: #e2e8f0;
    cursor: pointer; font: inherit;
  }
  .gd-step-btn:hover:not(:disabled) { border-color: rgba(147,197,253,0.55); background: rgba(30,41,59,0.8); color: #fff; }
  .gd-step-btn:disabled { opacity: 0.45; cursor: default; }
  .gd-step-btn:focus-visible { outline: 2px solid #60a5fa; outline-offset: 2px; }
  .gd-chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .gd-total-strip {
    display: flex; justify-content: space-between; align-items: baseline; gap: 12px;
    margin-top: 12px; padding: 12px 14px; border-radius: 12px;
    background: linear-gradient(135deg, rgba(59,130,246,0.16), rgba(15,23,42,0.55));
    border: 1px solid rgba(96,165,250,0.28);
  }
  .gd-total-strip span { font-size: 12px; color: rgba(191,219,254,0.9); font-weight: 650; letter-spacing: 0.04em; }
  .gd-total-strip strong { font-size: 22px; font-weight: 800; color: #f8fafc; letter-spacing: -0.02em; }
  .gd-flash-ok {
    margin-top: 8px; font-size: 12px; color: #bbf7d0;
    padding: 8px 10px; border-radius: 8px;
    background: rgba(6,78,59,0.35); border: 1px solid rgba(134,239,172,0.28);
  }
  .gd-ledger-compact { margin-top: 0 !important; }
  .gd-ledger-compact .gd-line { padding: 8px 10px; }
  .gd-ledger-compact .gd-head { padding: 8px 10px; }
  .gd-consign-seg-row {
    display: flex; align-items: center; justify-content: flex-start; gap: 12px;
    margin-bottom: 12px; flex-wrap: wrap;
  }
  .gd-consign-seg-row .gd-seg-label {
    font-size: 12px; color: rgba(148,163,184,0.9); font-weight: 600;
  }
  @media (max-width: 700px) {
    .gd-product-layout, .gd-price-pair, .gd-price-trio { grid-template-columns: 1fr; }
  }
`;
