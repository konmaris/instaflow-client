import { useEffect, useState } from "react";
import { supabase, type Order } from "../lib/supabase";

export interface RiderPosition {
  lat: number;
  lng: number;
  updated_at: string;
}

/** Parse a PostGIS geography point returned as GeoJSON ({type, coordinates}). */
function parsePoint(geo: unknown): RiderPosition | null {
  if (!geo || typeof geo !== "object") return null;
  const g = geo as { coordinates?: [number, number] };
  if (!g.coordinates) return null;
  const [lng, lat] = g.coordinates;
  return { lat, lng, updated_at: new Date().toISOString() };
}

/**
 * Tracks an order's status and (for deliveries) the rider's live position.
 * Subscribes to Realtime changes on `orders` and `rider_current_location`.
 */
export function useOrderTracking(orderId: string | null) {
  const [order, setOrder] = useState<Order | null>(null);
  const [rider, setRider] = useState<RiderPosition | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();
      if (active) setOrder(data ?? null);

      // initial rider position if assigned
      if (data?.assigned_rider_id) {
        const { data: loc } = await supabase
          .from("rider_current_location")
          .select("location, updated_at")
          .eq("rider_id", data.assigned_rider_id)
          .maybeSingle();
        const p = parsePoint(loc?.location);
        if (active && p) setRider({ ...p, updated_at: loc!.updated_at as string });
      }
    };
    load();

    const orderCh = supabase
      .channel(`track-order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => setOrder(payload.new as Order),
      )
      .subscribe();

    const riderCh = supabase
      .channel(`track-rider-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rider_current_location",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const row = payload.new as { location?: unknown; updated_at?: string };
          const p = parsePoint(row.location);
          if (p) setRider({ ...p, updated_at: row.updated_at ?? p.updated_at });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(orderCh);
      supabase.removeChannel(riderCh);
    };
  }, [orderId]);

  return { order, rider };
}
