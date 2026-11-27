import type { PkgTrackingDetail } from '../types/tracking';
import { parseTripTransportFee } from './tripTransportFee';

export type TruckTripSummary = {
  tripNumber: string;
  legDestination: string;
  outboundDate: string | null;
  loadedAt: string | null;
  transportFee: string;
  packCount: number;
  packages: PkgTrackingDetail[];
};

function tripSortKey(trip: TruckTripSummary): number {
  const loaded = trip.loadedAt ? Date.parse(trip.loadedAt) : 0;
  const outbound = trip.outboundDate ? Date.parse(`${trip.outboundDate}T00:00:00`) : 0;
  return Math.max(loaded, outbound);
}

/** 将有车次号的包裹按车次分组；无车次号的仍按单包展示 */
export function splitOutboundByTrip(packages: PkgTrackingDetail[]): {
  trips: TruckTripSummary[];
  legacyPackages: PkgTrackingDetail[];
} {
  const tripMap = new Map<string, TruckTripSummary>();
  const legacyPackages: PkgTrackingDetail[] = [];

  for (const pkg of packages) {
    const tripNumber = pkg.trip_number?.trim().toUpperCase() ?? '';
    if (!tripNumber) {
      legacyPackages.push(pkg);
      continue;
    }
    const existing = tripMap.get(tripNumber);
    if (!existing) {
      tripMap.set(tripNumber, {
        tripNumber,
        legDestination: pkg.leg_destination_code || pkg.destination_code,
        outboundDate: pkg.truck_outbound_date,
        loadedAt: pkg.truck_loaded_at,
        transportFee: pkg.transport_fee,
        packCount: 1,
        packages: [pkg],
      });
      continue;
    }
    existing.packages.push(pkg);
    existing.packCount += 1;
    if (parseTripTransportFee(pkg.transport_fee) > parseTripTransportFee(existing.transportFee)) {
      existing.transportFee = pkg.transport_fee;
    }
    if (!existing.loadedAt && pkg.truck_loaded_at) existing.loadedAt = pkg.truck_loaded_at;
    if (!existing.outboundDate && pkg.truck_outbound_date) {
      existing.outboundDate = pkg.truck_outbound_date;
    }
  }

  const trips = [...tripMap.values()].sort((a, b) => tripSortKey(b) - tripSortKey(a));
  for (const trip of trips) {
    trip.packages.sort((a, b) =>
      (b.truck_loaded_at ?? '').localeCompare(a.truck_loaded_at ?? ''),
    );
  }
  legacyPackages.sort((a, b) =>
    (b.truck_loaded_at ?? '').localeCompare(a.truck_loaded_at ?? ''),
  );

  return { trips, legacyPackages };
}

/** 发出列表按车次排，无车次号的仍各占一行。页签数字跟这个行数走。 */
export function outboundTrackRowCount(packages: PkgTrackingDetail[]): number {
  const { trips, legacyPackages } = splitOutboundByTrip(packages);
  return trips.length + legacyPackages.length;
}
