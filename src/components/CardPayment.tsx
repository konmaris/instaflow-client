import { useMemo, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;

// Cache one Stripe.js instance per connected account. For DIRECT charges Stripe
// must be initialised with the restaurant's connected account (stripeAccount).
const stripeCache = new Map<string, Promise<Stripe | null>>();
function getStripe(accountId: string) {
  if (!stripeCache.has(accountId)) {
    stripeCache.set(accountId, loadStripe(PUBLISHABLE_KEY, { stripeAccount: accountId }));
  }
  return stripeCache.get(accountId)!;
}

function PayForm({
  amountLabel,
  brandColor,
  onSuccess,
}: {
  amountLabel: string;
  brandColor: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (error) {
      setError(error.message ?? "Payment failed");
      setBusy(false);
      return;
    }
    // Success: the stripe-webhook finalises the order server-side.
    onSuccess();
  };

  return (
    <form onSubmit={pay} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || busy}
        className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-50"
        style={{ backgroundColor: brandColor }}
      >
        {busy ? "Processing…" : `Pay ${amountLabel}`}
      </button>
    </form>
  );
}

export function CardPayment({
  clientSecret,
  accountId,
  amountLabel,
  brandColor,
  onSuccess,
}: {
  clientSecret: string;
  accountId: string;
  amountLabel: string;
  brandColor: string;
  onSuccess: () => void;
}) {
  const stripePromise = useMemo(() => getStripe(accountId), [accountId]);

  if (!PUBLISHABLE_KEY)
    return <p className="text-sm text-red-600">Stripe publishable key not configured.</p>;

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: { theme: "stripe" } }}
    >
      <PayForm amountLabel={amountLabel} brandColor={brandColor} onSuccess={onSuccess} />
    </Elements>
  );
}
