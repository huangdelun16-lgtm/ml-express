import {
  orderPickupVisibility,
  orderPickupVisibilityLabel,
  orderStatusFilterValues,
  orderTrackingStatusBadgeClass,
  orderTrackingStatusLabel,
} from './inventoryOrderTracking';

describe('inventoryOrderTracking', () => {
  it('keeps pack/order filters on the same口径', () => {
    expect(orderStatusFilterValues('in_transit')).toEqual(['in_transit']);
    expect(orderStatusFilterValues('hub_received')).toEqual(['hub_received']);
    expect(orderStatusFilterValues('awaiting_pickup')).toEqual(['hub_received']);
    expect(orderStatusFilterValues('signed')).toBeNull();
    expect(orderStatusFilterValues('active')).toEqual(['in_transit', 'hub_received']);
    expect(orderStatusFilterValues('all')).toBeNull();
  });

  it('labels order statuses without mixing pack counts', () => {
    expect(orderTrackingStatusLabel('hub_received', false)).toBe('已到站');
    expect(orderTrackingStatusLabel('in_transit', true)).toBe('In transit');
    expect(orderTrackingStatusBadgeClass('hub_received')).toContain('blue');
  });

  it('shows notify/sign visibility from store-item timestamps', () => {
    expect(orderPickupVisibilityLabel({ customer_signed_at: '2026-09-10T10:00:00Z' }, false)).toBe(
      '已签收',
    );
    expect(
      orderPickupVisibilityLabel(
        { status: 'hub_received', arrival_notified_at: '2026-09-10T09:00:00Z' },
        false,
      ),
    ).toBe('已到站且已通知');
    expect(orderPickupVisibilityLabel({ status: 'hub_received' }, true)).toBe(
      'Arrived · not notified',
    );
    expect(orderPickupVisibility({ status: 'in_transit' }).kind).toBe('none');
  });
});
