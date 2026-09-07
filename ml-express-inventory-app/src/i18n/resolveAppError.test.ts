import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/supabase', () => ({
  getSupabaseConfigHint: () => '',
}));

vi.mock('../services/authService', () => ({
  isInventoryAuthRequiredError: () => false,
}));

import { translations } from './translations';
import { isJsEngineNoiseMessage, resolveAppError } from './resolveAppError';

describe('resolveAppError', () => {
  const t = translations.zh;

  it('hides Hermes TypeError internals from warehouse UI', () => {
    expect(isJsEngineNoiseMessage("Cannot read property 'reload' of undefined")).toBe(true);
    expect(isJsEngineNoiseMessage("Cannot read properties of undefined (reading 'reload')")).toBe(true);
    expect(resolveAppError(t, new Error("Cannot read property 'reload' of undefined"))).toBe(
      t.serviceErrors.unknown,
    );
  });

  it('keeps real business errors readable', () => {
    expect(resolveAppError(t, new Error('network request failed'))).toBe(t.serviceErrors.syncNetworkFailed);
    expect(isJsEngineNoiseMessage('车费登记失败')).toBe(false);
  });
});
