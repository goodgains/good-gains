import Stripe from "stripe";
import { getBaseUrl } from "@/lib/base-url";

let stripeInstance: Stripe | null = null;

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil"
    });
  }

  return stripeInstance;
}

export { getBaseUrl };
