# FareChaser — push-ready repo pack

Repo: `github.com/gbessoni/farechaser` (public, MIT)
Local source: `~/workspace/flight-deals-clone/farechaser-plugin/`

## 1. Create the repo (Greg — 1 minute, I can't do this without your GitHub login)

On github.com/gbessoni, New repository:
- Name: `farechaser`
- Public
- Do NOT add README /.gitignore / license (the pack has them)

## 2. Push (run on your machine, or paste to Claude Code)

```sh
cd ~/workspace/flight-deals-clone/farechaser-plugin
git init -b main
git add.
git commit -m "FareChaser v0.1.0 — flight-deals plugin + MCP server (Claude Code, Codex, Gemini, skills.sh)"
git remote add origin https://github.com/gbessoni/farechaser.git
git push -u origin main
```

## 3. Validate (your machine — claude CLI is not on Muse's machine)

```sh
cd farechaser
claude plugin validate.
```

## 4. Publish — no approval needed

```sh
# MCP Registry
mcp-publisher login github
mcp-publisher publish

# skills.sh is automatic once the repo is public with skills/farechaser/SKILL.md
# — users install with: npx skills add gbessoni/farechaser
```

## 5. Submit — needs your sign-off / accounts

- Claude Code Discover tab: in-app form, automated review
- Grok Bot: x.ai/bot/marketplace/submit-a-plugin — needs square logo + testing instructions
- cursor.directory: paste repo URL
- Gemini CLI extensions directory: paste repo URL

## 6. Deploy the hosted MCP (needs Duffel live key + Cloudflare login)

```sh
cd farechaser-plugin/mcp-server
npm i agents @modelcontextprotocol/sdk
npx wrangler login
npx wrangler secret put DUFFEL_API_KEY
npx wrangler deploy
# note the real URL, replace YOUR-CLOUDFLARE-ACCOUNT in server.json + README.md, push again
```

## ⚠️ Name hold — read before publishing publicly

Preliminary check, Oct 28, 2026 — NOT cleared, and FareChaser is not a clean break:
- A secondary trademark source still lists **FARECHASE as Registered, holder Yahoo! Inc., Class 42, serial 78605981, filed 2005/04/11**. That record may be stale (renewal was due ~2016), but I found no cancellation evidence. Status is UNVERIFIED.
- **farechase.com is still owned by Yahoo/Oath Inc.** — domain created 2000-01-10, nameservers ns1–ns5.yahoo.com, registrant Oath Inc.. Do not plan on farechase.com.
- "FareChaser" itself shows up in the same history: Yahoo's product was called FareChaser in some sources, and Farechaser Inc. was the screen-scraper company American Airlines got an injunction against in 2003. So the extra "r" does not clear the name — TESS + attorney glance still required before public launch.
- So: use `farechaser` as the repo / working name, but **do not publish to Discover / MCP Registry / Grok Bot under that name until a USPTO TESS check + attorney glance clears it** — same rule as Spotqi. If it doesn't clear, the fallback is a rename (the code is name-agnostic — one find/replace), not a rebuild.

## What runs on autopilot after push

- Daily Duffel scan (6:30 AM ET): JFK Thanksgiving + Christmas routes, re-verify fares, save to `~/workspace/flight-deals-clone/farechaser-plugin/scans/`, draft the day's deal email. No send without Greg.
- Weekly: re-check the FARECHASE trademark record + farechase.com ownership, report any change.
- No DMs, posts, or outreach sent as Greg. No purchases. No repo creation or deploy without his login/key.
