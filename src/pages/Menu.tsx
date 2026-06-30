import { useState } from "react";
import { Link } from "react-router-dom";
import { useRestaurant } from "../store/restaurant";
import { useMenu } from "../hooks/useMenu";
import { useCart } from "../store/cart";

export function Menu() {
  const { restaurant } = useRestaurant();
  const { data, isLoading } = useMenu(restaurant?.id ?? null);
  const cart = useCart();
  const [activeCat, setActiveCat] = useState<string | null>(null);

  if (!restaurant) return null;
  if (isLoading) return <p className="p-4 text-gray-500">Loading menu…</p>;

  const categories = data?.categories ?? [];
  const products = (data?.products ?? []).filter(
    (p) => !activeCat || p.category_id === activeCat,
  );

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24">
      <header className="mb-4 flex items-center gap-3">
        {restaurant.logo_url && (
          <img src={restaurant.logo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
        )}
        <h1 className="text-2xl font-bold">{restaurant.name}</h1>
      </header>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveCat(null)}
          className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${!activeCat ? "bg-black text-white" : "bg-white"}`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCat(c.id)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${activeCat === c.id ? "bg-black text-white" : "bg-white"}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {products.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
            {p.image_url && (
              <img src={p.image_url} alt="" className="h-16 w-16 rounded object-cover" />
            )}
            <div className="flex-1">
              <div className="font-medium">{p.name}</div>
              {p.description && (
                <div className="text-sm text-gray-500">{p.description}</div>
              )}
              <div className="text-sm font-semibold">€{Number(p.price).toFixed(2)}</div>
            </div>
            <button
              onClick={() =>
                cart.add({ product_id: p.id, name: p.name, unit_price: Number(p.price) })
              }
              className="rounded-full bg-black px-3 py-1 text-sm font-medium text-white"
              style={{ backgroundColor: restaurant.brand_color }}
            >
              Add
            </button>
          </li>
        ))}
        {products.length === 0 && (
          <li className="py-8 text-center text-gray-400">No items.</li>
        )}
      </ul>

      {cart.count() > 0 && (
        <Link
          to="/checkout"
          className="fixed inset-x-0 bottom-0 mx-auto flex max-w-2xl items-center justify-between p-4"
        >
          <span
            className="flex w-full items-center justify-between rounded-xl px-5 py-3 font-semibold text-white shadow-lg"
            style={{ backgroundColor: restaurant.brand_color }}
          >
            <span>{cart.count()} items</span>
            <span>Checkout · €{cart.subtotal().toFixed(2)}</span>
          </span>
        </Link>
      )}
    </div>
  );
}
