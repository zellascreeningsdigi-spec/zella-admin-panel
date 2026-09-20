// ---------------------------------------------------------------------------
// MIRROR of Zella-Screenings-backend/services/geoProximity.js
//
// Kept in step by hand (the two packages cannot import across the CRA rootDir
// boundary, same constraint as bgvValidators.ts). The backend re-runs these
// rules on submit, so this copy only drives what the candidate sees; a drift
// makes the UI wrong, never the enforcement.
// ---------------------------------------------------------------------------

export const DEFAULT_RADIUS_METERS = 100;
export const MIN_RADIUS_METERS = 50;
export const MAX_RADIUS_METERS = 100;

const EARTH_RADIUS_METERS = 6371008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export interface AddressLocation {
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
}

export interface CapturedPosition {
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
}

export interface ProximityResult {
  allowed: boolean;
  reason: 'no_reference_location' | 'no_captured_location' | 'within_radius' | 'outside_radius';
  distanceMeters: number | null;
  radiusMeters: number;
  accuracyMeters: number | null;
  accuracyExceedsRadius: boolean;
  message: string | null;
}

export function isValidCoordinate(lat?: number, lng?: number): boolean {
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function resolveRadius(radiusMeters?: number): number {
  if (!isFiniteNumber(radiusMeters)) return DEFAULT_RADIUS_METERS;
  return Math.min(MAX_RADIUS_METERS, Math.max(MIN_RADIUS_METERS, radiusMeters));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function evaluateProximity(
  addressLocation: AddressLocation | undefined | null = {},
  captured: CapturedPosition = {}
): ProximityResult {
  const radius = resolveRadius(addressLocation?.radiusMeters);
  const accuracy = isFiniteNumber(captured?.accuracyMeters) ? captured.accuracyMeters : null;

  const base = {
    distanceMeters: null as number | null,
    radiusMeters: radius,
    accuracyMeters: accuracy,
    accuracyExceedsRadius: accuracy !== null && accuracy > radius,
    message: null as string | null
  };

  const hasReference = !!addressLocation &&
    isValidCoordinate(addressLocation.latitude, addressLocation.longitude);

  if (!hasReference) {
    return { ...base, allowed: true, reason: 'no_reference_location' };
  }

  if (!isValidCoordinate(captured?.latitude, captured?.longitude)) {
    return {
      ...base,
      allowed: false,
      reason: 'no_captured_location',
      message: 'Location not captured. Please enable location access and try again.'
    };
  }

  const distance = distanceMeters(
    addressLocation!.latitude!, addressLocation!.longitude!,
    captured.latitude!, captured.longitude!
  );
  const rounded = Math.round(distance);

  if (distance <= radius) {
    return { ...base, allowed: true, reason: 'within_radius', distanceMeters: rounded };
  }

  return {
    ...base,
    allowed: false,
    reason: 'outside_radius',
    distanceMeters: rounded,
    message: `Only on this location this form can be opened and submitted. ` +
      `You appear to be about ${formatDistance(rounded)} from the address on this case ` +
      `(the limit is ${radius}m). Please complete this form at the address being verified.`
  };
}
