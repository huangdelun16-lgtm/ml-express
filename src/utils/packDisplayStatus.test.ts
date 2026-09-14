import {
  isPackDisplayFinished,
  matchesPackTransportFilter,
} from './packDisplayStatus';

describe('matchesPackTransportFilter', () => {
  it('keeps in-transit packs in 进行中', () => {
    expect(
      matchesPackTransportFilter(
        { status: 'in_transit', display_status: 'loaded' },
        'active',
      ),
    ).toBe(true);
  });

  it('drops display-completed packs from 进行中 even if cloud is still hub/split', () => {
    expect(
      matchesPackTransportFilter(
        { status: 'split_at_hub', display_status: 'completed' },
        'active',
      ),
    ).toBe(false);
    expect(
      matchesPackTransportFilter(
        { status: 'hub_received', display_status: 'completed' },
        'active',
      ),
    ).toBe(false);
  });

  it('puts display-completed packs into 已完成', () => {
    expect(
      matchesPackTransportFilter(
        { status: 'split_at_hub', display_status: 'completed' },
        'completed',
      ),
    ).toBe(true);
    expect(isPackDisplayFinished({ status: 'hub_received', display_status: 'completed' })).toBe(
      true,
    );
  });

  it('keeps true hub-received arrived packs in 到站, not 已完成', () => {
    const arrived = { status: 'hub_received' as const, display_status: 'arrived' as const };
    expect(matchesPackTransportFilter(arrived, 'hub_received')).toBe(true);
    expect(matchesPackTransportFilter(arrived, 'completed')).toBe(false);
    expect(matchesPackTransportFilter(arrived, 'active')).toBe(true);
  });

  it('drops display-completed packs from 待处理/到站', () => {
    expect(
      matchesPackTransportFilter(
        { status: 'hub_received', display_status: 'completed' },
        'hub_received',
      ),
    ).toBe(false);
  });
});
