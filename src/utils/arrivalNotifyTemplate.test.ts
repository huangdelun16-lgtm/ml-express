import {
  DEFAULT_ARRIVAL_NOTIFY_TEMPLATE,
  parseArrivalNotifyTemplate,
  renderArrivalNotifyTemplate,
} from './arrivalNotifyTemplate';

describe('arrivalNotifyTemplate', () => {
  it('fills the default sentence the same way the app used to', () => {
    const text = renderArrivalNotifyTemplate(DEFAULT_ARRIVAL_NOTIFY_TEMPLATE, {
      name: 'AMT',
      hub: 'MDY',
      barcode: 'MDY244215271026',
      express: '79140646374250',
    });
    expect(text).toBe(
      '【ML Express】AMT您好，包裹已到达MDY站，单号 MDY244215271026，快递单 79140646374250，请凭有效证件前来取件。',
    );
  });

  it('drops the greeting and express clause when those fields are empty', () => {
    const text = renderArrivalNotifyTemplate(DEFAULT_ARRIVAL_NOTIFY_TEMPLATE, {
      hub: 'MDY',
      barcode: 'MDY1',
    });
    expect(text).toBe('【ML Express】包裹已到达MDY站，单号 MDY1，请凭有效证件前来取件。');
    expect(text).not.toContain('您好');
    expect(text).not.toContain('快递单');
  });

  it('reads a plain string or a JSON-encoded string', () => {
    expect(parseArrivalNotifyTemplate('  hello {name} ')).toBe('hello {name}');
    expect(parseArrivalNotifyTemplate('"saved template"')).toBe('saved template');
    expect(parseArrivalNotifyTemplate(12)).toBe('');
  });
});
