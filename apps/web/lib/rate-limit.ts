type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

const buckets = new Map<string, RateLimitEntry>();

function getVisitorIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

export function checkRateLimit(request: Request, options: RateLimitOptions) {
  const now = Date.now();
  const key = getVisitorIp(request);
  const current = buckets.get(key);

  // Prototype-only in-memory limiter. Production should use Redis, Upstash,
  // or another persistent store shared across serverless instances.
  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + options.windowMs
    });
    return { allowed: true, remaining: options.limit - 1, resetAt: now + options.windowMs };
  }

  if (current.count >= options.limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  buckets.set(key, current);

  return {
    allowed: true,
    remaining: options.limit - current.count,
    resetAt: current.resetAt
  };
}
