# MCP server

## Dev bridge (this folder)

`server.mjs` is a minimal stdio MCP server, no dependencies, Node 24.
It implements `tools/list` and `tools/call` for:
- `search_flight_deals` — shells out to `/opt/hatch/bin/duffel` (Duffel CLI)
- `get_holiday_deals` — returns the Oct 28, 2026 scanned Wedge C fares (re-verify before quoting)
- `watch_route` — dev-only record, no persistence, no email
- `explain_deal` — price vs normal price, % saved, verdict

Test locally:
```sh
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_holiday_deals","arguments":{"holiday":"thanksgiving"}}}' | node mcp-server/server.mjs
```

## Hosted remote version (required for distribution)

Do not ship the dev bridge to users. The hosted version must:
1. Run over Streamable HTTP on a public HTTPS host (required for Grok Bot, ChatGPT, Cursor remote).
2. Call the Duffel API with `DUFFEL_API_KEY` from server env — never in the plugin, never in the repo.
3. Store baselines (90-day median per route/cabin) and watchlists server-side.
4. Rate-limit per user, log scans, and send premium alerts via Beehiiv.
5. Return the same 4 tools, same schemas, so the SKILL.md does not change.

Host options to pick: a small VPS / Fly.io / Render / Cloudflare Workers (with a Duffel API proxy). Pick one before publishing — the plugin manifests point at `farechaser.YOUR-CLOUDFLARE-ACCOUNT.workers.dev/mcp`.
