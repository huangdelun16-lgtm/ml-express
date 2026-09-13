import { act, renderHook } from '@testing-library/react';
import { useMapPlaceSearch } from './useMapPlaceSearch';

type PendingCall = {
  input: string;
  callback: (predictions: unknown, status: string) => void;
};

function createFakeService() {
  const pending: PendingCall[] = [];
  return {
    pending,
    getPlacePredictions: jest.fn((request: { input: string }, callback: PendingCall['callback']) => {
      pending.push({ input: request.input, callback });
    }),
    flush(index: number, predictions: unknown, status: string) {
      pending[index]?.callback(predictions, status);
    },
  };
}

describe('useMapPlaceSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (window as any).google = {
      maps: {
        LatLng: function LatLng(lat: number, lng: number) {
          return { lat, lng };
        },
        places: {},
      },
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (window as any).google;
  });

  it('waits 300ms after typing stops, then requests the latest query only', () => {
    const service = createFakeService();
    const { result } = renderHook(() =>
      useMapPlaceSearch({
        getAutocompleteService: () => service,
        getLocationBias: () => ({ lat: 21.95, lng: 96.08 }),
        language: 'zh',
      }),
    );

    act(() => {
      result.current.scheduleSearch('za');
    });
    expect(service.getPlacePredictions).not.toHaveBeenCalled();

    act(() => {
      result.current.scheduleSearch('zay');
      jest.advanceTimersByTime(299);
    });
    expect(service.getPlacePredictions).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(service.getPlacePredictions).toHaveBeenCalledTimes(1);
    expect(service.pending[0].input).toBe('zay');
    expect(result.current.status).toBe('loading');
  });

  it('does not let an older response overwrite a newer one', () => {
    const service = createFakeService();
    const { result } = renderHook(() =>
      useMapPlaceSearch({
        getAutocompleteService: () => service,
        getLocationBias: () => ({ lat: 21.95, lng: 96.08 }),
        language: 'zh',
      }),
    );

    act(() => {
      result.current.searchNow('old');
      result.current.searchNow('new');
    });

    act(() => {
      service.flush(0, [{ place_id: 'old-1', description: 'Old Place' }], 'OK');
    });
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.status).toBe('loading');

    act(() => {
      service.flush(
        1,
        [
          {
            place_id: 'new-1',
            description: 'New Place',
            structured_formatting: { main_text: 'New Place', secondary_text: 'Mandalay' },
          },
        ],
        'OK',
      );
    });
    expect(result.current.status).toBe('success');
    expect(result.current.suggestions).toEqual([
      {
        placeId: 'new-1',
        mainText: 'New Place',
        secondaryText: 'Mandalay',
        description: 'New Place',
      },
    ]);
  });

  it('turns a hung request into a failed state', () => {
    const service = createFakeService();
    const { result } = renderHook(() =>
      useMapPlaceSearch({
        getAutocompleteService: () => service,
        getLocationBias: () => ({ lat: 21.95, lng: 96.08 }),
        language: 'zh',
        timeoutMs: 40,
      }),
    );

    act(() => {
      result.current.searchNow('zay');
    });
    expect(result.current.status).toBe('loading');

    act(() => {
      jest.advanceTimersByTime(40);
    });
    expect(result.current.status).toBe('error');
    expect(result.current.open).toBe(true);
  });

  it('exposes empty and failed states', () => {
    const service = createFakeService();
    const { result } = renderHook(() =>
      useMapPlaceSearch({
        getAutocompleteService: () => service,
        getLocationBias: () => ({ lat: 21.95, lng: 96.08 }),
        language: 'zh',
      }),
    );

    act(() => {
      result.current.searchNow('nowhere');
      service.flush(0, [], 'ZERO_RESULTS');
    });
    expect(result.current.status).toBe('empty');
    expect(result.current.open).toBe(true);

    act(() => {
      result.current.searchNow('denied');
      service.flush(1, [], 'REQUEST_DENIED');
    });
    expect(result.current.status).toBe('error');
    expect(result.current.suggestions).toEqual([]);
  });
});
