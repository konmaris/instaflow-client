import { useParams, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useOrderTracking } from "../hooks/useOrderTracking";
import { useRestaurant } from "../store/restaurant";

const STEPS = [
  { key: "pending", label: "Received" },
  { key: "accepted", label: "Accepted" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "out_for_delivery", label: "On the way" },
  { key: "delivered", label: "Delivered" },
];

const riderIcon = new Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ff5722"/><path d="M7 14l5-7 5 7" stroke="#fff" stroke-width="2" fill="none"/></svg>`,
    ),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export function Track() {
  const { orderId } = useParams();
  const { restaurant } = useRestaurant();
  const { order, rider } = useOrderTracking(orderId ?? null);

  if (!order) return <p className="p-8 text-center text-gray-500">Loading order…</p>;

  const currentIdx = STEPS.findIndex((s) => s.key === order.status);
  const isDelivery = order.type === "delivery";
  const showMap = isDelivery && restaurant?.live_tracking && rider;

  // Rough ETA from the rider's live position to the delivery address. Straight-
  // line (haversine) distance over an assumed ~20 km/h urban speed; good enough
  // for a "~X min away" hint without a routing API.
  const eta =
    rider && order.delivery_lat != null && order.delivery_lng != null
      ? estimateEta(rider.lat, rider.lng, order.delivery_lat, order.delivery_lng)
      : null;

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <Link to="/" className="text-sm text-gray-500">← Menu</Link>
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <h1 className="text-xl font-bold">Order #{order.order_number}</h1>
        <p className="text-sm text-gray-500">
          {order.type === "delivery" ? "Delivery" : order.type === "dine_in" ? "Dine-in" : "Pickup"}{" "}
          · €{Number(order.total).toFixed(2)} · {order.payment_method}
        </p>
      </div>

      {/* Status timeline */}
      <ol className="rounded-lg bg-white p-4 shadow-sm">
        {STEPS.filter((s) => isDelivery || !["out_for_delivery", "delivered"].includes(s.key)).map(
          (s, i) => {
            const done = currentIdx >= STEPS.findIndex((x) => x.key === s.key);
            return (
              <li key={s.key} className="flex items-center gap-3 py-1">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    done ? "text-white" : "bg-gray-200 text-gray-400"
                  }`}
                  style={done ? { backgroundColor: restaurant?.brand_color ?? "#111" } : undefined}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span className={done ? "font-medium" : "text-gray-400"}>{s.label}</span>
              </li>
            );
          },
        )}
        {(order.status === "cancelled" || order.status === "rejected") && (
          <li className="pt-2 font-medium text-red-600">Order {order.status}</li>
        )}
      </ol>

      {showMap && eta && order.status === "out_for_delivery" && (
        <div
          className="rounded-lg p-3 text-center text-white shadow-sm"
          style={{ backgroundColor: restaurant?.brand_color ?? "#111" }}
        >
          <span className="text-lg font-semibold">~{eta.minutes} min away</span>
          <span className="ml-2 text-sm opacity-90">({eta.km.toFixed(1)} km)</span>
        </div>
      )}

      {showMap && rider && (
        <div className="overflow-hidden rounded-lg shadow-sm">
          <MapContainer
            center={[rider.lat, rider.lng]}
            zoom={15}
            style={{ height: 320, width: "100%" }}
            key={`${rider.lat},${rider.lng}`}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[rider.lat, rider.lng]} icon={riderIcon}>
              <Popup>Your rider is here</Popup>
            </Marker>
          </MapContainer>
        </div>
      )}
      {isDelivery && restaurant?.live_tracking && !rider && (
        <p className="rounded-lg bg-white p-3 text-center text-sm text-gray-500 shadow-sm">
          Live location appears once a rider picks up your order.
        </p>
      )}
    </div>
  );
}

/** Haversine distance + a coarse ETA at ~20 km/h, floored at 2 minutes. */
function estimateEta(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371; // km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const minutes = Math.max(2, Math.round((km / 20) * 60));
  return { km, minutes };
}
