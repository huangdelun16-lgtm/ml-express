import { useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Language } from './types';
import { translations, type TranslationDict } from './translations';
import { fmt } from './format';
import type { PackDisplayStatus } from '../utils/packDisplayStatus';
import type { FinanceLedgerCategory } from '../types/financeLedger';
import type { OrderTrackingStatus, PkgTrackingStatus } from '../types/tracking';

export function useTranslation(): {
  t: TranslationDict;
  language: Language;
  fmt: typeof fmt;
} {
  const { language } = useLanguage();
  const t = useMemo(() => translations[language], [language]);
  return { t, language, fmt };
}

export function getPackStatusLabel(
  language: Language,
  status: PackDisplayStatus,
): string {
  return translations[language].packStatus[status];
}

export { formatTimeAgo, getEditDeniedMessage, getLedgerCategoryLabel, getOrderStatusLabel, getPkgStatusLabel, getTransportFeeDisplay, formatOrderNotFoundHint, formatPkgNotFoundHint, LEDGER_CATEGORY_STYLE } from './helpers';

export { resolvePrintError } from './printErrors';

export { resolveAppError, formatServiceError } from './resolveAppError';

export { fmt } from './format';

export function getCrossBorderCategoryLabel(
  t: TranslationDict,
  category: FinanceLedgerCategory,
): string {
  if (category === 'order_income_cod') return t.crossBorderFinance.catPendingCollect;
  if (category === 'order_prepaid') return t.crossBorderFinance.catPrepaid;
  if (category === 'order_collected') return t.crossBorderFinance.catCollected;
  return t.ledgerCategory[category];
}
