import {
  planTruckFeeSave,
  truckFeeDraftFromSettings,
  truckFeeKeysForPair,
  truckFeeSettingsKey,
} from './inventoryTruckRouteSettings';

describe('truck fee settings', () => {
  it('writes the canonical key and the Muse / Ruili aliases Inventory looks up', () => {
    expect(truckFeeKeysForPair('MSE', 'MDY')).toEqual([
      truckFeeSettingsKey('MSE', 'MDY'),
      truckFeeSettingsKey('MUSE', 'MDY'),
    ]);
    expect(truckFeeKeysForPair('RUI', 'YGN')).toContain(truckFeeSettingsKey('RUILI', 'YGN'));
  });

  it('shows an alias key on the canonical route and keeps an explicit 0', () => {
    const { draft, keys } = truckFeeDraftFromSettings([
      { settings_key: 'inventory.truck_fee.MUSE.MDY', settings_value: 15000 },
      { settings_key: 'inventory.truck_fee.MDY.YGN', settings_value: 0 },
    ]);
    expect(draft.MSE.MDY).toBe('15000');
    expect(draft.MDY.YGN).toBe('0');
    expect(keys).toHaveLength(2);
  });

  it('clears a blank route and rejects a negative fee', () => {
    const { draft, keys } = truckFeeDraftFromSettings([
      { settings_key: 'inventory.truck_fee.MSE.MDY', settings_value: 8000 },
    ]);
    draft.MSE.MDY = '';
    const cleared = planTruckFeeSave(draft, keys);
    expect(cleared.ok).toBe(true);
    if (cleared.ok) {
      expect(cleared.deleteKeys).toEqual(
        expect.arrayContaining([
          truckFeeSettingsKey('MSE', 'MDY'),
          truckFeeSettingsKey('MUSE', 'MDY'),
        ]),
      );
    }
    draft.MDY.YGN = '-1';
    const invalid = planTruckFeeSave(draft, keys);
    expect(invalid.ok).toBe(false);
  });
});
