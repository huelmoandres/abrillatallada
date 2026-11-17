import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    return nextResolve(specifier, context);
  },
});

const { handleConsultationRequest } = await import("../src/lib/server/consultation-mail.ts");
const mailEnvironment = { BREVO_API_KEY: "private-brevo-fixture", SITE_URL: "https://abrillatallada.uy" };
const environment = {
  ...mailEnvironment,
  TURNSTILE_SECRET: "private-turnstile-fixture",
  TURNSTILE_HOSTNAMES: "abrillatallada.uy",
  UPSTASH_REDIS_REST_URL: "https://fixture.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "private-redis-fixture",
  RATE_LIMIT_HASH_SECRET: "private-hash-fixture-at-least-thirty-two-characters",
  VERCEL: "1", VERCEL_ENV: "production", NODE_ENV: "production",
};
const payload = {
  name: "Route privacy fixture", contact: "090000000", topic: "civil",
  message: "A synthetic message that must not be logged.", consent: true, website: "",
  requestId: "e4810419-95ea-4c8d-93f4-9ddf2937cfc8", turnstileToken: "opaque-token-fixture",
};
function request(body = payload, headers = {}) {
  return new Request("https://abrillatallada.uy/api/consultation", {
    method: "POST", headers: { "Content-Type": "application/json", Origin: "https://abrillatallada.uy", "x-vercel-forwarded-for": "203.0.113.9", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("the production handler fails closed without security configuration", async () => {
  let calls = 0;
  const logs = [];
  const fetcher = async () => { calls++; throw new Error("Must not contact a service"); };
  const response = await handleConsultationRequest(request(), { environment: mailEnvironment, fetcher, securityFetcher: fetcher, logger: (entry) => logs.push(entry) });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "security_unavailable");
  assert.equal(calls, 0);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].reason, "security");
  assert.equal(logs[0].securityStage, "configuration");
  assert.doesNotMatch(JSON.stringify(logs), /private-|Route privacy|90000000|synthetic|opaque-token/);
});

test("input, honeypot and origin rejection occur before any security or mail service", async () => {
  let calls = 0;
  const securityCheck = async () => { calls++; throw new Error("Must not verify invalid input"); };
  const fetcher = async () => { calls++; throw new Error("Must not send invalid input"); };
  for (const [body, headers, status] of [
    [{ ...payload, website: "spam" }, {}, 422],
    [{ ...payload, consent: false }, {}, 422],
    [{ ...payload, message: " " }, {}, 422],
    [payload, { Origin: "https://foreign.example" }, 403],
  ]) assert.equal((await handleConsultationRequest(request(body, headers), { environment, securityCheck, fetcher })).status, status);
  assert.equal(calls, 0);
});

test("guard denials preserve public errors and never reach the email provider", async () => {
  let calls = 0;
  for (const decision of [
    { ok: false, status: 403, code: "verification_failed" },
    { ok: false, status: 429, code: "rate_limited", retryAfter: 49 },
    { ok: false, status: 503, code: "security_unavailable", stage: "redis", upstreamStatus: 403 },
  ]) {
    const logs = [];
    const response = await handleConsultationRequest(request(), {
      environment, securityCheck: async (_request, token) => { assert.equal(token, payload.turnstileToken); return decision; },
      fetcher: async () => { calls++; throw new Error("Must not send"); }, logger: (entry) => logs.push(entry),
    });
    assert.equal(response.status, decision.status);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("retry-after"), decision.retryAfter ? String(decision.retryAfter) : null);
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.equal(body.code, decision.code);
    assert.equal(body.stage, undefined);
    assert.equal(body.upstreamStatus, undefined);
    assert.equal(logs.length, decision.status === 503 ? 1 : 0);
    if (decision.status === 503) {
      assert.equal(logs[0].securityStage, "redis");
      assert.equal(logs[0].securityProviderStatus, 403);
    }
    assert.doesNotMatch(JSON.stringify([body, logs]), /private-|Route privacy|90000000|synthetic|opaque-token/);
  }
  assert.equal(calls, 0);
});

test("an unexpected guard error remains closed and does not expose exception text", async () => {
  const logs = [];
  const response = await handleConsultationRequest(request(), {
    environment, securityCheck: async () => { throw new Error("private-guard-failure"); },
    fetcher: async () => { throw new Error("Must not send"); }, logger: (entry) => logs.push(entry),
  });
  assert.equal(response.status, 503);
  assert.doesNotMatch(JSON.stringify([await response.json(), logs]), /private-|Route privacy|90000000|synthetic|opaque-token/);
});

test("the actual handler verifies the token and shared budget before sending exactly once", async () => {
  const events = [];
  const response = await handleConsultationRequest(request(), {
    environment, logger: () => assert.fail("Successful sends must not produce delivery-error logs"),
    securityFetcher: async (url, options) => {
      if (url === "https://challenges.cloudflare.com/turnstile/v0/siteverify") {
        events.push("verify");
        assert.equal(new URLSearchParams(options.body).get("response"), payload.turnstileToken);
        return Response.json({ success: true, hostname: "abrillatallada.uy", action: "consultation" });
      }
      assert.equal(url, environment.UPSTASH_REDIS_REST_URL);
      events.push("budget");
      assert.equal(JSON.parse(options.body)[0], "EVAL");
      assert.doesNotMatch(options.body, /203\.0\.113\.9|opaque-token-fixture|Route privacy|90000000/);
      return Response.json({ result: [1, 0] });
    },
    fetcher: async (url, options) => {
      assert.equal(url, "https://api.brevo.com/v3/smtp/email");
      events.push("email");
      const email = JSON.parse(options.body);
      assert.equal(email.to[0].email, "dra.latallada@gmail.com");
      assert.equal(email.headers.idempotencyKey, payload.requestId);
      assert.doesNotMatch(options.body, /opaque-token-fixture|private-turnstile-fixture|private-redis-fixture/);
      return Response.json({ messageId: "<synthetic-accepted>" }, { status: 201 });
    },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.deepEqual(events, ["verify", "budget", "email"]);
});

test("invalid tokens and exhausted shared budgets stop the actual handler before mail", async () => {
  for (const scenario of ["invalid", "limited", "replay", "outage"]) {
    let sent = 0;
    const response = await handleConsultationRequest(request(), {
      environment, logger: () => {},
      securityFetcher: async (url) => {
        if (url.includes("siteverify")) return Response.json(scenario === "invalid"
          ? { success: false, "error-codes": ["invalid-input-response"] }
          : { success: true, hostname: "abrillatallada.uy", action: "consultation" });
        if (scenario === "outage") throw new Error("private-upstream-failure");
        return Response.json({ result: scenario === "limited" ? [0, 100] : [-1, 0] });
      },
      fetcher: async () => { sent++; throw new Error("Must not send"); },
    });
    assert.equal(response.status, scenario === "limited" ? 429 : scenario === "outage" ? 503 : 403);
    assert.equal(sent, 0);
  }
});
