import {
  buildCodDiffCsvHeader,
  buildCodDiffCsvRow,
  buildCodSettlePatch,
  classifyCodDiff,
  codDiffKindLabel,
  filterCodDiffRows,
  formatCodSettledByLabel,
  isMissingCodSettledByColumn,
  merchantSettledByLabel,
  normalizeCodSettledBy,
  readCodSettledBy,
  stripCodSettledByFields,
  summarizeCodDiff,
  type CodSettlementLike,
} from './codSettlement';

function pkg(partial: Partial<CodSettlementLike>): CodSettlementLike {
  return {
    id: 'MDY001',
    status: '已送达',
    sender_name: '芒果店',
    delivery_store_id: 'store-1',
    delivery_store_name: '芒果店',
    cod_amount: 5000,
    ...partial,
  };
}

describe('codSettlement', () => {
  it('writes admin / merchant actor onto the shared settle patch', () => {
    const now = '2026-08-30T10:00:00.000Z';
    expect(
      buildCodSettlePatch({ kind: 'admin', id: 'fin01', name: '财务A' }, now),
    ).toEqual({
      cod_settled: true,
      cod_settled_at: now,
      cod_settled_by: 'admin',
      cod_settled_by_id: 'fin01',
      cod_settled_by_name: '财务A',
    });
    expect(
      buildCodSettlePatch({ kind: 'merchant', id: 'store-1', name: '芒果店' }, now),
    ).toMatchObject({
      cod_settled_by: 'merchant',
      cod_settled_by_id: 'store-1',
      cod_settled_by_name: '芒果店',
    });
  });

  it('normalizes missing or legacy settler values', () => {
    expect(normalizeCodSettledBy(null)).toBeNull();
    expect(normalizeCodSettledBy('ADMIN')).toBe('admin');
    expect(normalizeCodSettledBy('merchant')).toBe('merchant');
    expect(normalizeCodSettledBy('finance')).toBe('unknown');
    expect(readCodSettledBy({ cod_settled: false, cod_settled_by: 'admin' })).toBeNull();
    expect(readCodSettledBy({ cod_settled: true, cod_settled_by: null })).toBe('unknown');
  });

  it('classifies who settled and the two cash/COD mismatches', () => {
    expect(classifyCodDiff(pkg({}))).toBe('unsettled');
    expect(
      classifyCodDiff(pkg({ cod_settled: true, cod_settled_by: 'admin', rider_settled: true })),
    ).toBe('admin_settled');
    expect(
      classifyCodDiff(pkg({ cod_settled: true, cod_settled_by: 'merchant', rider_settled: true })),
    ).toBe('merchant_settled');
    expect(classifyCodDiff(pkg({ cod_settled: true, rider_settled: true }))).toBe(
      'unknown_settled',
    );
    expect(classifyCodDiff(pkg({ rider_settled: true }))).toBe('rider_pending_merchant');
    expect(classifyCodDiff(pkg({ cod_settled: true, cod_settled_by: 'admin' }))).toBe(
      'merchant_ahead_of_rider',
    );
  });

  it('skips in-transit or zero-COD rows that nobody settled', () => {
    expect(classifyCodDiff(pkg({ status: '待取件' }))).toBeNull();
    expect(classifyCodDiff(pkg({ status: '已完成', cod_amount: 0 }))).toBeNull();
  });

  it('defaults the export filter to rows that still need reconciling', () => {
    const rows = [
      pkg({ id: 'a' }),
      pkg({ id: 'b', cod_settled: true, cod_settled_by: 'admin', rider_settled: true }),
      pkg({ id: 'c', cod_settled: true, rider_settled: true }),
      pkg({ id: 'd', rider_settled: true }),
      pkg({ id: 'e', status: '待确认' }),
    ];
    const needs = filterCodDiffRows(rows, 'needs');
    expect(needs.map((r) => r.id)).toEqual(['a', 'c', 'd']);
    expect(filterCodDiffRows(rows, 'all')).toHaveLength(4);
    expect(filterCodDiffRows(rows, 'admin_settled').map((r) => r.id)).toEqual(['b']);

    const summary = summarizeCodDiff(rows);
    expect(summary.unsettled).toBe(1);
    expect(summary.admin_settled).toBe(1);
    expect(summary.unknown_settled).toBe(1);
    expect(summary.rider_pending_merchant).toBe(1);
    expect(summary.needs).toBe(3);
    expect(summary.total).toBe(4);
  });

  it('labels settler for admin finance and merchant list', () => {
    expect(
      formatCodSettledByLabel(
        { cod_settled: true, cod_settled_by: 'admin', cod_settled_by_name: '财务A' },
        'zh',
      ),
    ).toBe('后台 · 财务A');
    expect(merchantSettledByLabel('admin', 'zh')).toBe('后台已结');
    expect(merchantSettledByLabel('merchant', 'zh')).toBe('本店已结');
    expect(merchantSettledByLabel('', 'zh')).toBe('已结清（未记录结清方）');
    expect(codDiffKindLabel('rider_pending_merchant', 'zh')).toBe('骑手已结、商家未结');
  });

  it('builds CSV columns that include settler and rider mismatch', () => {
    const header = buildCodDiffCsvHeader('zh');
    expect(header).toContain('结清方');
    expect(header).toContain('差异类型');
    const row = buildCodDiffCsvRow(
      {
        ...pkg({
          cod_settled: true,
          cod_settled_by: 'merchant',
          cod_settled_by_name: '芒果店',
          rider_settled: false,
        }),
        diffKind: 'merchant_ahead_of_rider',
      },
      'zh',
    );
    expect(row).toContain('商家已结、骑手未结');
    expect(row).toContain('商家 · 芒果店');
  });

  it('strips actor fields and detects missing-column errors for fallback writes', () => {
    const patch = buildCodSettlePatch({ kind: 'admin', id: 'u1', name: 'A' }, 't');
    expect(stripCodSettledByFields(patch)).toEqual({
      cod_settled: true,
      cod_settled_at: 't',
    });
    expect(isMissingCodSettledByColumn({ code: 'PGRST204', message: 'column' })).toBe(true);
    expect(
      isMissingCodSettledByColumn({
        code: '42703',
        message: 'column packages.cod_settled_by does not exist',
      }),
    ).toBe(true);
    expect(isMissingCodSettledByColumn({ code: '42501', message: 'permission' })).toBe(false);
  });
});
