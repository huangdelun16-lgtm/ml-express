import {
  buildRouteMatrixPayload,
  buildRoutePerKgSettingsKey,
  collectPricingCustomerOptions,
  customerHasRoutePricing,
  destinationHubFromCustomerCode,
  mergeRouteMatrixFromDb,
  normalizeCustomerPricingCode,
  normalizeRouteHubCode,
  parseRouteMatrixForSave,
  parseRoutePerKgSettingsKey,
} from './crossBorderRoutePricing';

describe('crossBorderRoutePricing', () => {
  it('normalizes hub aliases', () => {
    expect(normalizeRouteHubCode('RUILI')).toBe('RUI');
    expect(normalizeRouteHubCode('MUSE')).toBe('MSE');
    expect(normalizeRouteHubCode('YGN')).toBe('YGN');
  });

  it('builds route settings keys', () => {
    expect(buildRoutePerKgSettingsKey('RUILI', 'MDY')).toBe(
      'pricing.cross_border.route.RUI.MDY.per_kg',
    );
    expect(buildRoutePerKgSettingsKey('LSO', 'MDY')).toBe(
      'pricing.cross_border.route.LSO.MDY.per_kg',
    );
    expect(buildRoutePerKgSettingsKey('YGN', 'POL')).toBe(
      'pricing.cross_border.route.YGN.POL.per_kg',
    );
    expect(buildRoutePerKgSettingsKey('RUILI', 'MDY', 'mdy260812005')).toBe(
      'pricing.cross_border.customer.MDY260812005.route.RUI.MDY.per_kg',
    );
  });

  it('parses global and customer route keys', () => {
    expect(parseRoutePerKgSettingsKey('pricing.cross_border.route.RUI.MDY.per_kg')).toEqual({
      customerCode: '',
      origin: 'RUI',
      dest: 'MDY',
    });
    expect(
      parseRoutePerKgSettingsKey(
        'pricing.cross_border.customer.MDY260812005.route.LSO.MDY.per_kg',
      ),
    ).toEqual({
      customerCode: 'MDY260812005',
      origin: 'LSO',
      dest: 'MDY',
    });
  });

  it('merges route matrix from db settings', () => {
    const matrix = mergeRouteMatrixFromDb([
      {
        id: '1',
        category: 'pricing',
        settings_key: 'pricing.cross_border.route.RUI.MDY.per_kg',
        settings_value: 22000,
        description: '',
        updated_by: 'test',
        updated_at: '',
      },
      {
        id: '2',
        category: 'pricing',
        settings_key: 'pricing.cross_border.route.LSO.MDY.per_kg',
        settings_value: 11000,
        description: '',
        updated_by: 'test',
        updated_at: '',
      },
      {
        id: '3',
        category: 'pricing',
        settings_key: 'pricing.cross_border.customer.MDY260812005.route.RUI.MDY.per_kg',
        settings_value: 18000,
        description: '',
        updated_by: 'test',
        updated_at: '',
      },
    ]);
    expect(matrix.RUI.MDY).toBe('22000');
    expect(matrix.LSO.MDY).toBe('11000');
  });

  it('merges a customer matrix without mixing default rates', () => {
    const matrix = mergeRouteMatrixFromDb(
      [
        {
          category: 'pricing',
          settings_key: 'pricing.cross_border.route.RUI.MDY.per_kg',
          settings_value: 22000,
        },
        {
          category: 'pricing',
          settings_key: 'pricing.cross_border.customer.MDY260812005.route.RUI.MDY.per_kg',
          settings_value: 18000,
        },
        {
          category: 'pricing',
          settings_key: 'pricing.cross_border.customer.YGN00921.route.RUI.MDY.per_kg',
          settings_value: 15000,
        },
      ],
      'mdy260812005',
    );
    expect(matrix.RUI.MDY).toBe('18000');
    expect(customerHasRoutePricing(
      [
        {
          category: 'pricing',
          settings_key: 'pricing.cross_border.customer.MDY260812005.route.RUI.MDY.per_kg',
          settings_value: 18000,
        },
      ],
      'MDY260812005',
    )).toBe(true);
    expect(
      customerHasRoutePricing(
        [
          {
            category: 'pricing',
            settings_key: 'pricing.cross_border.route.RUI.MDY.per_kg',
            settings_value: 22000,
          },
        ],
        'MDY260812005',
      ),
    ).toBe(false);
  });

  it('writes customer-scoped keys on save', () => {
    const matrix = mergeRouteMatrixFromDb([]);
    matrix.RUI.MDY = '18000';
    matrix.RUI.YGN = '25000';
    const payload = buildRouteMatrixPayload(matrix, 'MDY260812005');
    expect(payload).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          settings_key: 'pricing.cross_border.customer.MDY260812005.route.RUI.MDY.per_kg',
          settings_value: 18000,
        }),
      ]),
    );
    const destOnly = buildRouteMatrixPayload(matrix, 'MDY00000', { destinations: ['MDY'] });
    expect(destOnly.map((row) => row.settings_key)).toEqual([
      'pricing.cross_border.customer.MDY00000.route.RUI.MDY.per_kg',
    ]);
  });

  it('maps customer code prefixes to the inbound destination hub', () => {
    expect(destinationHubFromCustomerCode('MDY00000')).toBe('MDY');
    expect(destinationHubFromCustomerCode('MDY260812005')).toBe('MDY');
    expect(destinationHubFromCustomerCode('YGN260812001')).toBe('YGN');
    expect(destinationHubFromCustomerCode('RUILI260812001')).toBe('RUI');
    expect(destinationHubFromCustomerCode('', 'POL')).toBe('POL');
  });

  it('collects unique customer codes from the customers card', () => {
    expect(normalizeCustomerPricingCode(' mdy-260812005 ')).toBe('MDY260812005');
    expect(
      collectPricingCustomerOptions(
        [{ customer_code: 'MDY260812005', customer_name: '登记客户' }],
        [
          { customerCode: 'MDY260812005', customerName: '旧名' },
          { customerCode: 'YGN00921', customerName: '快递汇总' },
          { customerCode: '', customerName: '无编码' },
        ],
      ),
    ).toEqual([
      { code: 'MDY260812005', name: '登记客户' },
      { code: 'YGN00921', name: '快递汇总' },
    ]);
  });

  it('validates numeric matrix on save', () => {
    const matrix = mergeRouteMatrixFromDb([]);
    matrix.RUI.MDY = '22000';
    matrix.LSO.MDY = 'abc';
    const parsed = parseRouteMatrixForSave(matrix);
    expect(parsed.ok).toBe(false);
  });
});
