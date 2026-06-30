import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  product_id: string;
  name: string;
  unit_price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;
}

/** Customer cart, persisted to localStorage so a refresh doesn't lose it. */
export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((s) => {
          const ex = s.items.find((i) => i.product_id === item.product_id);
          if (ex)
            return {
              items: s.items.map((i) =>
                i.product_id === item.product_id ? { ...i, quantity: i.quantity + 1 } : i,
              ),
            };
          return { items: [...s.items, { ...item, quantity: 1 }] };
        }),
      setQty: (productId, qty) =>
        set((s) => ({
          items: s.items
            .map((i) => (i.product_id === productId ? { ...i, quantity: qty } : i))
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
      subtotal: () => get().items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: "instaflow-cart" },
  ),
);
