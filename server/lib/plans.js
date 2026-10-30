// Plans for the hosted generator. Each plan is a fixed token allowance, priced in dollars of Anthropic
// usage so input, output and cached tokens each count at what they cost. Everyone always gets their whole
// allowance; short screens leave more of it for later. Keep each allowance under what the plan earns
// after Stripe fees.
export const MODEL = "claude-sonnet-5-5";

export const PLANS = {
  free: { label: "Free", price: 0, allowanceUsd: 0.5, lifetime: true },
  starter: { label: "Starter", price: 5.99, allowanceUsd: 3.5, priceEnv: "STRIPE_PRICE_STARTER" },
  pro: { label: "Pro", price: 10.99, allowanceUsd: 7.0, priceEnv: "STRIPE_PRICE_PRO" },
};

// What a typical screen costs, only for the "about N screens" shown to people. Update it from the
// generations table once there is real usage.
export const TYPICAL_SCREEN_USD = 0.08;
export const screensFor = (usd) => Math.max(0, Math.floor(usd / TYPICAL_SCREEN_USD));

// Per person, on every plan.
export const RATE = { perHour: 10, perDay: 40 };

// Request size caps, so nobody can use the endpoint as a general-purpose Claude proxy.
export const LIMITS = {
  maxTokens: 16000,
  promptChars: 2000,
  assistantChars: 60000,
  turns: 24,
  images: 4,
  imageBytes: 1_000_000,
};

// $ per million tokens. Fallback models are priced too, since a refusal fallback can bill at their rate.
const PRICES = {
  "claude-sonnet-5-5": { in: 2, out: 10, cacheRead: 0.2 },
  "claude-opus-5-5": { in: 4, out: 20, cacheRead: 0.2 },
  "claude-opus-4-8": { in: 5, out: 25, cacheRead: 0.5 },
};

export function costOf(model, usage) {
  const p = PRICES[model] ?? PRICES["claude-opus-4-8"];
  const write = usage.cache_creation_input_tokens ?? 0;
  const read = usage.cache_read_input_tokens ?? 0;
  return (
    ((usage.input_tokens ?? 0) * p.in + write * p.in * 1.25 + read * p.cacheRead + (usage.output_tokens ?? 0) * p.out) / 1e6
  );
}

export function planFromPrice(priceId) {
  return Object.entries(PLANS).find(([, p]) => p.priceEnv && process.env[p.priceEnv] === priceId)?.[0] ?? null;
}

// Free counts every generation ever; paid plans reset with each billing period.
export function periodStart(profile) {
  const plan = PLANS[profile.plan] ?? PLANS.free;
  if (plan.lifetime) return new Date(0);
  if (profile.period_start) return new Date(profile.period_start);
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
