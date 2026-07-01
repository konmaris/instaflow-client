import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { useRestaurant } from "../store/restaurant";
import { useMenu } from "../hooks/useMenu";
import { useCart } from "../store/cart";

export function Menu() {
  const { restaurant } = useRestaurant();
  const { data, isLoading } = useMenu(restaurant?.id ?? null);
  const cart = useCart();
  const [activeCat, setActiveCat] = useState<string | null>(null);

  if (!restaurant) return null;
  const brand = restaurant.brand_color;

  const categories = data?.categories ?? [];
  const products = (data?.products ?? []).filter((p) => !activeCat || p.category_id === activeCat);

  return (
    <div className="mx-auto max-w-2xl pb-28">
      {/* Hero */}
      <div className="relative px-5 pb-5 pt-10 text-white" style={{ background: `linear-gradient(135deg, ${brand}, ${brand}cc)` }}>
        <div className="flex items-center gap-3">
          {restaurant.logo_url ? (
            <img src={restaurant.logo_url} alt="" className="h-14 w-14 rounded-2xl border-2 border-white/40 object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
              <UtensilsCrossed className="h-7 w-7" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold">{restaurant.name}</h1>
            <p className="text-sm text-white/80">Order online</p>
          </div>
        </div>
      </div>

      {/* Sticky category chips */}
      <div className="sticky top-0 z-10 border-b bg-white/95 px-3 py-2 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto">
          <Chip active={!activeCat} onClick={() => setActiveCat(null)} brand={brand}>All</Chip>
          {categories.map((c) => (
            <Chip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)} brand={brand}>
              {c.name}
            </Chip>
          ))}
        </div>
      </div>

      {/* Products */}
      {isLoading ? (
        <div className="space-y-3 p-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <ul className="space-y-3 p-4">
          {products.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
              {p.image_url ? (
                <img src={p.image_url} alt="" className="h-20 w-20 flex-shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
                  <UtensilsCrossed className="h-7 w-7 text-gray-300" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{p.name}</div>
                {p.description && <div className="line-clamp-2 text-sm text-gray-500">{p.description}</div>}
                <div className="mt-1 font-bold" style={{ color: brand }}>€{Number(p.price).toFixed(2)}</div>
              </div>
              <button
                onClick={() => cart.add({ product_id: p.id, name: p.name, unit_price: Number(p.price) })}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white shadow-md active:scale-95"
                style={{ backgroundColor: brand }}
                aria-label={`Add ${p.name}`}
              >
                <Plus className="h-5 w-5" />
              </button>
            </li>
          ))}
          {products.length === 0 && <li className="py-12 text-center text-gray-400">No items available.</li>}
        </ul>
      )}

      {/* Floating cart bar */}
      {cart.count() > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-2xl p-3">
          <Link
            to="/checkout"
            className="flex items-center justify-between rounded-2xl px-5 py-3.5 font-semibold text-white shadow-xl active:scale-[0.99]"
            style={{ backgroundColor: brand }}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              {cart.count()} {cart.count() === 1 ? "item" : "items"}
            </span>
            <span>Checkout · €{cart.subtotal().toFixed(2)}</span>
          </Link>
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, brand, children }: { active: boolean; onClick: () => void; brand: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${active ? "text-white" : "bg-gray-100 text-gray-600"}`}
      style={active ? { backgroundColor: brand } : undefined}
    >
      {children}
    </button>
  );
}
