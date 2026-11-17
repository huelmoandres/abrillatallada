import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    return nextResolve(specifier, context);
  },
});

const { protectConsultationRequest, CONSULTATION_RATE_LIMIT_LUA } = await import("../src/lib/server/consultation-security.ts");
const environment = {
  TURNSTILE_SECRET: "private-cloudflare-secret-for-mocked-tests",
  TURNSTILE_HOSTNAMES: "abrillatallada.uy,www.abrillatallada.uy",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "public-test-fixture-site-key",
  UPSTASH_REDIS_REST_URL: "https://test-fixture.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "private-redis-token-for-mocked-tests",
  RATE_LIMIT_HASH_SECRET: "private-ip-hash-secret-at-least-32-characters",
  VERCEL: "1", VERCEL_ENV: "production", NODE_ENV: "production",
};
const token = "private-challenge-token-for-mocked-tests";
const ip = "203.0.113.24";
const unavailable = (stage, upstreamStatus) => ({ ok: false, status: 503, code: "security_unavailable", stage, ...(upstreamStatus !== undefined ? { upstreamStatus } : {}) });
const failed = { ok: false, status: 403, code: "verification_failed" };
const verified = { success: true, action: "consultation", hostname: "abrillatallada.uy" };
function request(headers = {}, url = "https://abrillatallada.uy/api/consultation") {
  return new Request(url, { method: "POST", headers: { "x-vercel-forwarded-for": ip, ...headers } });
}
function mockServices({ verification = () => Response.json(verified), redis = () => Response.json({ result: [1, 0] }) } = {}) {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.redirect, "error");
    assert.equal(options.cache, "no-store");
    return calls.length === 1 ? verification(url, options) : redis(url, options);
  };
  return { calls, fetcher };
}

test("valid action/hostname are verified before an atomic Redis command using only opaque digests", async () => {
  const { calls, fetcher } = mockServices();
  assert.deepEqual(await protectConsultationRequest(request({ "x-forwarded-for": "198.51.100.7", "x-real-ip": "198.51.100.8" }), token, environment, { fetcher }), { ok: true });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers["Content-Type"], "application/x-www-form-urlencoded");
  assert.deepEqual(Object.fromEntries(calls[0].options.body), { secret: environment.TURNSTILE_SECRET, response: token, remoteip: ip });
  const redisCall = calls[1];
  assert.equal(redisCall.url, environment.UPSTASH_REDIS_REST_URL);
  assert.equal(redisCall.options.headers.Authorization, `Bearer ${environment.UPSTASH_REDIS_REST_TOKEN}`);
  assert.deepEqual(JSON.parse(redisCall.options.body), [
    "EVAL", CONSULTATION_RATE_LIMIT_LUA, 4,
    `abril:consultation:ip:${createHmac("sha256", environment.RATE_LIMIT_HASH_SECRET).update(ip).digest("hex")}`,
    "abril:consultation:global:hour", "abril:consultation:global:day",
    `abril:consultation:token:${createHash("sha256").update(token).digest("hex")}`,
  ]);
  for (const privateValue of [ip, token, environment.RATE_LIMIT_HASH_SECRET, environment.TURNSTILE_SECRET, environment.UPSTASH_REDIS_REST_TOKEN]) {
    assert.equal(redisCall.options.body.includes(privateValue), false);
  }
});

test("any exactly configured hostname passes, without suffix or wildcard matches", async () => {
  for (const hostname of ["abrillatallada.uy", "www.abrillatallada.uy"]) {
    const { fetcher } = mockServices({ verification: () => Response.json({ ...verified, hostname }) });
    assert.deepEqual(await protectConsultationRequest(request(), token, environment, { fetcher }), { ok: true });
  }
  for (const hostname of ["evil.abrillatallada.uy", "abrillatallada.uy.evil.example", "ABRILLATALLADA.UY", "abrillatallada.uy ", "", null]) {
    const { fetcher, calls } = mockServices({ verification: () => Response.json({ ...verified, hostname }) });
    assert.deepEqual(await protectConsultationRequest(request(), token, environment, { fetcher }), failed);
    assert.equal(calls.length, 1);
  }
});

test("invalid, expired and duplicate Turnstile tokens never spend Redis quota", async () => {
  const results = [
    { success: false, "error-codes": ["invalid-input-response"] },
    { success: false, "error-codes": ["timeout-or-duplicate"] },
    { ...verified, action: "login" }, { ...verified, action: undefined },
  ];
  for (const result of results) {
    const { fetcher, calls } = mockServices({ verification: () => Response.json(result) });
    assert.deepEqual(await protectConsultationRequest(request(), token, environment, { fetcher }), failed);
    assert.equal(calls.length, 1);
  }
  let calls = 0;
  for (const rawToken of [undefined, null, false, {}, "", " ", "token with spaces", "x".repeat(2049)]) {
    assert.deepEqual(await protectConsultationRequest(request(), rawToken, environment, { fetcher: async () => { calls++; throw new Error("Unexpected network call"); } }), failed);
  }
  assert.equal(calls, 0);
});

test("missing/invalid configuration fails closed without network requests", async () => {
  let calls = 0;
  const fetcher = async () => { calls++; throw new Error("Unexpected network call"); };
  for (const key of ["TURNSTILE_SECRET", "TURNSTILE_HOSTNAMES", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "RATE_LIMIT_HASH_SECRET"]) {
    assert.deepEqual(await protectConsultationRequest(request(), token, { ...environment, [key]: undefined }, { fetcher }), unavailable("configuration"));
    assert.deepEqual(await protectConsultationRequest(request(), token, { ...environment, [key]: "" }, { fetcher }), unavailable("configuration"));
  }
  for (const patch of [
    { RATE_LIMIT_HASH_SECRET: "too-short" }, { TURNSTILE_SECRET: "has whitespace" }, { UPSTASH_REDIS_REST_TOKEN: "token\nheader" },
    { TURNSTILE_HOSTNAMES: "*.abrillatallada.uy" }, { TURNSTILE_HOSTNAMES: "https://abrillatallada.uy" },
    { TURNSTILE_HOSTNAMES: "abrillatallada.uy," }, { NEXT_PUBLIC_TURNSTILE_SITE_KEY: "" },
  ]) assert.deepEqual(await protectConsultationRequest(request(), token, { ...environment, ...patch }, { fetcher }), unavailable("configuration"));
  assert.equal(calls, 0);
});

test("only an HTTPS Upstash origin without credentials, paths, query or fragments is accepted", async () => {
  let calls = 0;
  for (const url of [
    "http://test-fixture.upstash.io", "https://test-fixture.upstash.io.evil.example", "https://upstash.io", "https://.upstash.io",
    "https://test-fixture.upstash.io:1234", "https://user:password@test-fixture.upstash.io", "https://test-fixture.upstash.io/path",
    "https://test-fixture.upstash.io?token=private", "https://test-fixture.upstash.io#private", "https://127.0.0.1", "not-a-url",
  ]) assert.deepEqual(await protectConsultationRequest(request(), token, { ...environment, UPSTASH_REDIS_REST_URL: url }, { fetcher: async () => { calls++; } }), unavailable("configuration"));
  assert.equal(calls, 0);
});

test("official dummy keys and localhost/IP allowlists cannot be used in production", async () => {
  let calls = 0;
  const fetcher = async () => { calls++; throw new Error("Unexpected network call"); };
  for (const TURNSTILE_SECRET of ["1x0000000000000000000000000000000AA", "2x0000000000000000000000000000000AA", "3x0000000000000000000000000000000AA"]) {
    assert.deepEqual(await protectConsultationRequest(request(), token, { ...environment, TURNSTILE_SECRET }, { fetcher }), unavailable("configuration"));
  }
  for (const NEXT_PUBLIC_TURNSTILE_SITE_KEY of ["1x00000000000000000000AA", "2x00000000000000000000AB", "1x00000000000000000000BB", "2x00000000000000000000BB", "3x00000000000000000000FF"]) {
    assert.deepEqual(await protectConsultationRequest(request(), token, { ...environment, NEXT_PUBLIC_TURNSTILE_SITE_KEY }, { fetcher }), unavailable("configuration"));
  }
  for (const TURNSTILE_HOSTNAMES of ["localhost", "test.localhost", "127.0.0.1", "::1", "abrillatallada.uy,localhost"]) {
    assert.deepEqual(await protectConsultationRequest(request(), token, { ...environment, TURNSTILE_HOSTNAMES }, { fetcher }), unavailable("configuration"));
  }
  assert.equal(calls, 0);
});

test("production trusts only one valid Vercel-provided IP and ignores client forwarding claims", async () => {
  let calls = 0;
  const fetcher = async () => { calls++; throw new Error("Unexpected network call"); };
  for (const value of ["", "203.0.113.1, 198.51.100.2", "[2001:db8::1]", "203.0.113.1:3000", "not-an-ip", "fe80::1%eth0"]) {
    assert.deepEqual(await protectConsultationRequest(request({ "x-vercel-forwarded-for": value, "x-forwarded-for": ip, "x-real-ip": ip, "cf-connecting-ip": ip }), token, environment, { fetcher }), unavailable("client_ip"));
  }
  const noTrustedHeader = new Request("https://abrillatallada.uy/api/consultation", { headers: { "x-forwarded-for": ip } });
  assert.deepEqual(await protectConsultationRequest(noTrustedHeader, token, environment, { fetcher }), unavailable("client_ip"));
  assert.deepEqual(await protectConsultationRequest(request(), token, { ...environment, VERCEL: undefined }, { fetcher }), unavailable("client_ip"));
  assert.equal(calls, 0);
});

test("IPv6 is canonicalized before Siteverify and HMAC key generation", async () => {
  const { fetcher, calls } = mockServices();
  assert.deepEqual(await protectConsultationRequest(request({ "x-vercel-forwarded-for": "2001:0DB8:0:0:0:0:0:1" }), token, environment, { fetcher }), { ok: true });
  assert.equal(calls[0].options.body.get("remoteip"), "2001:db8::1");
  assert.equal(JSON.parse(calls[1].options.body)[3], `abril:consultation:ip:${createHmac("sha256", environment.RATE_LIMIT_HASH_SECRET).update("2001:db8::1").digest("hex")}`);
});

test("explicit local development uses loopback without accepting spoofed IP headers or bypassing either service", async () => {
  const localEnvironment = { ...environment, VERCEL: undefined, VERCEL_ENV: undefined, NODE_ENV: "development", TURNSTILE_HOSTNAMES: "localhost" };
  const { fetcher, calls } = mockServices({ verification: () => Response.json({ ...verified, hostname: "localhost" }) });
  assert.deepEqual(await protectConsultationRequest(request({ "x-vercel-forwarded-for": "198.51.100.99" }, "http://localhost:3000/api/consultation"), token, localEnvironment, { fetcher }), { ok: true });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.body.get("remoteip"), "127.0.0.1");
  const blocked = await protectConsultationRequest(request(), token, localEnvironment, { fetcher: async () => { throw new Error("Unexpected network call"); } });
  assert.deepEqual(blocked, unavailable("client_ip"));
});

test("Siteverify outages, invalid server credentials and malformed responses fail closed", async () => {
  for (const verification of [
    () => new Response("not-json", { status: 200 }),
    () => Response.json({ success: "true" }), () => Response.json([]),
    () => Response.json({ success: false, "error-codes": ["invalid-input-secret"] }),
    () => Response.json({ success: false, "error-codes": ["internal-error"] }),
    () => { throw new Error("private secret and IP must never appear in output"); },
  ]) {
    const { fetcher, calls } = mockServices({ verification });
    assert.deepEqual(await protectConsultationRequest(request(), token, environment, { fetcher }), unavailable("turnstile"));
    assert.equal(calls.length, 1);
  }
});

test("only 503 results carry a bounded private stage and non-2xx provider HTTP status", async () => {
  for (const stage of ["turnstile", "redis"]) {
    for (const status of [401, 403, 429, 503, 599]) {
      const upstreamFailure = () => new Response("private provider details", { status });
      const { fetcher } = mockServices(stage === "turnstile" ? { verification: upstreamFailure } : { redis: upstreamFailure });
      assert.deepEqual(await protectConsultationRequest(request(), token, environment, { fetcher }), unavailable(stage, status));
    }
    for (const status of [undefined, null, -1, 0, 99, 100.5, 600, "401", "private-token-value", { private: "visitor-name" }]) {
      const malformedUpstream = () => ({ ok: false, status });
      const { fetcher } = mockServices(stage === "turnstile" ? { verification: malformedUpstream } : { redis: malformedUpstream });
      assert.deepEqual(await protectConsultationRequest(request(), token, environment, { fetcher }), unavailable(stage));
    }
  }
  const rejected = await protectConsultationRequest(request(), "", environment, { fetcher: async () => { throw new Error("Unexpected network call"); } });
  assert.deepEqual(rejected, failed);
  assert.equal("stage" in rejected, false);
  assert.equal("upstreamStatus" in rejected, false);
  const { fetcher } = mockServices({ redis: () => Response.json({ result: [0, 900] }) });
  const limited = await protectConsultationRequest(request(), token, environment, { fetcher });
  assert.equal("stage" in limited, false);
  assert.equal("upstreamStatus" in limited, false);
});

test("Redis rate denials expose only a bounded Retry-After, and replayed tokens fail verification", async () => {
  for (const retryAfter of [1, 900, 3600, 86400]) {
    const { fetcher } = mockServices({ redis: () => Response.json({ result: [0, retryAfter] }) });
    assert.deepEqual(await protectConsultationRequest(request(), token, environment, { fetcher }), { ok: false, status: 429, code: "rate_limited", retryAfter });
  }
  const { fetcher } = mockServices({ redis: () => Response.json({ result: [-1, 0] }) });
  assert.deepEqual(await protectConsultationRequest(request(), token, environment, { fetcher }), failed);
});

test("Redis outage, quota exhaustion, corrupt state and unrecognized results never allow mail", async () => {
  for (const redis of [
    () => new Response("not-json"),
    () => Response.json({ error: "private database error" }),
    () => Response.json({ error: "private database error", result: [1, 0] }),
    ...[null, [1], [1, 1], ["1", 0], [-2, 0], [0, 0], [0, -1], [0, 86401], [0, 1.5], [0, "900"]].map((result) => () => Response.json({ result })),
    () => { throw new Error("private Redis secret"); },
    () => { throw new DOMException("private timeout details", "TimeoutError"); },
  ]) {
    const { fetcher, calls } = mockServices({ redis });
    assert.deepEqual(await protectConsultationRequest(request(), token, environment, { fetcher }), unavailable("redis"));
    assert.equal(calls.length, 2);
  }
});

test("verification actually aborts after at most six seconds and never retries or contacts Redis", async () => {
  let calls = 0;
  const startedAt = Date.now();
  const fetcher = async (_url, options) => {
    calls++;
    return new Promise((_resolve, reject) => {
      const keepAlive = setTimeout(() => reject(new Error("Signal did not abort")), 6_500);
      options.signal.addEventListener("abort", () => { clearTimeout(keepAlive); reject(options.signal.reason); }, { once: true });
    });
  };
  assert.deepEqual(await protectConsultationRequest(request(), token, environment, { fetcher }), unavailable("turnstile"));
  assert.equal(calls, 1);
  assert.ok(Date.now() - startedAt < 6_500);
});

test("upstream error payloads and exceptions cannot expose visitor data, secrets or IPs", async () => {
  const privateValues = ["Private Visitor Name", "private-visitor@example.com", "+59891383578", ip, token, ...Object.values(environment)];
  const privateMessage = privateValues.join(" ");
  for (const stage of ["cloudflare", "redis"]) {
    const { fetcher } = mockServices(stage === "cloudflare"
      ? { verification: () => Response.json({ success: false, "error-codes": [privateMessage], message: privateMessage }) }
      : { redis: () => Response.json({ error: privateMessage }) });
    const result = JSON.stringify(await protectConsultationRequest(request(), token, environment, { fetcher }));
    for (const value of privateValues) assert.equal(result.includes(value), false);
  }
});
