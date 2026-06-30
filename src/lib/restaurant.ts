import { supabase } from "./supabase";

export interface PublicRestaurant {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  brand_color: string;
  currency: string;
  timezone: string;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  tables_enabled: boolean;
  online_payments: boolean;
  live_tracking: boolean;
}

/**
 * Work out which restaurant this page is for. In production each restaurant is a
 * subdomain (demoresto.instaflow.gr → 'demoresto'). For local dev, fall back to
 * a ?slug= query param, then VITE_DEFAULT_SLUG.
 */
export function resolveSlug(): string | null {
  const params = new URLSearchParams(window.location.search);
  const qp = params.get("slug");
  if (qp) return qp;

  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
  if (!isLocal) {
    const parts = host.split(".");
    // <slug>.instaflow.gr -> 3+ labels; ignore bare apex / www
    if (parts.length >= 3 && parts[0] !== "www") return parts[0];
  }
  return (import.meta.env.VITE_DEFAULT_SLUG as string) || null;
}

export async function fetchRestaurant(slug: string): Promise<PublicRestaurant | null> {
  const { data, error } = await supabase.rpc("get_restaurant_by_slug", { p_slug: slug });
  if (error) throw error;
  return (data?.[0] as PublicRestaurant) ?? null;
}
