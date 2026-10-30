import { createClient } from "@supabase/supabase-js";

// Throwaway inboxes people use to farm free generations. Not complete; Turnstile on sign-up does most of the work.
const DISPOSABLE = new Set(
  "mailinator.com guerrillamail.com 10minutemail.com tempmail.com temp-mail.org yopmail.com trashmail.com getnada.com sharklasers.com dispostable.com maildrop.cc throwawaymail.com fakeinbox.com mintemail.com emailondeck.com moakt.com tempmailo.com mohmal.com".split(" ")
);

let admin = null;
export function db() {
  admin ??= createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

// Only the generator page may call the account endpoints from a browser.
export function cors(request) {
  const origin = request.headers.get("origin");
  const allowed = (process.env.APP_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return {
    "access-control-allow-origin": origin && allowed.includes(origin) ? origin : allowed[0] || "null",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    vary: "origin",
  };
}

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const json = (request, status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...cors(request) } });

export function route(handler) {
  return async (request) => {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
    try {
      return await handler(request);
    } catch (err) {
      if (err instanceof HttpError) return json(request, err.status, { error: err.code, message: err.message });
      console.error(err);
      return json(request, 500, { error: "server", message: "Something went wrong on our side. Try again in a minute." });
    }
  };
}

// The Supabase session token from the page, checked with Supabase on every request.
export async function requireUser(request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "signed_out", "Sign in to generate screens.");
  const { data, error } = await db().auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, "signed_out", "Your session ended. Sign in again.");
  const user = data.user;
  if (!user.email_confirmed_at) throw new HttpError(403, "unconfirmed", "Confirm your email first. Check your inbox for the link.");

  let { data: profile } = await db().from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) {
    ({ data: profile } = await db().from("profiles").upsert({ id: user.id }).select("*").single());
  }
  if (profile.plan === "free" && DISPOSABLE.has(user.email?.split("@")[1]?.toLowerCase())) {
    throw new HttpError(403, "disposable_email", "Sign in with a permanent email address to use the free screens.");
  }
  return { user, profile };
}
