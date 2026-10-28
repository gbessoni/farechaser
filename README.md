# FareChaser — cheap holiday flights, inside your agent

No app. No dashboard. No website to check. Ask your agent for a deal, get the deal.

Going died when it became an app. We're going back to email — and now, to your agent.

## Install — one line per agent

**Claude Code**
```
/plugin marketplace add gbessoni/farechaser
/plugin install farechaser@farechaser
```

**skills.sh (Claude Code, Cursor, Codex, Gemini, Copilot, 30+ agents)**
```sh
npx skills add gbessoni/farechaser
```

**Codex**
```sh
codex plugin add farechaser@farechaser
# or MCP only:
codex mcp add farechaser --url https://farechaser.YOUR-CLOUDFLARE-ACCOUNT.workers.dev/mcp
```

**Gemini CLI**
```sh
gemini extensions install https://github.com/gbessoni/farechaser
```

**Muse Code / Muse (Meta)**
```sh
muse plugins marketplace add farechaser https://github.com/gbessoni/farechaser
muse plugins install farechaser@farechaser
muse plugins approve farechaser
```
Also listed on Skill Harbor — copy-paste install there.

**Grok Bot (xAI)**
Submit at x.ai/bot/marketplace/submit-a-plugin — under review. MCP server must be public HTTPS.

## Try it

```
Find me the cheapest Thanksgiving flights from JFK.
```

```
Is this Christmas fare a real deal or just normal?
JFK to Orlando, Dec 21-27, $407
```

## What it does

- Scans live fares (Duffel) from your home airport, flexible dates
- Compares to the route's baseline — a deal is ≥40% below median, or under the floor
- Re-verifies before quoting — holiday fares move by the hour
- Tells you how to book direct with the airline. We don't sell tickets.

## Live proof (checked Oct 28, 2026 — re-verify before you book)

- JFK–Miami, Thanksgiving: **$444 Tue Nov 24 vs $790 Wed Nov 25** — $346, same route, one day apart
- JFK–Chicago, Thanksgiving: **$429 Tue vs $647 Wed**
- JFK–Orlando, Christmas: **$407 Mon Dec 21**, Delta nonstop, below the $452 Christmas average

Thanksgiving avg $402 RT (+31% YoY), Christmas avg $452 (+23%) — most expensive holiday season in a decade. Book Christmas by Halloween.

## Repo layout

```
.claude-plugin/          Claude Code plugin + marketplace
.codex-plugin/           Codex plugin + MCP config
skills/holiday-flights/  SKILL.md — the trigger + workflow
server.json              Official MCP Registry entry
gemini-extension.json    Gemini CLI extension
mcp-server/              MCP server (dev bridge + remote spec)
DEMO.md                  30-second demo script
```

## Status

v0.1.0 scaffold, Oct 28, 2026. Working name FareChaser — not locked in.
Replace `gbessoni` and `farechaser.YOUR-CLOUDFLARE-ACCOUNT.workers.dev` before publishing. The MCP server in `mcp-server/` is a dev bridge that shells out to the Duffel CLI for local testing — the hosted remote version must call the Duffel API with a server-side key. Never embed a Duffel key in the plugin.

## Free / premium

Free in-plugin: JFK + 3 destinations, 3 deals/week. Premium (email alerts, custom routes, all origins): signup via Beehiiv — link in the skill, not a hard sell.
