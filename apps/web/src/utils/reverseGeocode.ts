/**
 * Reverse geocoding via OpenStreetMap Nominatim.
 *
 * Free, no API key. Rate limit: 1 request per second, so callers should
 * debounce. We pass a descriptive User-Agent per Nominatim's usage policy.
 *
 * Docs: https://nominatim.org/release-docs/latest/api/Reverse/
 */

export interface ReverseGeocodeResult {
  city: string | null;
  state: string | null;
  country: string | null;
  countryCode: string | null;
  postcode: string | null;
  displayName: string | null;
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  hamlet?: string;
  municipality?: string;
  county?: string;
  state?: string;
  region?: string;
  country?: string;
  country_code?: string;
  postcode?: string;
}

interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
  error?: string;
}

/**
 * Reverse geocode a latitude/longitude into a structured address.
 * Returns null fields if the API fails or has no data.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  const empty: ReverseGeocodeResult = {
    city: null,
    state: null,
    country: null,
    countryCode: null,
    postcode: null,
    displayName: null,
  };

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'json');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('zoom', '10'); // city-level precision
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        // Nominatim requires a descriptive UA. In browser we can't override
        // User-Agent, but setting an Accept-Language header is polite.
        'Accept-Language': 'en',
      },
    });

    if (!res.ok) return empty;

    const data: NominatimResponse = await res.json();
    if (!data.address) return empty;

    const a = data.address;

    // Pick the most specific "city-like" field, falling back down the hierarchy
    const city =
      a.city ||
      a.town ||
      a.village ||
      a.municipality ||
      a.suburb ||
      a.hamlet ||
      null;

    const state = a.state || a.region || a.county || null;

    return {
      city,
      state,
      country: a.country ?? null,
      countryCode: a.country_code ? a.country_code.toUpperCase() : null,
      postcode: a.postcode ?? null,
      displayName: data.display_name ?? null,
    };
  } catch {
    return empty;
  }
}

/**
 * Convenience: turn a country code into the flag emoji, for quick visual
 * confirmation in the UI ("you're in 🇳🇬 Nigeria").
 */
export function countryCodeToFlag(countryCode: string | null): string {
  if (!countryCode || countryCode.length !== 2) return '';
  const cc = countryCode.toUpperCase();
  const A = 0x1f1e6;
  const base = 'A'.charCodeAt(0);
  return String.fromCodePoint(
    A + (cc.charCodeAt(0) - base),
    A + (cc.charCodeAt(1) - base)
  );
}