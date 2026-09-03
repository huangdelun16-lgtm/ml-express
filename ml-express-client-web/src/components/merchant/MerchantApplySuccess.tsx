import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { lookupMerchantApplication, type PublicApplicationStatus } from '../../utils/merchantApplyUpload';
import { statusLabel, type MerchantApplyCopy } from '../../utils/merchantApplyCopy';

type MerchantApplySuccessProps = {
  t: MerchantApplyCopy;
  applicationId: string;
  phone: string;
  email: string;
  onApplyAgain: () => void;
};

const MerchantApplySuccess: React.FC<MerchantApplySuccessProps> = ({
  t,
  applicationId,
  phone,
  email,
  onApplyAgain,
}) => {
  const [copied, setCopied] = useState(false);
  const [lookupPhone, setLookupPhone] = useState(phone);
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupRow, setLookupRow] = useState<PublicApplicationStatus | null>({
    applicationId,
    status: 'pending',
    store_name: '',
    created_at: '',
    review_notes: null,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(applicationId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    setLooking(true);
    setLookupError(null);
    try {
      const samePhone =
        lookupPhone.replace(/\D/g, '') === phone.replace(/\D/g, '') && Boolean(applicationId);
      const row = await lookupMerchantApplication(
        lookupPhone,
        samePhone ? applicationId : undefined,
      );
      setLookupRow(row);
    } catch (err) {
      const message = err instanceof Error ? err.message : t.lookupFailed;
      setLookupRow(null);
      setLookupError(
        message === 'LOOKUP_FAILED' || /未找到|not found/i.test(message) ? t.lookupNotFound : t.lookupFailed,
      );
    } finally {
      setLooking(false);
    }
  };

  return (
    <div className="merchant-apply-success" role="status">
      <p className="merchant-apply-success__kicker">MARKET LINK EXPRESS</p>
      <h2>{t.successTitle}</h2>
      <p className="merchant-apply-success__lead">{t.successLead}</p>

      <div className="merchant-apply-success__id">
        <span className="merchant-apply-success__id-label">{t.successId}</span>
        <code>{applicationId}</code>
        <button type="button" className="merchant-apply-success__copy" onClick={handleCopy}>
          {copied ? t.successCopied : t.successCopyId}
        </button>
      </div>

      <ul className="merchant-apply-success__facts">
        <li>{t.successReview}</li>
        <li>
          {t.successContact}
          {phone ? ` · ${phone}` : ''}
          {email ? ` · ${email}` : ''}
        </li>
      </ul>

      <form className="merchant-apply-lookup" onSubmit={handleLookup}>
        <h3>{t.successLookupTitle}</h3>
        <p>{t.successLookupHint}</p>
        <label htmlFor="lookup_phone">{t.successLookupPhone}</label>
        <div className="merchant-apply-lookup__row">
          <input
            id="lookup_phone"
            value={lookupPhone}
            onChange={(e) => setLookupPhone(e.target.value)}
            required
          />
          <button type="submit" className="merchant-apply-btn merchant-apply-btn--primary" disabled={looking}>
            {looking ? t.successLookuping : t.successLookupBtn}
          </button>
        </div>
        {lookupError ? (
          <p className="merchant-apply-lookup__error">{lookupError}</p>
        ) : null}
        {lookupRow ? (
          <dl className="merchant-apply-lookup__result">
            <div>
              <dt>{t.successId}</dt>
              <dd>{lookupRow.applicationId || applicationId}</dd>
            </div>
            <div>
              <dt>{t.storeName}</dt>
              <dd>{lookupRow.store_name || '—'}</dd>
            </div>
            <div>
              <dt>{statusLabel(lookupRow.status || 'pending', t)}</dt>
              <dd>{lookupRow.created_at ? lookupRow.created_at.slice(0, 10) : '—'}</dd>
            </div>
            {lookupRow.review_notes ? (
              <div>
                <dt>{t.notes}</dt>
                <dd>{lookupRow.review_notes}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </form>

      <div className="merchant-apply-actions">
        <Link to="/" className="merchant-apply-btn merchant-apply-btn--ghost">
          {t.home}
        </Link>
        <button type="button" className="merchant-apply-btn merchant-apply-btn--primary" onClick={onApplyAgain}>
          {t.successApplyAgain}
        </button>
      </div>
    </div>
  );
};

export default MerchantApplySuccess;
