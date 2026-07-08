import {
  buildRoutePerKgSettingsKey,
  mergeRouteMatrixFromDb,
  normalizeRouteHubCode,
  parseRouteMatrixForSave,
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
    ]);
    expect(matrix.RUI.MDY).toBe('22000');
    expect(matrix.LSO.MDY).toBe('11000');
  });

  it('validates numeric matrix on save', () => {
    const matrix = mergeRouteMatrixFromDb([]);
    matrix.RUI.MDY = '22000';
    matrix.LSO.MDY = 'abc';
    const parsed = parseRouteMatrixForSave(matrix);
    expect(parsed.ok).toBe(false);
  });
});
