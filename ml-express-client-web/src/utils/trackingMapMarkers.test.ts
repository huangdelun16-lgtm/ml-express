import { isCarVehicle } from './trackingMapMarkers';

describe('isCarVehicle', () => {
  it('识别汽车车型', () => {
    expect(isCarVehicle('Car')).toBe(true);
    expect(isCarVehicle('汽车')).toBe(true);
  });

  it('摩托车与空值不是汽车', () => {
    expect(isCarVehicle('Motorcycle')).toBe(false);
    expect(isCarVehicle('摩托车')).toBe(false);
    expect(isCarVehicle(null)).toBe(false);
    expect(isCarVehicle(undefined)).toBe(false);
  });
});
