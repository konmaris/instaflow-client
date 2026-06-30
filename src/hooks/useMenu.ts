import { useQuery } from "@tanstack/react-query";
import { supabase, type Category, type Product } from "../lib/supabase";

/** Public menu for a restaurant: active categories + available products. */
export function useMenu(restaurantId: string | null) {
  return useQuery({
    queryKey: ["menu", restaurantId],
    enabled: !!restaurantId,
    queryFn: async (): Promise<{ categories: Category[]; products: Product[] }> => {
      const [cats, prods] = await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .eq("restaurant_id", restaurantId!)
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("products")
          .select("*")
          .eq("restaurant_id", restaurantId!)
          .eq("is_active", true)
          .eq("is_available", true)
          .order("sort_order"),
      ]);
      if (cats.error) throw cats.error;
      if (prods.error) throw prods.error;
      return { categories: cats.data ?? [], products: prods.data ?? [] };
    },
  });
}

/** Tables for QR / dine-in selection. */
export function usePublicTables(restaurantId: string | null) {
  return useQuery({
    queryKey: ["public-tables", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("id,label")
        .eq("restaurant_id", restaurantId!)
        .eq("is_active", true)
        .order("label");
      if (error) throw error;
      return data ?? [];
    },
  });
}
