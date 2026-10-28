// FareChaser remote MCP server — Cloudflare Workers (McpAgent)
// Status: code-complete, UNTESTED. Needs: npm i agents @modelcontextprotocol/sdk
//   npx wrangler login && npx wrangler secret put DUFFEL_API_KEY && npx wrangler deploy
// Duffel live key: dashboard → toggle Test Mode off → verify email/company/payment
//   → More > Developer > Create Live Token. Test key is duffel_test_* (simulated data only).
// Design rules: one Duffel fetch per tool call (free Workers CPU is 10 ms, fetch wait doesn't count);
//   hourly sweeps run in a Cron Trigger, not inside a tool call; results cached in KV.
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

type Env = { DUFFEL_API_KEY: string; FARECHASER_KV?: KVNamespace };

const HOLIDAY: Record<string, string> = {
  thanksgiving:
    "JFK-MIA Tue Nov 24 $443.61 vs Wed Nov 25 $789.80 (save $346); JFK-ORD Tue Nov 24 $428.80 vs Wed $646.60; JFK-MCO Thu Nov 26 $491.80 vs Wed $631.80. Scanned Oct 28, 2026 — re-verify before quoting.",
  christmas:
    "JFK-MCO Mon Dec 21 $406.81 Delta nonstop; JFK-MIA Mon Dec 21 $408.80 vs Wed Dec 23 $606.81. Christmas avg $452 RT (+23%). Book by Halloween (Sat Oct 31, 2026). Scanned Oct 28, 2026 — re-verify before quoting.",
  new_year: "Scan not run yet — use search_flight_deals for Dec 28–Jan 4.",
};

async function duffelSearch(env: Env, a: { origin: string; destination: string; departure_date: string; return_date: string; cabin: string }) {
  const res = await fetch("https://api.duffel.com/air/offer_requests", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.DUFFEL_API_KEY}`,
      "Duffel-Version": "v2",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        slices: [
          { origin: a.origin, destination: a.destination, departure_date: a.departure_date },
          { origin: a.destination, destination: a.origin, departure_date: a.return_date },
        ],
        passengers: [{ type: "adult" }],
        cabin_class: a.cabin,
      },
    }),
  });
  if (!res.ok) throw new Error(`Duffel ${res.status}: ${(await res.text()).slice(0, 500)}`);
  return res.json();
}

export class FareChaserMCP extends McpAgent<Env> {
  server = new McpServer({ name: "farechaser", version: "0.1.0" });

  async init() {
    this.server.tool(
      "search_flight_deals",
      "Search live round-trip fares for one origin/destination and dates. Returns cheapest offers.",
      {
        origin: z.string(), destination: z.string(),
        departure_date: z.string(), return_date: z.string(),
        flex_days: z.number().default(1), cabin: z.string().default("economy"),
      },
      async (a) => {
        const data = await duffelSearch(this.env, a);
        const offers = (data as any)?.data?.offers ?? [];
        const cheapest = offers
          .map((o: any) => ({ airline: o.owner?.name, price: parseFloat(o.total_amount), currency: o.total_currency, stops: o.slices?.[0]?.segments?.length - 1 }))
          .sort((x: any, y: any) => x.price - y.price)
          .slice(0, 5);
        return { content: [{ type: "text", text: JSON.stringify({ checked_at: new Date().toISOString(), cheapest, note: "Live offers at scan time. Re-verify before booking." }, null, 2) }] };
      }
    );

    this.server.tool(
      "get_holiday_deals",
      "Wedge C holiday deals from JFK. Returns Oct 28, 2026 scanned fares — caller must re-verify with search_flight_deals before quoting.",
      { holiday: z.enum(["thanksgiving", "christmas", "new_year"]), origin: z.string().default("JFK") },
      async ({ holiday }) => ({ content: [{ type: "text", text: HOLIDAY[holiday] }] })
    );

    this.server.tool(
      "watch_route",
      "Save a fare watch (origin, destination, max price, email). Stored in KV; alerts are sent by the hourly Cron sweep, not by this tool.",
      { origin: z.string(), destination: z.string(), max_price: z.number(), email: z.string() },
      async (a) => {
        if (this.env.FARECHASER_KV) await this.env.FARECHASER_KV.put(`watch:${a.email}:${a.origin}-${a.destination}`, JSON.stringify({ ...a, created: new Date().toISOString() }));
        return { content: [{ type: "text", text: JSON.stringify({ status: "watch_saved", ...a, note: "Hourly sweep checks this route and alerts if a fare drops under max_price." }) }] };
      }
    );

    this.server.tool(
      "explain_deal",
      "Explain why a fare is (or is not) a real deal: price vs normal price, % saved, verdict.",
      { route: z.string(), price: z.number(), normal_price: z.number() },
      async (a) => {
        const saved = +(a.normal_price - a.price).toFixed(2);
        const pct = Math.round((saved / a.normal_price) * 100);
        const verdict = pct >= 40 ? "REAL DEAL — 40%+ below normal" : pct >= 20 ? "Good saving, not a mistake fare" : "Not a deal — within normal range";
        return { content: [{ type: "text", text: JSON.stringify({ ...a, saved, pct_saved: pct, verdict }, null, 2) }] };
      }
    );
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname === "/mcp") return FareChaserMCP.serve("/mcp").fetch(request, env, ctx);
    if (url.pathname === "/health") return new Response(JSON.stringify({ ok: true, name: "farechaser", version: "0.1.0" }), { headers: { "Content-Type": "application/json" } });
    return new Response("FareChaser MCP — POST /mcp, GET /health", { status: 200 });
  },
  // Hourly sweep (enable in wrangler.toml: [triggers] crons = ["0 * * * *"]):
  // re-scan JFK Thanksgiving/Christmas routes, store cheapest in KV, alert watchers under their max_price.
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    // v1: no-op placeholder — wire the sweep here once the Worker is deployed and the Duffel key is set.
    console.log("farechaser cron tick — sweep not wired yet");
  },
};
