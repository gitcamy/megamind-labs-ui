// POST /api/checkout { plan: "starter" | "pro" } -> { url } of a Stripe Checkout page.
import { route, requireUser, json, HttpError } from "../lib/http.js";
import { stripe, customerFor } from "../lib/stripe.js";
import { PLANS } from "../lib/plans.js";

export const POST = route(async (request) => {
  const { user, profile } = await requireUser(request);
  const { plan } = await request.json().catch(() => ({}));
  const price = PLANS[plan]?.priceEnv && process.env[PLANS[plan].priceEnv];
  if (!price) throw new HttpError(400, "bad_plan", "Pick the Starter or Pro plan.");
  if (profile.plan !== "free") {
    throw new HttpError(409, "subscribed", "You already have a plan. Use Manage billing to change it.");
  }

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: await customerFor(user, profile),
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
    success_url: `${process.env.APP_URL}?checkout=done`,
    cancel_url: `${process.env.APP_URL}?checkout=cancelled`,
  });
  return json(request, 200, { url: session.url });
});

export const OPTIONS = POST;
