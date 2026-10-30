// POST /api/stripe-webhook. Point a Stripe webhook here for customer.subscription.created, .updated and .deleted.
import { stripe, syncSubscription } from "../lib/stripe.js";

export async function POST(request) {
  let event;
  try {
    event = await stripe().webhooks.constructEventAsync(
      await request.text(),
      request.headers.get("stripe-signature"),
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return new Response("Bad signature", { status: 400 });
  }

  if (event.type.startsWith("customer.subscription.")) {
    // Fetch the latest copy so events that arrive out of order can't roll a plan back.
    const sub = await stripe().subscriptions.retrieve(event.data.object.id);
    await syncSubscription(sub);
  }
  return new Response("ok");
}
