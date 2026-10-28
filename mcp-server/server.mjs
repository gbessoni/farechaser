// FareChaser MCP server — DEV BRIDGE, v0.1.0
// Minimal stdio JSON-RPC MCP server, no dependencies.
// Local dev only: shells out to the Duffel CLI (/opt/hatch/bin/duffel).
// DO NOT ship this as the hosted server. The hosted remote version must:
//   - run over Streamable HTTP on a public HTTPS host
//   - call the Duffel API with a server-side DUFFEL_API_KEY (never in the plugin)
//   - store baselines and watchlists server-side
//   - rate-limit per user
// Tools: search_flight_deals, get_holiday_deals, watch_route, explain_deal
import { spawn } from "node:child_process";
import readline from "node:readline";

const DUFFEL = process.env.DUFFEL_CLI || "/opt/hatch/bin/duffel";

const TOOLS = [
  {
    name: "search_flight_deals",
    description: "Search live round-trip fares for one origin/destination and dates, flexible by flex_days. Returns the cheapest options found.",
    inputSchema: {
      type: "object",
      properties: {
        origin: { type: "string", description: "IATA airport code, e.g. JFK" },
        destination: { type: "string", description: "IATA airport/city code, e.g. MIA, MCO, ORD, LON" },
        departure_date: { type: "string", description: "YYYY-MM-DD" },
        return_date: { type: "string", description: "YYYY-MM-DD" },
        flex_days: { type: "integer", description: "Days either side of departure (0-3)", default: 1 },
        cabin: { type: "string", description: "economy (default), premium_economy, business, first", default: "economy" },
      },
      required: ["origin", "destination", "departure_date", "return_date"],
    },
  },
  {
    name: "get_holiday_deals",
    description: "Get the Wedge C holiday deals for Thanksgiving, Christmas or New Year from JFK. Returns the Oct 28, 2026 scanned fares — caller must re-verify with search_flight_deals before quoting.",
    inputSchema: {
      type: "object",
      properties: {
        holiday: { type: "string", description: "thanksgiving, christmas, or new_year" },
        origin: { type: "string", description: "IATA code, JFK in v1", default: "JFK" },
      },
      required: ["holiday"],
    },
  },
  {
    name: "watch_route",
    description: "Record a watchlist request for a route and max price. Dev bridge: returns the request, does not persist or send alerts — hosted version stores it and emails via Beehiiv.",
    inputSchema: {
      type: "object",
      properties: {
        origin: { type: "string" },
        destination: { type: "string" },
        max_price: { type: "number", description: "USD round-trip ceiling" },
        email: { type: "string", description: "Alert email (opt-in only)" },
      },
      required: ["origin", "destination", "max_price"],
    },
  },
  {
    name: "explain_deal",
    description: "Explain why a fare is (or is not) a real deal: compare to baseline/average and to the neighbouring-day price.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "e.g. JFK-MIA" },
        price: { type: "number" },
        normal_price: { type: "number" },
      },
      required: ["route", "price", "normal_price"],
    },
  },
];

const HOLIDAY_DEALS = {
  thanksgiving: {
    note: "Scanned Oct 28, 2026, Duffel, JFK only. Re-verify before quoting. Thanksgiving avg $402 RT (+31% YoY).",
    deals: [
      { route: "JFK-MIA", out: "Tue Nov 24", back: "Sat Nov 28", price: 443.61, alt: { out: "Wed Nov 25", price: 789.8, saved: 346.19 }, airline: "Delta nonstop (Tue $448.80)", kind: "date-flexibility, NOT a mistake fare" },
      { route: "JFK-ORD", out: "Tue Nov 24", back: "Sat Nov 28", price: 428.8, alt: { out: "Wed Nov 25", price: 646.6, saved: 217.8 }, airline: "American nonstop", kind: "date-flexibility, NOT a mistake fare" },
      { route: "JFK-MCO", out: "Thu Nov 26", back: "Mon Nov 30", price: 491.8, alt: { out: "Wed Nov 25", price: 631.8, saved: 140 }, airline: "JetBlue nonstop", kind: "date-flexibility, NOT a mistake fare" },
    ],
  },
  christmas: {
    note: "Scanned Oct 28, 2026, Duffel, JFK only. Re-verify before quoting. Christmas avg $452 RT (+23%). Book by Halloween.",
    deals: [
      { route: "JFK-MCO", out: "Mon Dec 21", back: "Sun Dec 27", price: 406.81, alt: { out: "Wed Dec 23", price: 472.6, saved: 65.79 }, airline: "Delta nonstop", kind: "date-flexibility, NOT a mistake fare" },
      { route: "JFK-MIA", out: "Mon Dec 21", back: "Sun Dec 27", price: 408.8, alt: { out: "Wed Dec 23", price: 606.81, saved: 198.01 }, airline: "Delta/American", kind: "date-flexibility, NOT a mistake fare" },
      { route: "JFK-LON", out: "Wed Dec 23", back: "Tue Dec 29", price: 1011.41, alt: { out: "Mon Dec 21", price: 1444.69, saved: 433.28 }, airline: "1-stop only at these prices", kind: "date-flexibility, NOT a cheap deal — use as a date-arbitrage example only" },
    ],
  },
  new_year: { note: "New Year scan not run yet — use search_flight_deals for Dec 28–Jan 4.", deals: [] },
};

function runDuffel(args) {
  return new Promise((resolve) => {
    const p = spawn(DUFFEL, args, { timeout: 120000 });
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", (e) => resolve({ ok: false, error: String(e) }));
    p.on("close", (code) => resolve({ ok: code === 0, stdout: out, stderr: err, code }));
  });
}

async function callTool(name, args) {
  if (name === "get_holiday_deals") {
    const d = HOLIDAY_DEALS[args.holiday] || HOLIDAY_DEALS.thanksgiving;
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
  if (name === "watch_route") {
    return { content: [{ type: "text", text: JSON.stringify({ status: "recorded-dev-only", ...args, note: "Dev bridge does not persist or email. Hosted version stores this and alerts via Beehiiv." }, null, 2) }] };
  }
  if (name === "explain_deal") {
    const saved = args.normal_price - args.price;
    const pct = Math.round((saved / args.normal_price) * 100);
    const verdict = pct >= 40 ? "REAL DEAL — 40%+ below normal" : pct >= 20 ? "Good saving, not a mistake fare" : "Not a deal — within normal range";
    return { content: [{ type: "text", text: JSON.stringify({ route: args.route, price: args.price, normal_price: args.normal_price, saved, pct_saved: pct, verdict }, null, 2) }] };
  }
  if (name === "search_flight_deals") {
    const r = await runDuffel(["search", "--origin", args.origin, "--destination", args.destination, "--departure-date", args.departure_date, "--return-date", args.return_date, "--adults", "1", "--cabin", args.cabin || "economy", "--flex-days", String(args.flex_days ?? 1), "--limit", "300"]);
    const text = (r.stderr || "") + (r.stdout || "");
    return { content: [{ type: "text", text: JSON.stringify({ ok: r.ok, checked_at: new Date().toISOString(), digest_lines: text.split("\n").filter(Boolean).slice(0, 12), note: "Prices are live offers at scan time. Re-verify before booking." }, null, 2) }] };
  }
  throw new Error(`unknown tool ${name}`);
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
process.stdout.on("error", (e) => { if (e.code === "EPIPE") process.exit(0); });
rl.on("line", async (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  const { id, method, params } = msg;
  const reply = (result) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
  const replyErr = (code, message) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n");
  try {
    if (method === "initialize") reply({ protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "farechaser", version: "0.1.0" } });
    else if (method === "notifications/initialized") { /* no reply */ }
    else if (method === "tools/list") reply({ tools: TOOLS });
    else if (method === "tools/call") reply(await callTool(params.name, params.arguments || {}));
    else if (method === "ping") reply({});
    else replyErr(-32601, `method not found: ${method}`);
  } catch (e) { replyErr(-32603, String(e?.message || e)); }
});
