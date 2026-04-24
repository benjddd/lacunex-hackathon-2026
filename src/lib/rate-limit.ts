import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Per-IP rate limits for expensive LLM-touching routes.
//
// Hardens the public deploy against casual abuse: looping /api/turn in a
// browser console, discovering /api/sessions/[id]/research, etc. Does not
// replace per-session budgets (see invites.ts) — they're complementary.
//
// Fails open when no KV creds are configured (local dev without Vercel env
// vars) so the dev loop stays frictionless.

const hasRedis = !!(
  (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
  (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
);

const redis = hasRedis
  ? new Redis({
      url:
        process.env.KV_REST_API_URL ??
        process.env.UPSTASH_REDIS_REST_URL ??
        "",
      token:
        process.env.KV_REST_API_TOKEN ??
        process.env.UPSTASH_REDIS_REST_TOKEN ??
        "",
    })
  : null;

type Bucket = "turn" | "takeaway" | "expensive" | "moderate" | "light";

const BUCKETS: Record<
  Bucket,
  { limit: number; window: Parameters<typeof Ratelimit.slidingWindow>[1] }
> = {
  // /api/turn — normal interview is ~15 turns; allow bursts, cap hard per IP.
  turn: { limit: 40, window: "10 m" },
  // /api/takeaway — one Opus call per session end.
  takeaway: { limit: 20, window: "1 h" },
  // /api/sessions/[id]/research, /rounds/[id]/aggregate, /rounds/[id]/synthesize.
  // Managed Agents + web_search — most expensive calls in the app.
  expensive: { limit: 5, window: "1 h" },
  // /api/generate-brief, /api/sessions/[id]/generate-brief, /api/simulate-participant,
  // /api/transcribe — moderately expensive.
  moderate: { limit: 20, window: "1 h" },
  // /api/invites create, cheap but KV write.
  light: { limit: 60, window: "1 h" },
};

const limiters: Partial<Record<Bucket, Ratelimit>> = {};

function getLimiter(bucket: Bucket): Ratelimit | null {
  if (!redis) return null;
  let cached = limiters[bucket];
  if (!cached) {
    const cfg = BUCKETS[bucket];
    cached = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(cfg.limit, cfg.window),
      prefix: `rl:${bucket}`,
      analytics: false,
    });
    limiters[bucket] = cached;
  }
  return cached;
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export interface RateLimitDecision {
  ok: boolean;
  response?: Response;
}

// Check the bucket for the given request's IP. Returns `{ok: true}` when the
// request is allowed (including when rate-limiting is disabled — no Redis in
// dev). On rejection returns a ready-to-return 429 response.
export async function checkRateLimit(
  req: Request,
  bucket: Bucket,
  extraKey?: string
): Promise<RateLimitDecision> {
  const limiter = getLimiter(bucket);
  if (!limiter) return { ok: true };
  const ip = getClientIp(req);
  const key = extraKey ? `${ip}:${extraKey}` : ip;
  try {
    const result = await limiter.limit(key);
    if (result.success) return { ok: true };
    const retryAfterSec = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          error: "rate_limit_exceeded",
          bucket,
          retry_after_seconds: retryAfterSec,
        }),
        {
          status: 429,
          headers: {
            "content-type": "application/json",
            "Retry-After": String(retryAfterSec),
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
            "X-RateLimit-Reset": String(Math.floor(result.reset / 1000)),
          },
        }
      ),
    };
  } catch (err) {
    // Never let rate-limit failure cascade into a broken route. Log and allow.
    console.warn("[rate-limit] check failed, allowing request:", err);
    return { ok: true };
  }
}
