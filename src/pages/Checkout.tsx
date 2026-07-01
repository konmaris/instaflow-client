import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Bike, UtensilsCrossed, ShoppingBag, Banknote, CreditCard, ChevronLeft, Minus, Plus } from "lucide-react";
import { useRestaurant } from "../store/restaurant";
import { useCart } from "../store/cart";
import { usePublicTables } from "../hooks/useMenu";
import { usePlaceOrder } from "../hooks/usePlaceOrder";
import { useCreatePaymentIntent } from "../hooks/usePaymentIntent";
import { CardPayment } from "../components/CardPayment";
import { AddressPicker, emptyAddress, type AddressValue } from "../components/AddressPicker";

type Mode = "delivery" | "dine_in" | "pickup";

const MODE_META: Record<Mode, { label: string; Icon: typeof Bike }> = {
  delivery: { label: "Delivery", Icon: Bike },
  dine_in: { label: "Dine-in", Icon: UtensilsCrossed },
  pickup: { label: "Pickup", Icon: ShoppingBag },
};

export function Checkout() {
  const { restaurant } = useRestaurant();
  const cart = useCart();
  const navigate = useNavigate();
  const place = usePlaceOrder();
  const createIntent = useCreatePaymentIntent();
  const { data: tables = [] } = usePublicTables(restaurant?.id ?? null);

  const availableModes: Mode[] = [];
  if (restaurant?.delivery_enabled) availableModes.push("delivery");
  if (restaurant?.tables_enabled) availableModes.push("dine_in");
  if (restaurant?.pickup_enabled) availableModes.push("pickup");

  const [mode, setMode] = useState<Mode>(availableModes[0] ?? "pickup");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<AddressValue>(emptyAddress);
  const [floor, setFloor] = useState("");
  const [tableId, setTableId] = useState("");
  const [payment, setPayment] = useState<"cash" | "card">("cash");
  const [error, setError] = useState<string | null>(null);
  const [pay, setPay] = useState<{ orderId: string; clientSecret: string; accountId: string } | null>(null);

  if (!restaurant) return null;

  const brand = restaurant.brand_color;
  const canPayCard = restaurant.online_payments && restaurant.stripe_charges_enabled;
  const deliveryFee = mode === "delivery" ? 2.5 : 0;
  const total = cart.subtotal() + deliveryFee;

  if (cart.items.length === 0)
    return (
      <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center gap-3 p-8 text-center">
        <ShoppingBag className="h-10 w-10 text-gray-300" />
        <p className="text-gray-500">Your cart is empty.</p>
        <Link to="/" className="font-semibold" style={{ color: brand }}>
          Back to menu
        </Link>
      </div>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (payment === "card" && !canPayCard) {
      setError("Card payments are not available for this restaurant yet.");
      return;
    }
    if (mode === "delivery" && (address.lat == null || address.lng == null)) {
      setError("Please pick your delivery address from the search or map.");
      return;
    }
    try {
      const order = await place.mutateAsync({
        restaurantId: restaurant.id,
        type: mode,
        paymentMethod: payment,
        items: cart.items,
        customerName: name,
        customerPhone: phone,
        deliveryAddress: mode === "delivery" ? address.label : undefined,
        deliveryArea: mode === "delivery" ? address.area : undefined,
        deliveryCity: mode === "delivery" ? address.city : undefined,
        deliveryPostalCode: mode === "delivery" ? address.postalCode : undefined,
        deliveryFloor: mode === "delivery" ? floor : undefined,
        deliveryLat: mode === "delivery" ? address.lat : undefined,
        deliveryLng: mode === "delivery" ? address.lng : undefined,
        tableId: mode === "dine_in" ? tableId || null : null,
        deliveryFee,
      });

      if (payment === "card") {
        const intent = await createIntent.mutateAsync({ order_id: order.id });
        setPay({ orderId: order.id, clientSecret: intent.client_secret, accountId: intent.account_id });
        return;
      }
      cart.clear();
      navigate(`/track/${order.id}`);
    } catch (err) {
      setError(String(err));
    }
  };

  if (pay)
    return (
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <h1 className="text-xl font-bold">Pay by card</h1>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <CardPayment
            clientSecret={pay.clientSecret}
            accountId={pay.accountId}
            amountLabel={`€${total.toFixed(2)}`}
            brandColor={brand}
            onSuccess={() => {
              cart.clear();
              navigate(`/track/${pay.orderId}`);
            }}
          />
        </div>
        <p className="text-center text-xs text-gray-400">Payments are secured by Stripe.</p>
      </div>
    );

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-4 p-4 pb-28">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-500">
        <ChevronLeft className="h-4 w-4" /> Menu
      </Link>
      <h1 className="text-2xl font-bold">Checkout</h1>

      {/* Order summary */}
      <Section title="Your order">
        {cart.items.map((i) => (
          <div key={i.product_id} className="flex items-center justify-between py-1.5">
            <span className="flex-1 text-sm">{i.name}</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => cart.setQty(i.product_id, i.quantity - 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-5 text-center text-sm font-medium">{i.quantity}</span>
              <button type="button" onClick={() => cart.setQty(i.product_id, i.quantity + 1)} className="flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ backgroundColor: brand }}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <span className="w-16 text-right text-sm font-medium">€{(i.unit_price * i.quantity).toFixed(2)}</span>
          </div>
        ))}
      </Section>

      {/* Fulfilment type */}
      <div className="grid grid-cols-3 gap-2">
        {availableModes.map((m) => {
          const { label, Icon } = MODE_META[m];
          const on = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex flex-col items-center gap-1 rounded-2xl border-2 py-3 text-sm font-medium transition ${on ? "text-white" : "border-transparent bg-white text-gray-600"}`}
              style={on ? { backgroundColor: brand, borderColor: brand } : undefined}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Contact */}
      <Section title="Your details">
        <input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="mb-2 w-full rounded-lg border-gray-300 text-sm" />
        <input required placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border-gray-300 text-sm" />
      </Section>

      {mode === "delivery" && (
        <Section title="Delivery address">
          <AddressPicker value={address} onChange={setAddress} />
          <input
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            placeholder="Floor / doorbell / notes"
            className="mt-2 w-full rounded-lg border-gray-300 text-sm"
          />
        </Section>
      )}

      {mode === "dine_in" && (
        <Section title="Your table">
          <select required value={tableId} onChange={(e) => setTableId(e.target.value)} className="w-full rounded-lg border-gray-300 text-sm">
            <option value="">Select your table…</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </Section>
      )}

      {/* Payment */}
      <div className="grid grid-cols-2 gap-2">
        <PayOption active={payment === "cash"} onClick={() => setPayment("cash")} brand={brand} Icon={Banknote} label="Cash" />
        <PayOption active={payment === "card"} onClick={() => canPayCard && setPayment("card")} brand={brand} Icon={CreditCard} label={canPayCard ? "Card" : "Card (off)"} disabled={!canPayCard} />
      </div>

      {/* Totals */}
      <Section>
        <Line label="Subtotal" value={cart.subtotal()} />
        {deliveryFee > 0 && <Line label="Delivery" value={deliveryFee} />}
        <div className="mt-1 flex justify-between border-t pt-2 text-base font-bold">
          <span>Total</span>
          <span>€{total.toFixed(2)}</span>
        </div>
      </Section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Sticky place button */}
      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-xl border-t bg-white/90 p-3 backdrop-blur">
        <button
          type="submit"
          disabled={place.isPending || createIntent.isPending}
          className="w-full rounded-2xl py-3.5 font-semibold text-white shadow-lg disabled:opacity-50"
          style={{ backgroundColor: brand }}
        >
          {place.isPending || createIntent.isPending
            ? "Please wait…"
            : payment === "card"
              ? `Continue to payment · €${total.toFixed(2)}`
              : `Place order · €${total.toFixed(2)}`}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      {title && <h2 className="mb-2 text-sm font-semibold text-gray-700">{title}</h2>}
      {children}
    </div>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-sm text-gray-600">
      <span>{label}</span>
      <span>€{value.toFixed(2)}</span>
    </div>
  );
}

function PayOption({
  active, onClick, brand, Icon, label, disabled,
}: {
  active: boolean; onClick: () => void; brand: string; Icon: typeof Banknote; label: string; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-3 text-sm font-medium disabled:opacity-40 ${active ? "text-white" : "border-transparent bg-white text-gray-600"}`}
      style={active ? { backgroundColor: brand, borderColor: brand } : undefined}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
