// POST /api/generate  { messages }  ->  text/event-stream of {type: "text" | "done" | "error"} events.
// Your Anthropic key stays here. Every call is signed in, checked against the person's plan and rate limits,
// and metered by the tokens it actually used.
import Anthropic from "@anthropic-ai/sdk";
import { route, requireUser, cors } from "../lib/http.js";
import { reserve, finish, usage, checkMessages } from "../lib/quota.js";
import { MODEL, LIMITS } from "../lib/plans.js";
import { systemPrompt } from "../lib/system.js";

const anthropic = new Anthropic();

export const POST = route(async (request) => {
  const { profile } = await requireUser(request);
  const body = await request.json().catch(() => ({}));
  const messages = checkMessages(body.messages);
  const system = await systemPrompt();
  const id = await reserve(profile);

  const encoder = new TextEncoder();
  let model = MODEL;
  let latestUsage = null;
  const stream = anthropic.beta.messages.stream({
    model: MODEL,
    max_tokens: LIMITS.maxTokens,
    output_config: { effort: "medium" },
    // If Sonnet declines a request, Anthropic retries it on a model chosen for that refusal category.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages,
  });
  request.signal?.addEventListener("abort", () => stream.abort());
  stream.on("streamEvent", (e) => {
    if (e.type === "message_start") { model = e.message.model ?? model; latestUsage = e.message.usage; }
    if (e.type === "message_delta" && e.usage) latestUsage = { ...latestUsage, ...e.usage };
  });

  const body$ = new ReadableStream({
    async start(controller) {
      const send = (event) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      stream.on("text", (text) => send({ type: "text", text }));
      try {
        const final = await stream.finalMessage();
        await finish(id, { model: final.model ?? model, usage: final.usage });
        send({ type: "done", stop_reason: final.stop_reason, account: await usage(profile) });
      } catch (err) {
        // Bill whatever was generated before it stopped, so stopping early can't be used to get free output.
        await finish(id, { model, usage: latestUsage, failed: true }).catch(console.error);
        if (!request.signal?.aborted) {
          console.error(err);
          const busy = err instanceof Anthropic.RateLimitError || err?.status === 529;
          send({ type: "error", message: busy ? "The generator is busy right now. Try again in a minute." : "The screen couldn't be built. Try again." });
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body$, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-store", ...cors(request) },
  });
});

export const OPTIONS = POST;
