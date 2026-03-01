/**
 * Geocoding utility — converts GPS coordinates into a human-readable
 * street / neighborhood name using the Google Maps Geocoding API.
 *
 * The API key is EXPO_PUBLIC_GOOGLE_MAPS_API_KEY (client-side safe).
 */

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

/** Result returned by reverseGeocode */
export interface GeocodingResult {
  streetName: string;    // e.g. "Market Street, San Francisco"
  city: string;          // e.g. "San Francisco"
  neighborhood: string;  // e.g. "Castro" (may equal city if unavailable)
}

/**
 * Reverse-geocode a lat/lng pair.
 * Returns a structured result with the best available street, city,
 * and neighborhood names.  Falls back to coordinate strings on error.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult> {
  // Fallback in case geocoding fails
  const fallback: GeocodingResult = {
    streetName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    city: 'Unknown City',
    neighborhood: 'Unknown Area',
  };

  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('[geocoding] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not set');
    return fallback;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results?.length) {
      console.warn('[geocoding] Unexpected status:', data.status);
      return fallback;
    }

    // Pick the most specific result (first result is usually most precise)
    const result = data.results[0];
    const components: { types: string[]; long_name: string }[] = result.address_components;

    // Extract individual components by type
    const getComponent = (type: string): string =>
      components.find((c) => c.types.includes(type))?.long_name ?? '';

    const streetNumber = getComponent('street_number');
    const route = getComponent('route');                       // Street name
    const neighborhood =
      getComponent('neighborhood') ||
      getComponent('sublocality') ||
      getComponent('sublocality_level_1');
    const city =
      getComponent('locality') ||
      getComponent('administrative_area_level_2');
    const state = getComponent('administrative_area_level_1');

    // Build a human-readable street name: "Market Street, San Francisco"
    const street = route ? (streetNumber ? `${streetNumber} ${route}` : route) : '';
    const streetName = [street, city, state].filter(Boolean).join(', ') || result.formatted_address;

    return {
      streetName,
      city: city || fallback.city,
      neighborhood: neighborhood || city || fallback.neighborhood,
    };
  } catch (err) {
    console.error('[geocoding] reverseGeocode error:', err);
    return fallback;
  }
}
