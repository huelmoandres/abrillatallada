import "server-only";

import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";
import {
  CONSULTATION_TURNSTILE_ACTION,
  CONSULTATION_TURNSTILE_TOKEN_LIMIT,
  type ConsultationSecurityCode,
} from "@/lib/consultation-security-contract";

export type SecurityEnvironment = {
  [key: string]: string | undefined;
  TURNSTILE_SECRET?: string;
  TURNSTILE_HOSTNAMES?: string;
  NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  RATE_LIMIT_HASH_SECRET?: string;
  VERCEL?: string;
  VERCEL_ENV?: string;
  NODE_ENV?: string;
};

export type SecurityFailureStage = "configuration" | "client_ip" | "turnstile" | "redis";

export type ConsultationSecurityResult =
  | { ok: true }
  | { ok: false; status: 403 | 429; code: ConsultationSecurityCode; retryAfter?: number }
  | { ok: false; status: 503; code: "security_unavailable"; retryAfter?: never; stage?: SecurityFailureStage; upstreamStatus?: number };

type SecurityConfiguration = {
  turnstileSecret: string;
  hostnames: Set<string>;
  redisUrl: string;
  redisToken: string;
  hashSecret: string;
};

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const SECURITY_TIMEOUT_MS = 6_000;
const KEY_PREFIX = "abril:consultation";
const TEST_KEYS = new Set([
  "1x00000000000000000000AA", "2x00000000000000000000AB",
  "1x00000000000000000000BB", "2x00000000000000000000BB", "3x00000000000000000000FF",
  "1x0000000000000000000000000000000AA", "2x0000000000000000000000000000000AA",
  "3x0000000000000000000000000000000AA",
]);

// KEYS: IP digest, global hour, global day, token digest. All checks and writes are atomic.
export const CONSULTATION_RATE_LIMIT_LUA = `
if redis.call('EXISTS', KEYS[4]) == 1 then return {-1, 0} end
if not redis.call('SET', KEYS[4], '1', 'NX', 'EX', 600) then return {-1, 0} end

local limits = {5, 30, 100}
local windows = {900, 3600, 86400}
local retry = 0
for i = 1, 3 do
  local raw = redis.call('GET', KEYS[i])
  if raw then
    if not string.match(raw, '^[1-9]%d*$') then return {-2, 0} end
    local count = tonumber(raw)
    local ttl = redis.call('TTL', KEYS[i])
    if not count or ttl < 0 or ttl > windows[i] then return {-2, 0} end
    if count >= limits[i] then retry = math.max(retry, math.max(1, ttl)) end
  end
end
if retry > 0 then return {0, retry} end

for i = 1, 3 do
  if redis.call('INCR', KEYS[i]) == 1 then redis.call('EXPIRE', KEYS[i], windows[i]) end
end
return {1, 0}
`;

function unavailable(stage: SecurityFailureStage, upstreamStatus?: number): ConsultationSecurityResult {
  const safeStatus = Number.isInteger(upstreamStatus) && upstreamStatus !== undefined && upstreamStatus >= 100 && upstreamStatus <= 599
    ? upstreamStatus
    : undefined;
  return { ok: false, status: 503, code: "security_unavailable", stage, ...(safeStatus !== undefined ? { upstreamStatus: safeStatus } : {}) };
}

function verificationFailed(): ConsultationSecurityResult {
  return { ok: false, status: 403, code: "verification_failed" };
}

function boundedSecret(value: string | undefined, minimum = 1): string | null {
  if (!value || value.length < minimum || value.length > 4_096 || /\s/.test(value)) return null;
  return value;
}

function resolveConfiguration(environment: SecurityEnvironment): SecurityConfiguration | null {
  const turnstileSecret = boundedSecret(environment.TURNSTILE_SECRET);
  const redisToken = boundedSecret(environment.UPSTASH_REDIS_REST_TOKEN);
  const hashSecret = boundedSecret(environment.RATE_LIMIT_HASH_SECRET, 32);
  const isProduction = environment.VERCEL_ENV === "production" || environment.NODE_ENV === "production";
  const siteKey = environment.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!turnstileSecret || !redisToken || !hashSecret || !environment.TURNSTILE_HOSTNAMES) return null;
  if (siteKey !== undefined && !boundedSecret(siteKey)) return null;
  if (isProduction && (TEST_KEYS.has(turnstileSecret) || (siteKey !== undefined && TEST_KEYS.has(siteKey)))) return null;

  const hostnames = environment.TURNSTILE_HOSTNAMES.split(",").map((host) => host.trim().toLowerCase());
  if (!hostnames.length || hostnames.length > 20 || hostnames.some((host) => {
    const validHostname = host.length <= 253 && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/.test(host);
    if (!validHostname && !isIP(host)) return true;
    return isProduction && (Boolean(isIP(host)) || host === "localhost" || host.endsWith(".localhost"));
  })) return null;

  try {
    const url = new URL(environment.UPSTASH_REDIS_REST_URL ?? "");
    if (url.protocol !== "https:" || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+upstash\.io$/.test(url.hostname) ||
      url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash) return null;
    return { turnstileSecret, hostnames: new Set(hostnames), redisUrl: url.origin, redisToken, hashSecret };
  } catch {
    return null;
  }
}

function normalizedIp(raw: string | null): string | null {
  if (!raw || raw !== raw.trim() || !/^[a-fA-F0-9:.]+$/.test(raw)) return null;
  const version = isIP(raw);
  if (version === 4) return raw;
  if (version === 6) return new URL(`http://[${raw}]`).hostname.slice(1, -1);
  return null;
}

function trustedClientIp(request: Request, environment: SecurityEnvironment): string | null {
  if (environment.VERCEL === "1") return normalizedIp(request.headers.get("x-vercel-forwarded-for"));
  if (environment.VERCEL_ENV === "production" || !["development", "test"].includes(environment.NODE_ENV ?? "")) return null;
  const hostname = new URL(request.url).hostname;
  if (["localhost", "127.0.0.1", "[::1]"].includes(hostname)) return "127.0.0.1";
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function protectConsultationRequest(
  request: Request,
  rawToken: unknown,
  environment: SecurityEnvironment,
  dependencies: { fetcher?: typeof fetch } = {},
): Promise<ConsultationSecurityResult> {
  const configuration = resolveConfiguration(environment);
  if (!configuration) return unavailable("configuration");
  if (typeof rawToken !== "string" || !rawToken.length || rawToken.length > CONSULTATION_TURNSTILE_TOKEN_LIMIT || /\s/.test(rawToken)) {
    return verificationFailed();
  }
  const ip = trustedClientIp(request, environment);
  if (!ip) return unavailable("client_ip");
  const fetcher = dependencies.fetcher ?? fetch;
  let stage: SecurityFailureStage = "turnstile";

  try {
    const verification = await fetcher(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: configuration.turnstileSecret, response: rawToken, remoteip: ip }),
      signal: AbortSignal.timeout(SECURITY_TIMEOUT_MS),
      redirect: "error",
      cache: "no-store",
    });
    if (!verification.ok) return unavailable("turnstile", verification.status);
    const verified: unknown = await verification.json();
    if (!isRecord(verified) || typeof verified.success !== "boolean") return unavailable("turnstile");
    if (!verified.success) {
      const codes = verified["error-codes"];
      if (Array.isArray(codes) && codes.some((code) => ["internal-error", "invalid-input-secret", "missing-input-secret", "bad-request"].includes(code))) return unavailable("turnstile");
      return verificationFailed();
    }
    if (verified.action !== CONSULTATION_TURNSTILE_ACTION || typeof verified.hostname !== "string" || !configuration.hostnames.has(verified.hostname)) {
      return verificationFailed();
    }

    stage = "redis";
    const ipDigest = createHmac("sha256", configuration.hashSecret).update(ip).digest("hex");
    const tokenDigest = createHash("sha256").update(rawToken).digest("hex");
    const redis = await fetcher(configuration.redisUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${configuration.redisToken}` },
      body: JSON.stringify([
        "EVAL", CONSULTATION_RATE_LIMIT_LUA, 4,
        `${KEY_PREFIX}:ip:${ipDigest}`, `${KEY_PREFIX}:global:hour`, `${KEY_PREFIX}:global:day`, `${KEY_PREFIX}:token:${tokenDigest}`,
      ]),
      signal: AbortSignal.timeout(SECURITY_TIMEOUT_MS),
      redirect: "error",
      cache: "no-store",
    });
    if (!redis.ok) return unavailable("redis", redis.status);
    const body: unknown = await redis.json();
    if (!isRecord(body) || "error" in body || !Array.isArray(body.result) || body.result.length !== 2) return unavailable("redis");
    const [decision, retryAfter] = body.result;
    if (decision === 1 && retryAfter === 0) return { ok: true };
    if (decision === -1 && retryAfter === 0) return verificationFailed();
    if (decision === 0 && Number.isInteger(retryAfter) && retryAfter >= 1 && retryAfter <= 86_400) {
      return { ok: false, status: 429, code: "rate_limited", retryAfter };
    }
    return unavailable("redis");
  } catch {
    return unavailable(stage);
  }
}
