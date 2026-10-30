# Megamind Labs UI server

One Vercel project with two jobs:

- **MCP server** at `/mcp`. Free and costs nothing to run. People connect their own AI tool (Claude, Cursor, Claude Code, ChatGPT), and that tool's model writes the screens using the kit's rules.
- **Hosted generator API** at `/api/*`. For people without an AI tool. They sign in, get a free allowance of about 6 screens, then pick a plan. It runs on your Anthropic key, so every call is metered and capped.

Both read `AGENTS.md`, `reference/classes.md` and the stylesheet from jsDelivr, so they stay in step with the repo.

## Connect the MCP server

Replace `https://YOUR-HOST` with the deployment URL.

**Claude (web and desktop):** Settings → Connectors → Add custom connector → paste `https://YOUR-HOST/mcp`.

**Claude Code:**

```bash
claude mcp add --transport http megamind-labs-ui https://YOUR-HOST/mcp
```

**Cursor:** add to `~/.cursor/mcp.json`:

```json
{ "mcpServers": { "megamind-labs-ui": { "url": "https://YOUR-HOST/mcp" } } }
```

**VS Code:** add to `.vscode/mcp.json`:

```json
{ "servers": { "megamind-labs-ui": { "type": "http", "url": "https://YOUR-HOST/mcp" } } }
```

Then ask for screens: "Wireframe a sign-up flow with Megamind Labs UI."

Tools: `get_rules`, `get_reference`, `get_component`, `get_starter`, `validate_screen`. There is also a `wireframe` prompt.

## Hosted generator plans

| Plan | Price | Token allowance (in usage $) | About | Resets |
| --- | --- | --- | --- | --- |
| Free | $0 | $0.50 | 6 screens | never |
| Starter | $5.99/mo | $3.50 | 43 screens | each billing period |
| Pro | $10.99/mo | $7.00 | 87 screens | each billing period |

Each plan is a fixed allowance of tokens, priced at what Anthropic charges for them, so input, output and cached tokens each count at their real cost. People always get the whole allowance: small screens and changes use little of it, long ones use more. The page shows how much is left and roughly how many screens that is, using `TYPICAL_SCREEN_USD` in `lib/plans.js`. All plans run on Claude Sonnet 5.5 at medium effort.

A request that starts with allowance left always finishes, so the last one can go slightly over (by one screen's cost at most).

### What protects your Anthropic bill

1. The key is only on the server. The page never sees it.
2. Every request needs a Supabase sign-in with a confirmed email. Free use is counted per account, and throwaway email domains can't use the free tier.
3. `reserve_generation` in Postgres locks the account row, then checks: nothing else running, 10 an hour, 40 a day, and the allowance left on their plan. Parallel requests can't get past it.
4. The server writes the system prompt and only accepts alternating text turns plus up to 4 images under 1 MB. Requests are capped at 2,000 characters, 24 turns and 16k output tokens, so the endpoint can't be used as a general Claude proxy.
5. Usage is billed from the real token counts, including when someone stops a screen partway.
6. `DAILY_BUDGET_USD` pauses the generator for everyone once a day's total spend reaches it.
7. Set a monthly spend limit on the key's Console workspace. That's the backstop that can't be bypassed.

## Deploy

1. **Supabase:** create a project. Run `supabase/schema.sql` in the SQL editor. In Authentication, turn on email (magic link) and Google. Under Attack Protection, turn on Cloudflare Turnstile captcha.
2. **Anthropic:** in the Console, create a workspace just for this, set a monthly spend limit (start with $50), and create a key in it.
3. **Stripe:** create two monthly prices ($5.99 and $10.99). Add a webhook to `https://YOUR-HOST/api/stripe-webhook` for `customer.subscription.created`, `customer.subscription.updated` and `customer.subscription.deleted`. Turn on the customer portal.
4. **Vercel:** create a project with `server` as the root directory. Add every variable from `.env.example`, then deploy.

Local run: `vercel dev` in this folder, with `.env.local` filled in.

## Using it from the generator page

`public/hosted.js` is served at `https://YOUR-HOST/hosted.js`:

```js
import { createHosted } from "https://YOUR-HOST/hosted.js";
const hosted = await createHosted({ api: "https://YOUR-HOST", supabaseUrl, supabaseAnonKey });

const { text, account } = await hosted.generate(messages, { onText: (_, all) => render(all), signal });
// Errors have .code: signed_out, quota, busy, hourly_limit, daily_limit, paused ...
```

## Tests

```bash
npm test
```
