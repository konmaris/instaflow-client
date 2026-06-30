import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  throw new Error(
    "Missing Supabase env vars. Copy .env.example to .env and fill them in.",
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// Handy row-type aliases pulled straight from the generated schema types.
type Tables = Database["public"]["Tables"];
export type Order = Tables["orders"]["Row"];
export type OrderItem = Tables["order_items"]["Row"];
export type Product = Tables["products"]["Row"];
export type Category = Tables["categories"]["Row"];
export type Profile = Tables["profiles"]["Row"];
export type RestaurantTable = Tables["restaurant_tables"]["Row"];
export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type OrderType = Database["public"]["Enums"]["order_type"];
