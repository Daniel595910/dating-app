/**
 * capture-location (v2 — bounding-box validation)
 *
 * Nominatim is blocked from Supabase edge functions on some projects.
 * Strategy: the CLIENT reverse-geocodes (Nominatim works from the user's
 * own IP) and sends the results. The SERVER validates those claims by:
 *
 *   1. Checking GPS coords are inside the claimed country's bounding box
 *   2. Cross-checking IP country against GPS country
 *   3. Cross-checking timezone country against GPS country
 *
 * Bounding boxes are coarse (rectangles, not polygons) but enough to
 * catch the vast majority of "I typed a different country" claims.
 * A user physically in Nigeria cannot make their GPS appear in France
 * without a rooted phone or a GPS spoofing app — and even then, the
 * timezone will still be Africa/Lagos.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { jsonResponse, handleOptions } from '../_shared/cors.ts';
import { serviceClient, userClient } from '../_shared/db.ts';

const SUPPORTED_COUNTRIES = new Set(['NG', 'GH', 'ZA', 'GB', 'US']);

const TZ_TO_COUNTRY: Record<string, string> = {
  'Africa/Lagos': 'NG',
  'Africa/Accra': 'GH',
  'Africa/Johannesburg': 'ZA',
  'Europe/London': 'GB',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Anchorage': 'US',
  'America/Honolulu': 'US',
  'Pacific/Honolulu': 'US',
};

// Bounding boxes: [minLat, maxLat, minLng, maxLng]
// Source: rough extents from GeoHack / country outline.
const BBOX: Record<string, [number, number, number, number]> = {
  NG: [4.27, 13.89, 2.67, 14.68],       // Nigeria
  GH: [4.71, 11.18, -3.26, 1.20],       // Ghana
  ZA: [-34.84, -22.13, 16.45, 32.89],   // South Africa
  GB: [49.86, 60.86, -8.62, 1.77],      // United Kingdom
  US: [18.92, 71.39, -179.15, -66.95],  // United States (incl. AK, HI)
};

function isInBoundingBox(lat: number, lng: number, cc: string): boolean {
  const box = BBOX[cc];
  if (!box) return false;
  const [minLat, maxLat, minLng, maxLng] = box;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

async function getIpCountry(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  if (
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip === '::1' ||
    ip === 'unknown'
  ) {
    return null;
  }
  try {
    const res = await fetch(`https://ipinfo.io/${ip}/json`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.country === 'string' && data.country.length === 2) {
      return data.country.toUpperCase();
    }
    return null;
  } catch {
    return null;
  }
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return null;
}

interface RequestBody {
  lat?: number;
  lng?: number;
  timezone?: string;
  // Client-side reverse-geocoding results
  detectedCity?: string;
  detectedState?: string;
  detectedCountry?: string;
  detectedCountryCode?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions();

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // --- 1. Auth ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401);

    const userSb = userClient(authHeader);
    const { data: { user }, error: authErr } = await userSb.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

    // --- 2. Parse input ---
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const lat = typeof body.lat === 'number' ? body.lat : NaN;
    const lng = typeof body.lng === 'number' ? body.lng : NaN;
    const timezone = (body.timezone || '').trim();
    const clientCountry = (body.detectedCountryCode || '').toUpperCase().trim();
    const clientCity = (body.detectedCity || '').trim();
    const clientState = (body.detectedState || '').trim();
    const clientCountryName = (body.detectedCountry || '').trim();

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return jsonResponse({ error: 'Invalid GPS coordinates' }, 400);
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return jsonResponse({ error: 'GPS coordinates out of range' }, 400);
    }
    if (!clientCountry) {
      return jsonResponse({ error: 'Missing detected country from client' }, 400);
    }

    // --- 3. Supported country check ---
    if (!SUPPORTED_COUNTRIES.has(clientCountry)) {
      return jsonResponse(
        {
          error: 'unsupported_country',
          message: `We're not available in ${clientCountryName || clientCountry} yet.`,
          country: clientCountry,
        },
        400
      );
    }

    // --- 4. Bounding-box validation ---
    // GPS must be inside the claimed country's rectangle.
    const inBox = isInBoundingBox(lat, lng, clientCountry);
    if (!inBox) {
      return jsonResponse(
        {
          error: 'gps_country_mismatch',
          message: 'Your GPS location does not match the country we detected. Please click Detect again.',
        },
        400
      );
    }

    // --- 5. Other signals ---
    const ipCountry = await getIpCountry(getClientIp(req));
    const tzCountry = TZ_TO_COUNTRY[timezone] || null;

    // --- 6. Cross-check ---
    const gpsCountry = clientCountry;
    const signals: { name: string; value: string | null }[] = [
      { name: 'gps', value: gpsCountry },
      { name: 'ip', value: ipCountry },
      { name: 'timezone', value: tzCountry },
    ].filter((s) => s.value !== null);

    const distinctValues = new Set(signals.map((s) => s.value));
    const match = distinctValues.size <= 1;

    let flagReason: string | null = null;
    if (!match) {
      if (ipCountry && ipCountry !== gpsCountry) {
        flagReason = 'ip_mismatch';
      } else if (tzCountry && tzCountry !== gpsCountry) {
        flagReason = 'timezone_mismatch';
      } else {
        flagReason = 'signals_differ';
      }
    }

    // --- 7. Write (service role bypasses prevent_gps_tamper) ---
    const sb = serviceClient();
    const now = new Date().toISOString();

    const displayCountry = clientCountryName || null;
    const displayCountryCode = gpsCountry;
    const displayState = clientState || null;
    const displayCity = clientCity || null;

    // Fallback: some rural Nominatim responses have state but not city.
    // We ensure at least ONE field is set so the client's "has location?"
    // check always sees real data.
    const locationCity = displayCity || (displayState ? null : displayCountry);

    const { error: updateErr } = await sb
      .from('profiles')
      .update({
        gps_lat: lat,
        gps_lng: lng,
        gps_captured_at: now,
        gps_city: displayCity,
        gps_state: displayState,
        gps_country: gpsCountry,
        ip_country: ipCountry,
        timezone_country: tzCountry,
        location_signals_match: match,
        location_flag_reason: flagReason,
        location: {
          city: displayCity || displayState || displayCountry || displayCountryCode,
          state: displayState,
          country: displayCountry,
          countryCode: displayCountryCode,
        },
        location_updated_at: now,
        updated_at: now,
      })
      .eq('user_id', user.id);

    if (updateErr) {
      console.error('capture-location update failed:', updateErr);
      return jsonResponse({ error: 'Failed to save location' }, 500);
    }

    // --- 8. Assign user to a regional community ---
    // Look up an active community in the user's GPS country.
    // If found, ensure the user is a member. This is what makes the
    // community page work — until a member row exists, CommunityPage
    // shows "Set My Location" as though nothing was saved.
    let assignedCommunityId: string | null = null;
    try {
      const { data: community } = await sb
        .from('communities')
        .select('id')
        .eq('country', displayCountry || '')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (community?.id) {
        // Upsert membership. Ignore 23505 (already a member).
        const { error: joinErr } = await sb
          .from('community_members')
          .upsert(
            {
              community_id: community.id,
              user_id: user.id,
              role: 'member',
              status: 'active',
            },
            { onConflict: 'community_id,user_id', ignoreDuplicates: true }
          );

        if (joinErr) {
          console.warn('community_members upsert failed:', joinErr.message);
        } else {
          assignedCommunityId = community.id;
        }
      } else {
        console.warn('No active community for country:', displayCountry);
      }
    } catch (commErr) {
      console.error('Community assignment error:', commErr);
    }

    return jsonResponse({
      success: true,
      location: {
        city: displayCity,
        state: displayState,
        country: displayCountry,
        countryCode: displayCountryCode,
      },
      gps: { lat, lng, country: gpsCountry },
      signals: { gps: gpsCountry, ip: ipCountry, timezone: tzCountry },
      match,
      flagReason,
      communityId: assignedCommunityId,
    });
  } catch (err) {
    console.error('capture-location unhandled:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse({ error: msg }, 500);
  }
});