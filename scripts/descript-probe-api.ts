// Probe the Descript V50 REST API to verify the token in .env.local works
// and discover the available endpoints (project / drive / composition / media).
// Output is minimal — just status codes and short response shapes — so secrets
// don't leak into logs.
//
//   npx tsx scripts/descript-probe-api.ts

// Run with: node --env-file=.env.local --import=tsx scripts/descript-probe-api.ts
// (Node 20+ supports --env-file natively, no dotenv dependency needed.)

const TOKEN = process.env.DESCRIPT_API_TOKEN;
if (!TOKEN) {
  console.error("DESCRIPT_API_TOKEN missing from environment (check .env.local)");
  process.exit(1);
}

// Per Descript API beta announcement, the base URL is api.descript.com.
// docs.descriptapi.com hosts the OpenAPI spec.
const CANDIDATE_BASES = [
  "https://api.descript.com/v1",
  "https://api.descript.com",
  "https://app.descript.com/api",
];

const PROBES = [
  "/me",
  "/users/me",
  "/drives",
  "/projects",
  "/jobs",
];

async function probe(base: string, path: string) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/json",
      },
    });
    const status = res.status;
    let snippet = "";
    if (status >= 200 && status < 300) {
      const json = await res.json().catch(() => null);
      if (json) {
        const keys = Array.isArray(json) ? `array(len=${json.length})` : Object.keys(json).slice(0, 8).join(",");
        snippet = ` keys=${keys}`;
      }
    } else if (status >= 400) {
      const text = await res.text().catch(() => "");
      snippet = ` body=${text.slice(0, 120)}`;
    }
    console.log(`${status} ${url}${snippet}`);
    return { ok: status >= 200 && status < 300, status };
  } catch (err) {
    console.log(`ERR ${url} :: ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, status: 0 };
  }
}

async function main() {
  console.log(`token prefix: ${TOKEN!.slice(0, 8)}...`);
  for (const base of CANDIDATE_BASES) {
    console.log(`\n=== ${base} ===`);
    for (const path of PROBES) {
      await probe(base, path);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
