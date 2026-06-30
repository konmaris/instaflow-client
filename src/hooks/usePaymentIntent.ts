import { useMutation } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export interface PaymentIntentResult {
  client_secret: string;
  payment_intent_id: string;
  account_id: string;
}

/**
 * Asks the create-payment-intent Edge Function for a PaymentIntent on the
 * restaurant's connected account (direct charge). Returns the client_secret to
 * confirm with Stripe.js plus the connected account id Stripe.js must use.
 */
export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: async (input: {
      order_id: string;
      tip?: number;
    }): Promise<PaymentIntentResult> => {
      const { data, error } = await supabase.functions.invoke("create-payment-intent", {
        body: input,
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as PaymentIntentResult;
    },
  });
}
