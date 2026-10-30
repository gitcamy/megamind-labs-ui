// Browser client for the hosted generator. generate.html imports this instead of asking for an API key.
//   const hosted = await createHosted({ api: "https://<host>", supabaseUrl, supabaseAnonKey });
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm";

export async function createHosted({ api, supabaseUrl, supabaseAnonKey }) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const token = async () => (await supabase.auth.getSession()).data.session?.access_token;
  const call = async (path, init = {}) => {
    const t = await token();
    const res = await fetch(api + path, {
      ...init,
      headers: { "content-type": "application/json", ...(t ? { authorization: `Bearer ${t}` } : {}), ...init.headers },
    });
    return res;
  };
  const fail = async (res) => {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || "Something went wrong. Try again.");
    err.code = body.error;
    err.status = res.status;
    return err;
  };

  return {
    supabase,
    onAuthChange: (cb) => supabase.auth.onAuthStateChange((_e, session) => cb(session?.user ?? null)),
    user: async () => (await supabase.auth.getUser()).data.user,
    // captchaToken comes from the Turnstile widget when captcha is on in Supabase Auth settings.
    signInWithEmail: (email, captchaToken) =>
      supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href.split("?")[0], captchaToken } }),
    signInWithGoogle: () => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.href.split("?")[0] } }),
    signOut: () => supabase.auth.signOut(),

    // { email, account: { plan, label, used, limit, lifetime }, plans: [...] }
    async me() {
      const res = await call("/api/me");
      if (!res.ok) throw await fail(res);
      return res.json();
    },

    // Streams a screen. onText gets each chunk; resolves with { text, stop_reason, account }.
    // Errors carry .code: signed_out, unconfirmed, quota, busy, hourly_limit, daily_limit, paused, bad_request.
    async generate(messages, { onText, signal } = {}) {
      const res = await call("/api/generate", { method: "POST", body: JSON.stringify({ messages }), signal });
      if (!res.ok) throw await fail(res);
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      let text = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const events = buffer.split("\n\n");
        buffer = events.pop();
        for (const raw of events) {
          if (!raw.startsWith("data: ")) continue;
          const event = JSON.parse(raw.slice(6));
          if (event.type === "text") { text += event.text; onText?.(event.text, text); }
          if (event.type === "error") throw Object.assign(new Error(event.message), { code: "failed" });
          if (event.type === "done") return { text, stop_reason: event.stop_reason, account: event.account };
        }
      }
      throw Object.assign(new Error("The connection dropped before the screen finished. Try again."), { code: "failed" });
    },

    async upgrade(plan) {
      const res = await call("/api/checkout", { method: "POST", body: JSON.stringify({ plan }) });
      if (!res.ok) throw await fail(res);
      location.href = (await res.json()).url;
    },

    async manageBilling() {
      const res = await call("/api/portal", { method: "POST" });
      if (!res.ok) throw await fail(res);
      location.href = (await res.json()).url;
    },
  };
}
