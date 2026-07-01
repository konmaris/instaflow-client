import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { searchAddress, reverseGeocode, type GeoAddress } from "../lib/geocode";

export interface AddressValue {
  label: string;
  area: string;
  city: string;
  postalCode: string;
  lat: number | null;
  lng: number | null;
}

export const emptyAddress: AddressValue = {
  label: "",
  area: "",
  city: "",
  postalCode: "",
  lat: null,
  lng: null,
};

const pin = new Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24"><path d="M12 2c-3.9 0-7 3.1-7 7 0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z" fill="#ff5722"/><circle cx="12" cy="9" r="2.6" fill="#fff"/></svg>`,
    ),
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 16);
  }, [lat, lng, map]);
  return null;
}

export function AddressPicker({
  value,
  onChange,
}: {
  value: AddressValue;
  onChange: (v: AddressValue) => void;
}) {
  const [query, setQuery] = useState(value.label);
  const [results, setResults] = useState<GeoAddress[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Debounced search.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      setResults(await searchAddress(query));
      setLoading(false);
    }, 450);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  const pick = (g: GeoAddress) => {
    onChange({ label: g.label, area: g.area, city: g.city, postalCode: g.postalCode, lat: g.lat, lng: g.lng });
    setQuery(g.label);
    setResults([]);
    setOpen(false);
  };

  const onDragEnd = async (lat: number, lng: number) => {
    const g = await reverseGeocode(lat, lng);
    if (g) onChange({ label: g.label, area: g.area, city: g.city, postalCode: g.postalCode, lat, lng });
    else onChange({ ...value, lat, lng });
  };

  const hasPin = value.lat != null && value.lng != null;

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search your address…"
          className="w-full rounded-lg border-gray-300 text-sm"
          autoComplete="off"
        />
        {open && (results.length > 0 || loading) && (
          <ul className="absolute z-[500] mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            {loading && <li className="px-3 py-2 text-sm text-gray-400">Searching…</li>}
            {results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => pick(r)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <span className="font-medium">{r.label}</span>
                  <span className="block text-xs text-gray-500">
                    {[r.area, r.city, r.postalCode].filter(Boolean).join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {hasPin && (
        <>
          <div className="overflow-hidden rounded-lg" style={{ height: 180 }}>
            <MapContainer center={[value.lat!, value.lng!]} zoom={16} style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM" />
              <Recenter lat={value.lat!} lng={value.lng!} />
              <Marker
                position={[value.lat!, value.lng!]}
                icon={pin}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const p = e.target.getLatLng();
                    onDragEnd(p.lat, p.lng);
                  },
                }}
              />
            </MapContainer>
          </div>
          <p className="text-center text-xs text-gray-400">Drag the pin to the exact spot</p>

          <div className="grid grid-cols-2 gap-2">
            <input
              value={value.area}
              onChange={(e) => onChange({ ...value, area: e.target.value })}
              placeholder="Area"
              className="rounded-lg border-gray-300 text-sm"
            />
            <input
              value={value.postalCode}
              onChange={(e) => onChange({ ...value, postalCode: e.target.value })}
              placeholder="Postal code"
              className="rounded-lg border-gray-300 text-sm"
            />
          </div>
        </>
      )}
    </div>
  );
}
