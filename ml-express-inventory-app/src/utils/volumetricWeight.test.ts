import { describe, expect, it } from 'vitest';
import { volumetricFormula, volumetricWeightFromSpec, volumetricWeightKg } from './volumetricWeight';

describe('volumetric weight', () => {
  it('divides length × width × height by 6000', () => {
    expect(volumetricWeightKg('30', '20', '15')).toBe(1.5);
    expect(volumetricFormula('30', '20', '15')).toBe('30×20×15=9000÷6000');
  });

  it('stays empty until all three sides are filled', () => {
    expect(volumetricWeightKg('30', '20', '')).toBeNull();
    expect(volumetricWeightKg('0', '20', '15')).toBeNull();
  });

  it('reads a saved spec string', () => {
    expect(volumetricWeightFromSpec('30 x 20 x 15 cm')).toBe(1.5);
  });
});
