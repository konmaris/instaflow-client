import { useMutation } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { CartItem } from "../store/cart";

export interface PlaceOrderInput {
  restaurantId: string;
  type: "delivery" | "dine_in" | "pickup";
  paymentMethod: "card" | "cash";
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  deliveryArea?: string;
  deliveryCity?: string;
  deliveryPostalCode?: string;
  deliveryFloor?: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  tableId?: string | null;
  deliveryFee?: number;
  notes?: string;
}

/**
 * Places a customer order from the public portal (channel = client_web).
 * order_number / subtotal / total are filled by DB triggers. For card payments
 * the caller should first obtain a Stripe PaymentIntent via the
 * `create-payment-intent` Edge Function and confirm it; this just records the
 * order. Cash orders are placed directly as unpaid.
 */
export function usePlaceOrder() {
  return useMutation({
    mutationFn: async (input: PlaceOrderInput): Promise<{ id: string; order_number: number }> => {
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          restaurant_id: input.restaurantId,
          order_number: 0, // sentinel; trigger assigns real number
          channel: "client_web",
          type: input.type,
          status: "pending",
          payment_method: input.paymentMethod,
          payment_status: "unpaid",
          customer_name: input.customerName,
          customer_phone: input.customerPhone,
          table_id: input.tableId ?? null,
          delivery_address: input.deliveryAddress || null,
          delivery_area: input.deliveryArea || null,
          delivery_city: input.deliveryCity || null,
          delivery_postal_code: input.deliveryPostalCode || null,
          delivery_floor: input.deliveryFloor || null,
          // PostGIS geography as EWKT (lng lat). delivery_lat/lng generated cols
          // derive from this and power the rider map + customer ETA.
          delivery_location:
            input.deliveryLat != null && input.deliveryLng != null
              ? `SRID=4326;POINT(${input.deliveryLng} ${input.deliveryLat})`
              : null,
          delivery_fee: input.deliveryFee ?? 0,
          notes: input.notes || null,
          placed_at: new Date().toISOString(),
        })
        .select("id, order_number")
        .single();
      if (error) throw error;

      const items = input.items.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        name: i.name,
        unit_price: i.unit_price,
        quantity: i.quantity,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(items);
      if (itemsErr) throw itemsErr;

      return order as { id: string; order_number: number };
    },
  });
}
