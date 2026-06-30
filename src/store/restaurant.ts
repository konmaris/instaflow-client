import { create } from "zustand";
import { resolveSlug, fetchRestaurant, type PublicRestaurant } from "../lib/restaurant";

interface RestaurantState {
  restaurant: PublicRestaurant | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
}

/** Resolves and holds the current restaurant (by subdomain) for the portal. */
export const useRestaurant = create<RestaurantState>((set) => ({
  restaurant: null,
  loading: true,
  error: null,
  load: async () => {
    const slug = resolveSlug();
    if (!slug) {
      set({ loading: false, error: "No restaurant specified." });
      return;
    }
    try {
      const r = await fetchRestaurant(slug);
      if (!r) set({ loading: false, error: `Restaurant '${slug}' not found.` });
      else set({ restaurant: r, loading: false, error: null });
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  },
}));
