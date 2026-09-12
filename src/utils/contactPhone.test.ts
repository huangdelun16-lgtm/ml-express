import {
  buildTelegramUrl,
  buildTelUrl,
  buildWhatsAppUrl,
  resolvePreferredContact,
  toWhatsAppDigits,
} from './contactPhone';

describe('contactPhone', () => {
  it('normalizes Myanmar mobiles for WhatsApp', () => {
    expect(toWhatsAppDigits('09123456789')).toBe('959123456789');
    expect(buildWhatsAppUrl('09-123-45678')).toContain('https://wa.me/95912345678');
    expect(buildTelUrl('+95 9 123 456 789')).toBe('tel:+959123456789');
    expect(buildTelegramUrl('@mlhub')).toBe('https://t.me/mlhub');
  });

  it('opens WhatsApp / phone / WeChat from notify_method', () => {
    expect(resolvePreferredContact('whatsapp', '', '09123456789')?.kind).toBe('whatsapp');
    expect(resolvePreferredContact('phone', '', '09123456789')?.href).toBe('tel:09123456789');
    expect(resolvePreferredContact('wechat', 'ml_hub', '')).toEqual({
      kind: 'copy',
      href: '',
      copyText: 'ml_hub',
    });
    expect(resolvePreferredContact('telegram', '@ops', '')?.href).toBe('https://t.me/ops');
    expect(resolvePreferredContact('whatsapp', '', '')).toBeNull();
  });
});
