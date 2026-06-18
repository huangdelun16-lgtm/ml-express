import { describe, expect, it } from 'vitest';
import { evaluatePasswordStrength } from './passwordUi';

describe('evaluatePasswordStrength', () => {
  it('returns empty state', () => {
    expect(evaluatePasswordStrength('').score).toBe(0);
  });

  it('flags short passwords', () => {
    expect(evaluatePasswordStrength('abc').score).toBe(1);
  });

  it('accepts longer mixed passwords', () => {
    expect(evaluatePasswordStrength('Abc12345').score).toBeGreaterThanOrEqual(3);
  });
});
