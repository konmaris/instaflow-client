import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useRestaurant } from "../store/restaurant";
import { useCart } from "../store/cart";
import { usePublicTables } from "../hooks/useMenu";
import { usePlaceOrder } from "../hooks/usePlaceOrder";
import { useCreatePaymentIntent } from "../hooks/usePaymentIntent";
import { CardPayment } from "../components/CardPayment";

type Mode = "delivery" | "dine_in" | "pickup";

export function Checkout() {
  const { restaurant } = useRestaurant();
  const cart = useCart();
  const navigate = useNavigate();
  const place = usePlaceOrder();
  const { data: tables = [] } = usePublicTables(restaurant?.id ?? null);

  const availableModes: Mode[] = [];
  if (restaurant?.delivery_enabled) availableModes.push("delivery");
  if (restaurant?.tables_enabled) availableModes.push("dine_in");
  if (restaurant?.pickup_enabled) availableModes.push("pickup");

  const [mode, setMode] = useState<Mode>(availableModes[0] ?? "pickup");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [tableId, setTableId] = useState("");
  const [payment, setPayment] = useState<"cash" | "card">("cash");
  const [error, setError] = useState<string | null>(null);
  // Card flow: once an order + PaymentIntent exist, switch to the card form.
  const [pay, setPay] = useState<{
    orderId: string;
    clientSecret: string;
    accountId: string;
  } | null>(null);
  const createIntent = useCreatePaymentIntent();

  if (!restaurant) return null;
  if (cart.items.length === 0)
    return (
      <div className="p-8 text-center text-gray-500">
        Your cart is empty. <Link to="/" className="text-black underline">Back to menu</Link>
      </div>
    );

  // Card is only offered when the restaurant enabled online payments AND has
  // finished Stripe onboarding (charges_enabled).
  const canPayCard = restaurant.online_payments && restaurant.stripe_charges_enabled;

  const deliveryFee = mode === "delivery" ? 2.5 : 0;
  const total = cart.subtotal() + deliveryFee;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (payment === "card" && !canPayCard) {
      setError("Card payments are not available for this restaurant yet.");
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
        deliveryAddress: mode === "delivery" ? address : undefined,
        tableId: mode === "dine_in" ? tableId || null : null,
        deliveryFee,
      });

      if (payment === "card") {
        // Create a PaymentIntent on the restaurant's connected account, then
        // show the Stripe card form. Cart is cleared only after payment succeeds.
        const intent = await createIntent.mutateAsync({ order_id: order.id });
        setPay({
          orderId: order.id,
          clientSecret: intent.client_secret,
          accountId: intent.account_id,
        });
        return;
      }

      cart.clear();
      navigate(`/track/${order.id}`);
    } catch (err) {
      setError(String(err));
    }
  };

  // Card payment step.
  if (pay)
    return (
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <h1 className="text-xl font-bold">Pay by card</h1>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <CardPayment
            clientSecret={pay.clientSecret}
            accountId={pay.accountId}
            amountLabel={`€${total.toFixed(2)}`}
            brandColor={restaurant.brand_color}
            onSuccess={() => {
              cart.clear();
              navigate(`/track/${pay.orderId}`);
            }}
          />
        </div>
        <p className="text-center text-xs text-gray-400">
          Payments are processed securely by Stripe.
        </p>
      </div>
    );

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-4 p-4">
      <Link to="/" className="text-sm text-gray-500">← Menu</Link>
      <h1 className="text-xl font-bold">Checkout</h1>

      <div className="rounded-lg bg-white p-3 shadow-sm">
        {cart.items.map((i) => (
          <div key={i.product_id} className="flex items-center justify-between py-1 text-sm">
            <span className="flex-1">{i.name}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => cart.setQty(i.product_id, i.quantity - 1)} className="h-6 w-6 rounded bg-gray-100">−</button>
              <span className="w-5 text-center">{i.quantity}</span>
              <button type="button" onClick={() => cart.setQty(i.product_id, i.quantity + 1)} className="h-6 w-6 rounded bg-gray-100">+</button>
            </div>
            <span className="w-16 text-right">€{(i.unit_price * i.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {availableModes.map((m) => (
          <button
            type="button"
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${mode === m ? "text-white" : "bg-white"}`}
            style={mode === m ? { backgroundColor: restaurant.brand_color } : undefined}
          >
            {m === "dine_in" ? "Dine-in" : m === "delivery" ? "Delivery" : "Pickup"}
          </button>
        ))}
      </div>

      <input required placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border-gray-300" />
      <input required placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded border-gray-300" />

      {mode === "delivery" && (
        <input required placeholder="Delivery address" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded border-gray-300" />
      )}
      {mode === "dine_in" && (
        <select required value={tableId} onChange={(e) => setTableId(e.target.value)} className="w-full rounded border-gray-300">
          <option value="">Select your table…</option>
          {tables.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={() => setPayment("cash")} className={`flex-1 rounded-lg py-2 text-sm font-medium ${payment === "cash" ? "bg-black text-white" : "bg-white"}`}>Cash</button>
        <button
          type="button"
          onClick={() => setPayment("card")}
          disabled={!canPayCard}
          className={`flex-1 rounded-lg py-2 text-sm font-medium disabled:opacity-40 ${payment === "card" ? "bg-black text-white" : "bg-white"}`}
        >
          Card {canPayCard ? "" : "(off)"}
        </button>
      </div>

      <div className="space-y-1 rounded-lg bg-white p-3 text-sm shadow-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>€{cart.subtotal().toFixed(2)}</span></div>
        {deliveryFee > 0 && <div className="flex justify-between"><span>Delivery</span><span>€{deliveryFee.toFixed(2)}</span></div>}
        <div className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>€{total.toFixed(2)}</span></div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={place.isPending || createIntent.isPending}
        className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-50"
        style={{ backgroundColor: restaurant.brand_color }}
      >
        {place.isPending || createIntent.isPending
          ? "Please wait…"
          : payment === "card"
            ? `Continue to payment · €${total.toFixed(2)}`
            : `Place order · €${total.toFixed(2)}`}
      </button>
    </form>
  );
}
