import { useEffect, useState } from "react";
import { supabase, type Order } from "../lib/supabase";

export interface RiderPosition {
  lat: number;
  lng: number;
  updated_at: string;
}

/**
 * Tracks an order's status and (for deliveries) the rider's live position.
 * Subscribes to Realtime changes on `orders` and `rider_current_location`.
 * Positions use the generated lat/lng columns (PostGIS geography is returned as
 * WKB hex over the API, which the browser can't read directly).
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
          .select("lat, lng, updated_at")
          .eq("rider_id", data.assigned_rider_id)
          .maybeSingle();
        if (active && loc?.lat != null && loc?.lng != null) {
          setRider({ lat: loc.lat, lng: loc.lng, updated_at: loc.updated_at as string });
        }
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
          const row = payload.new as { lat?: number; lng?: number; updated_at?: string };
          if (row.lat != null && row.lng != null) {
            setRider({ lat: row.lat, lng: row.lng, updated_at: row.updated_at ?? new Date().toISOString() });
          }
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
