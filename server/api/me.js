// GET /api/me -> the signed-in person's plan and how many screens they have left.
import { route, requireUser, json } from "../lib/http.js";
import { usage } from "../lib/quota.js";
import { PLANS } from "../lib/plans.js";

export const GET = route(async (request) => {
  const { user, profile } = await requireUser(request);
  const plans = Object.entries(PLANS)
    .filter(([, p]) => p.price)
    .map(([id, p]) => ({ id, label: p.label, price: p.price, generations: p.generations }));
  return json(request, 200, { email: user.email, account: await usage(profile), plans });
});

export const OPTIONS = GET;
