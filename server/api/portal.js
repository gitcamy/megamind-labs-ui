// POST /api/portal -> { url } of the Stripe billing portal, to change plan, update a card or cancel.
import { route, requireUser, json, HttpError } from "../lib/http.js";
import { stripe } from "../lib/stripe.js";

export const POST = route(async (request) => {
  const { profile } = await requireUser(request);
  if (!profile.stripe_customer_id) throw new HttpError(400, "no_billing", "You don't have a plan yet.");
  const session = await stripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: process.env.APP_URL,
  });
  return json(request, 200, { url: session.url });
});

export const OPTIONS = POST;
