# Megamind Labs UI server

One Vercel project with two jobs:

- **MCP server** at `/mcp`. Free and costs nothing to run. People connect their own AI tool (Claude, Cursor, Claude Code, ChatGPT), and that tool's model writes the screens using the kit's rules.
- **Hosted generator API** at `/api/*`. For people without an AI tool. They sign in, get 3 free screens, then pick a plan. It runs on your Anthropic key, so every call is metered and capped.

Both read `AGENTS.md`, `reference/classes.md` and the stylesheet from jsDelivr, so they stay in step with the repo.

## Connect the MCP server

The MCP server is live at `https://megamind-labs-ui-mcp.megamind-labs.workers.dev/mcp`.

**Claude (web and desktop):** Settings → Connectors → Add custom connector → paste `https://megamind-labs-ui-mcp.megamind-labs.workers.dev/mcp`.

**Claude Code:**

```bash
claude mcp add --transport http megamind-labs-ui https://megamind-labs-ui-mcp.megamind-labs.workers.dev/mcp
```

**Cursor:** add to `~/.cursor/mcp.json`:

```json
{ "mcpServers": { "megamind-labs-ui": { "url": "https://megamind-labs-ui-mcp.megamind-labs.workers.dev/mcp" } } }
```

**VS Code:** add to `.vscode/mcp.json`:

```json
{ "servers": { "megamind-labs-ui": { "type": "http", "url": "https://megamind-labs-ui-mcp.megamind-labs.workers.dev/mcp" } } }
```

Then ask for screens: "Wireframe a sign-up flow with Megamind Labs UI."

Tools: `get_rules`, `get_reference`, `get_component`, `get_starter`, `validate_screen`. There is also a `wireframe` prompt.

### Deploy the MCP server to Cloudflare

The MCP endpoint also runs as a Cloudflare Worker (`worker/index.js`, config in `wrangler.toml`). It needs no environment variables.

```bash
npx wrangler login
npm run worker:deploy
```

Test it locally with `npm run worker:dev`, then connect to `http://localhost:8787/mcp`. To use your own domain, add a custom domain to the Worker in the Cloudflare dashboard.

## Hosted generator plans

| Plan | Price | Screens | Cost cap | Resets |
| --- | --- | --- | --- | --- |
| Free | $0 | 3 | $0.60 | never |
| Starter | $5.99/mo | 40 | $4.00 | each billing period |
| Pro | $10.99/mo | 100 | $7.50 | each billing period |

All plans run on Claude Sonnet 5.5 at medium effort. Change them in `lib/plans.js`. The cost cap stops someone whose screens run long from costing more than the plan earns, and the counter people see uses whichever cap is closer.

### What protects your Anthropic bill

1. The key is only on the server. The page never sees it.
2. Every request needs a Supabase sign-in with a confirmed email. Free use is counted per account, and throwaway email domains can't use the free tier.
3. `reserve_generation` in Postgres locks the account row, then checks: nothing else running, 10 an hour, 40 a day, and the plan's screen count and cost cap. Parallel requests can't get past it.
4. The server writes the system prompt and only accepts alternating text turns plus up to 3 images under 1 MB. Requests are capped at 2,000 characters, 24 turns and 16k output tokens, so the endpoint can't be used as a general Claude proxy.
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
