import { db, HttpError } from "./http.js";
import { PLANS, RATE, LIMITS, periodStart, costOf } from "./plans.js";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

const REASONS = {
  busy: [429, "A screen is still being built. Wait for it to finish, or stop it first."],
  hourly_limit: [429, `You can build ${RATE.perHour} screens an hour. Try again a little later.`],
  daily_limit: [429, `You can build ${RATE.perDay} screens a day. Try again tomorrow.`],
};

// Claims one generation, or explains which limit was hit.
export async function reserve(profile) {
  const plan = PLANS[profile.plan] ?? PLANS.free;

  const budget = Number(process.env.DAILY_BUDGET_USD || 25);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const { data: spent, error: spendError } = await db().rpc("spend_since", { p_since: today.toISOString() });
  if (spendError) throw spendError;
  if (Number(spent) >= budget) {
    throw new HttpError(503, "paused", "The generator has hit today's limit for everyone. It opens again at midnight UTC.");
  }

  const { data, error } = await db().rpc("reserve_generation", {
    p_user: profile.id,
    p_period_start: periodStart(profile).toISOString(),
    p_max_count: plan.generations,
    p_max_cost: plan.maxCostUsd,
    p_per_hour: RATE.perHour,
    p_per_day: RATE.perDay,
  });
  if (!error) return data;

  const code = Object.keys(REASONS).concat("quota").find((k) => error.message?.includes(k));
  if (code === "quota") {
    throw new HttpError(
      402,
      "quota",
      plan.lifetime
        ? `You've used your ${plan.generations} free screens. Pick a plan to keep building.`
        : `You've used this month's ${plan.generations} screens. Upgrade, or wait for your plan to renew.`
    );
  }
  if (code) throw new HttpError(REASONS[code][0], code, REASONS[code][1]);
  throw error;
}

export async function finish(id, { model, usage, failed }) {
  const u = usage ?? {};
  await db()
    .from("generations")
    .update({
      status: failed && !u.output_tokens ? "failed" : "done",
      model,
      input_tokens: u.input_tokens ?? 0,
      output_tokens: u.output_tokens ?? 0,
      cache_read_tokens: u.cache_read_input_tokens ?? 0,
      cache_write_tokens: u.cache_creation_input_tokens ?? 0,
      cost_usd: costOf(model, u),
      finished_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function usage(profile) {
  const plan = PLANS[profile.plan] ?? PLANS.free;
  const since = periodStart(profile);
  const { data, error } = await db().rpc("usage_since", { p_user: profile.id, p_since: since.toISOString() });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  // Show whichever cap is closer, so the counter never says "12 left" when the cost cap is about to stop them.
  const byCost = Math.floor((Number(row?.cost ?? 0) / plan.maxCostUsd) * plan.generations);
  const used = Math.min(plan.generations, Math.max(row?.used ?? 0, byCost));
  return { plan: profile.plan, label: plan.label, used, limit: plan.generations, lifetime: !!plan.lifetime, since };
}

// Accepts only the shape the generator page sends: alternating turns of text, plus a few images.
export function checkMessages(messages) {
  const bad = (message) => {
    throw new HttpError(400, "bad_request", message);
  };
  if (!Array.isArray(messages) || !messages.length) bad("Send at least one message.");
  if (messages.length > LIMITS.turns) bad("This screen has had a lot of changes. Start a new screen to keep going.");
  let images = 0;
  const clean = messages.map((m, i) => {
    const role = i % 2 === 0 ? "user" : "assistant";
    if (m?.role !== role) bad("Messages must alternate between you and the generator.");
    const max = role === "user" ? LIMITS.promptChars : LIMITS.assistantChars;
    const blocks = typeof m.content === "string" ? [{ type: "text", text: m.content }] : m.content;
    if (!Array.isArray(blocks) || !blocks.length) bad("A message was empty.");
    return {
      role,
      content: blocks.map((b) => {
        if (b?.type === "text" && typeof b.text === "string") {
          if (b.text.length > max) bad(role === "user" ? `Keep each request under ${LIMITS.promptChars} characters.` : "The screen is too large to change. Start a new one.");
          return { type: "text", text: b.text };
        }
        if (role === "user" && b?.type === "image" && b.source?.type === "base64" && IMAGE_TYPES.has(b.source.media_type)) {
          if (++images > LIMITS.images) bad(`Add up to ${LIMITS.images} images per screen.`);
          if (b.source.data.length * 0.75 > LIMITS.imageBytes) bad("Images must be under 1 MB.");
          return { type: "image", source: { type: "base64", media_type: b.source.media_type, data: b.source.data } };
        }
        bad("That kind of attachment isn't supported.");
      }),
    };
  });
  if (clean.at(-1).role !== "user") bad("The last message must be your request.");
  return clean;
}
