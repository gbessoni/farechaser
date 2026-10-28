# Cloudflare Workers — hosted MCP server (chosen host)

Yes to Cloudflare. This is the right host for this product.

## Why it fits

- **First-class MCP support.** Cloudflare's `agents` SDK has an `McpAgent` class that handles Streamable HTTP transport automatically. Official guide: `developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/` — deploy with `npx wrangler deploy`, live at `https://<worker>.<account>.workers.dev/mcp`, connect with `claude mcp add --transport http <name> https://…/mcp`.
- **Free to start, $5 to scale.** Free: 100,000 requests/day, 10 ms CPU per invocation, 5 cron triggers/account. Paid ($5/mo): 10M requests/mo included, CPU limit 30 seconds.
- **The 10 ms CPU limit is not a blocker here.** It counts CPU time, not wall time — waiting on a fetch to Duffel doesn't count against it. A Duffel search is a fetch + a little JSON parsing. If a scan ever needs heavy work, split it: Cron Trigger sweeps hourly, stores results in KV/D1, the MCP tool just reads the stored result.
- **Storage built in.** KV for baselines (1 GB, 100k reads/day, 1k writes/day free), D1 for watchlists (5 GB, 5M rows read/day free), Durable Objects for per-session state. No VPS, no Docker, no cold starts.
- **Secrets stay server-side.** `npx wrangler secret put DUFFEL_API_KEY` — the key never enters the repo or the plugin. This is the whole point of the hosted design.
- **Public HTTPS by default.** Required for Grok Bot, ChatGPT, and Cursor remote MCP. No tunnel, no ngrok.

## Limits to respect

- Free CPU 10 ms: keep each tool call to one Duffel fetch + parse. Don't do multi-route sweeps inside a single tool call — do those in a Cron Trigger.
- Free Cron: 5 triggers/account. One hourly sweep is enough for v1.
- Workers.dev subdomain can be changed by Cloudflare for any reason — attach a custom domain (e.g. `mcp.farechaser.com`) once the name is locked.
- No auth on the public endpoint by default = an open execution surface. V1 is read-only (search only, no booking, no payments), so the risk is Duffel API spend, not user data. Add a bearer token / rate limit before opening premium watchlists.

## Files here

- `wrangler.toml` — Worker config, ready to fill in your account + KV id.
- `src/index.ts` — McpAgent skeleton with the same 4 tools as the dev bridge (`search_flight_deals`, `get_holiday_deals`, `watch_route`, `explain_deal`), calling the Duffel API with `env.DUFFEL_API_KEY`. **Not yet tested** — needs `npm i agents @modelcontextprotocol/sdk`, `wrangler login`, and a Duffel API key. Do not deploy blind; run `wrangler dev` first.

## Deploy checklist

1. `npm i agents @modelcontextprotocol/sdk`
2. `npx wrangler login`
3. `npx wrangler secret put DUFFEL_API_KEY`
4. `npx wrangler kv namespace create FARECHASER_KV` → paste id into `wrangler.toml`
5. `npx wrangler deploy` → note the real `https://farechaser.<account>.workers.dev/mcp` URL
6. Replace `YOUR-CLOUDFLARE-ACCOUNT` in `server.json`, `README.md`, and `.codex-plugin/mcp.json` with that account subdomain, then push to GitHub.
