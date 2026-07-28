import { describe, expect, it } from 'vitest';
import { buildTsplInboundLabel } from '../services/tsplLabelBuilder';

describe('buildTsplInboundLabel', () => {
  it('builds TSPL with barcode and print command', () => {
    const payload = buildTsplInboundLabel({
      barcode: 'ML-001',
      sheetKind: 'inbound',
      extras: {
        productName: 'Sample item',
        destination: 'YGN',
      },
    });

    expect(payload).toContain('SIZE 58 mm, 40 mm');
    expect(payload).toContain('BARCODE');
    expect(payload).toContain('"ML-001"');
    expect(payload).toContain('PRINT 1');
  });
});
