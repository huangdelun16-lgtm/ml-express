import React from 'react';
import { feedbackService } from '../services/FeedbackService';
import {
  buildTelUrl,
  buildWhatsAppUrl,
  preferredContactLabel,
  resolvePreferredContact,
} from '../utils/contactPhone';

type Props = {
  phone?: string | null;
  notifyMethod?: string | null;
  notifyAccount?: string | null;
  isEn: boolean;
  message?: string;
};

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function openContactHref(href: string) {
  if (!href) return;
  if (href.startsWith('http://') || href.startsWith('https://')) {
    window.open(href, '_blank', 'noopener,noreferrer');
    return;
  }
  window.location.href = href;
}

export default function CblContactActions({
  phone,
  notifyMethod,
  notifyAccount,
  isEn,
  message,
}: Props) {
  const preferred = resolvePreferredContact(notifyMethod, notifyAccount, phone);
  const display = String(phone || notifyAccount || '').trim();
  if (!preferred && !display) return <span>—</span>;

  const telHref = buildTelUrl(phone || '');
  const copyValue = preferred?.copyText || display;

  const runPreferred = () => {
    if (!preferred) return;
    if (preferred.kind === 'copy' || !preferred.href) {
      void copyText(preferred.copyText).then((ok) => {
        feedbackService.notify(
          ok
            ? isEn
              ? 'Copied'
              : preferred.kind === 'copy'
                ? '已复制微信号'
                : '已复制'
            : isEn
              ? 'Copy failed'
              : '复制失败',
        );
      });
      return;
    }
    if (preferred.kind === 'whatsapp') {
      openContactHref(buildWhatsAppUrl(preferred.copyText, message) || preferred.href);
      return;
    }
    openContactHref(preferred.href);
  };

  return (
    <div className="cbl-contact">
      {display ? <div className="cbl-contact__number">{display}</div> : null}
      <div className="cbl-contact__actions">
        {preferred ? (
          <button type="button" className="cbl-contact__btn" onClick={runPreferred}>
            {preferredContactLabel(preferred.kind, isEn)}
          </button>
        ) : null}
        {telHref && preferred?.kind !== 'tel' ? (
          <a className="cbl-contact__btn" href={telHref}>
            {isEn ? 'Call' : '打电话'}
          </a>
        ) : null}
        {copyValue ? (
          <button
            type="button"
            className="cbl-contact__btn"
            onClick={() => {
              void copyText(copyValue).then((ok) => {
                feedbackService.notify(
                  ok
                    ? isEn
                      ? 'Phone copied'
                      : '已复制电话'
                    : isEn
                      ? 'Copy failed'
                      : '复制失败',
                );
              });
            }}
          >
            {isEn ? 'Copy' : '复制'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
