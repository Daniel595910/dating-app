/**
 * Location Service
 *
 * Client-side wrapper for the capture-location edge function.
 * The edge function does all the anti-spoofing work; this just:
 *   1. Gets the browser GPS
 *   2. Fetches the reverse-geocoded city (for optimistic UI)
 *   3. Calls the edge function
 *   4. Returns the result for the caller to render
 */

import { supabase } from '@/config/supabase.client';
import { reverseGeocode, ReverseGeocodeResult } from '@/utils/reverseGeocode';
import { getBrowserTimezone, getIpGeolocation } from '@/utils/ipGeolocation';

export interface CaptureLocationInput {
  lat: number;
  lng: number;
  displayCity?: string;
  displayState?: string;
  displayCountry?: string;
  displayCountryCode?: string;
}

export interface CaptureLocationResult {
  success: boolean;
  error?: string;
  errorCode?: 'unsupported_country' | 'invalid_coords' | 'unauthorized' | 'server_error';
  location?: {
    city: string | null;
    state: string | null;
    country: string | null;
    countryCode: string | null;
  };
  gps?: { lat: number; lng: number; country: string };
  signals?: { gps: string | null; ip: string | null; timezone: string | null };
  match?: boolean;
  flagReason?: string | null;
}

export interface GpsResult {
  lat: number;
  lng: number;
  accuracy: number;
}

class LocationService {
  /**
   * Request the browser's GPS coordinates.
   * Rejects on denial, timeout, or unsupported browser.
   */
  async requestGps(timeoutMs = 10000): Promise<GpsResult> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (err) => {
          const messages: Record<number, string> = {
            [err.PERMISSION_DENIED]:
              'Location permission was denied. Please enable it in your browser settings.',
            [err.POSITION_UNAVAILABLE]:
              'Could not determine your location. Please try again.',
            [err.TIMEOUT]:
              'Location request timed out. Please try again.',
          };
          reject(new Error(messages[err.code] || 'Could not get your location'));
        },
        {
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Reverse geocode coordinates. Used by the client for preview,
   * but the server will re-run this to prevent tampering.
   */
  async previewReverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    return reverseGeocode(lat, lng);
  }

  /**
   * Send GPS + display fields to the edge function.
   * The edge function does the actual write.
   */
  async captureLocation(input: CaptureLocationInput): Promise<CaptureLocationResult> {
    try {
      const timezone = getBrowserTimezone();

      const { data, error } = await supabase.functions.invoke('capture-location', {
        body: {
          lat: input.lat,
          lng: input.lng,
          timezone,
          // Client-side reverse geocoding (server can't reach Nominatim)
          detectedCity: input.displayCity || null,
          detectedState: input.displayState || null,
          detectedCountry: input.displayCountry || null,
          detectedCountryCode: input.displayCountryCode || null,
        },
      });

      if (error) {
        // Supabase's FunctionsHttpError carries the response body in `context`
        const ctx: any = (error as any).context;
        let parsed: any = null;
        try {
          parsed = typeof ctx?.json === 'function' ? await ctx.json() : ctx;
        } catch {
          parsed = null;
        }

        // Map server error codes to client-visible codes
        if (parsed?.error === 'unsupported_country') {
          return {
            success: false,
            error: parsed.message || 'We are not available in your country yet.',
            errorCode: 'unsupported_country',
          };
        }

        if (parsed?.error === 'Invalid GPS coordinates' || parsed?.error === 'GPS coordinates out of range') {
          return { success: false, error: parsed.error, errorCode: 'invalid_coords' };
        }

        if (parsed?.error === 'Unauthorized' || parsed?.error === 'Missing Authorization header') {
          return { success: false, error: 'Please sign in again.', errorCode: 'unauthorized' };
        }

        return {
          success: false,
          error: parsed?.error || error.message || 'Could not save location',
          errorCode: 'server_error',
        };
      }

      const payload = data as CaptureLocationResult;
      if (!payload?.success) {
        return {
          success: false,
          error: payload?.error || 'Could not save location',
          errorCode: (payload?.errorCode as any) || 'server_error',
        };
      }

      return payload;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: msg, errorCode: 'server_error' };
    }
  }

  /**
   * Fetch the user's IP country for display purposes only.
   * Never used for decisions on the client — the edge function
   * always re-checks on the server.
   */
  async getIpSignal() {
    return getIpGeolocation();
  }
}

export const locationService = new LocationService();