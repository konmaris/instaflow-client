// Thin wrapper over OpenStreetMap Nominatim for address search + reverse geocode.
// Free & keyless (rate-limited ~1 req/s) — fine for now; swap for a paid provider
// (Google/Mapbox) at scale. Browsers send a Referer which satisfies the usage policy.

export interface GeoAddress {
  label: string; // street + number
  area: string; // neighbourhood / suburb
  city: string;
  postalCode: string;
  lat: number;
  lng: number;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string>;
}

function toAddress(r: NominatimResult): GeoAddress {
  const a = r.address ?? {};
  const street = [a.road, a.house_number].filter(Boolean).join(" ");
  return {
    label: street || r.display_name.split(",").slice(0, 2).join(", "),
    area: a.neighbourhood || a.suburb || a.city_district || a.quarter || "",
    city: a.city || a.town || a.village || a.municipality || "",
    postalCode: a.postcode || "",
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  };
}

export async function searchAddress(query: string, countryCodes = "gr"): Promise<GeoAddress[]> {
  if (query.trim().length < 3) return [];
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    limit: "6",
    countrycodes: countryCodes,
    q: query,
  }).toString();
  const res = await fetch(url, { headers: { "Accept-Language": "el,en" } });
  if (!res.ok) return [];
  const data = (await res.json()) as NominatimResult[];
  return data.map(toAddress);
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoAddress | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.search = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    lat: String(lat),
    lon: String(lng),
  }).toString();
  const res = await fetch(url, { headers: { "Accept-Language": "el,en" } });
  if (!res.ok) return null;
  const r = (await res.json()) as NominatimResult;
  return toAddress({ ...r, lat: String(lat), lon: String(lng) });
}
