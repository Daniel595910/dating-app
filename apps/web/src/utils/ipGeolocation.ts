/**
 * IP geolocation + timezone → country resolution.
 *
 * The app supports exactly 6 countries. Anything outside that set is
 * treated as "unsupported region" — we don't want to store or display
 * matches from regions we don't serve.
 *
 * Supported: Nigeria, Ghana, South Africa, United Kingdom, United States,
 *            [6th country]
 *
 * Replace SUPPORTED_COUNTRIES below with your real list before deploy.
 */

export const SUPPORTED_COUNTRIES = [
  { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  // Add 6th here
] as const;

export type SupportedCountryCode = typeof SUPPORTED_COUNTRIES[number]['code'];

const SUPPORTED_CODES = new Set(SUPPORTED_COUNTRIES.map((c) => c.code));

export function isSupportedCountry(code: string | null | undefined): boolean {
  if (!code) return false;
  return SUPPORTED_CODES.has(code.toUpperCase() as SupportedCountryCode);
}

export interface IpGeolocationResult {
  ip: string | null;
  country: string | null;
  countryName: string | null;
  city: string | null;
  region: string | null;
  timezone: string | null;
  supported: boolean;
  error: string | null;
}

const EMPTY: IpGeolocationResult = {
  ip: null,
  country: null,
  countryName: null,
  city: null,
  region: null,
  timezone: null,
  supported: false,
  error: 'not_fetched',
};

/**
 * Fetch IP geolocation via ipinfo.io.
 * 4-second timeout — the signup flow shouldn't hang on this signal.
 */
export async function getIpGeolocation(timeoutMs = 4000): Promise<IpGeolocationResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://ipinfo.io/json', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timer);

    if (!res.ok) {
      return { ...EMPTY, error: `http_${res.status}` };
    }

    const data = await res.json();
    const cc = typeof data.country === 'string' && data.country.length === 2
      ? data.country.toUpperCase()
      : null;

    const supported = isSupportedCountry(cc);

    return {
      ip: data.ip || null,
      country: cc,
      countryName: SUPPORTED_COUNTRIES.find((c) => c.code === cc)?.name ?? null,
      city: data.city || null,
      region: data.region || null,
      timezone: data.timezone || null,
      supported,
      error: null,
    };
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : 'fetch_failed';
    return { ...EMPTY, error: msg };
  }
}

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Map IANA timezone → country code, restricted to supported countries.
 * Anything not in this table returns null (= "signal unavailable", not "unsupported").
 */
const TZ_TO_COUNTRY: Record<string, string> = {
  // ---- Nigeria ----
  'Africa/Lagos': 'NG',

  // ---- Ghana ----
  'Africa/Accra': 'GH',

  // ---- South Africa ----
  'Africa/Johannesburg': 'ZA',

  // ---- United Kingdom ----
  'Europe/London': 'GB',

  // ---- United States ----
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Anchorage': 'US',
  'America/Honolulu': 'US',
  'Pacific/Honolulu': 'US',

  // ---- 6th country (fill in) ----
  // 'Africa/Nairobi': 'KE',
  // 'America/Toronto': 'CA',
  // 'Asia/Dubai': 'AE',
};

export function timezoneToCountry(tz: string): string | null {
  if (!tz) return null;
  return TZ_TO_COUNTRY[tz] || null;
}

export function getTimezoneRegion(tz: string): string | null {
  if (!tz) return null;
  const parts = tz.split('/');
  return parts.length >= 2 ? parts[0] : null;
}