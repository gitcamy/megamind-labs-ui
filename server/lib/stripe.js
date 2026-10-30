import Stripe from "stripe";
import { db } from "./http.js";
import { planFromPrice } from "./plans.js";

let client = null;
export const stripe = () => (client ??= new Stripe(process.env.STRIPE_SECRET_KEY));

export async function customerFor(user, profile) {
  if (profile.stripe_customer_id) return profile.stripe_customer_id;
  const customer = await stripe().customers.create({ email: user.email, metadata: { user_id: user.id } });
  await db().from("profiles").update({ stripe_customer_id: customer.id }).eq("id", user.id);
  return customer.id;
}

// Copies a subscription's state onto the profile. Anything but active or trialing drops back to free.
export async function syncSubscription(sub) {
  const item = sub.items?.data?.[0];
  const live = ["active", "trialing"].includes(sub.status);
  const plan = live ? planFromPrice(item?.price?.id) ?? "free" : "free";
  const start = item?.current_period_start ?? sub.current_period_start;
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const update = {
    plan,
    stripe_subscription_id: sub.id,
    subscription_status: sub.status,
    period_start: start ? new Date(start * 1000).toISOString() : null,
  };
  const { data } = await db().from("profiles").update(update).eq("stripe_customer_id", customer).select("id");
  if (!data?.length && sub.metadata?.user_id) {
    await db().from("profiles").update({ ...update, stripe_customer_id: customer }).eq("id", sub.metadata.user_id);
  }
}
