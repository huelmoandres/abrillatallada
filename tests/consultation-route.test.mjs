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

const { handleConsultationRequest: guardedHandler } = await import("../src/lib/server/consultation-mail.ts");
// These fixtures isolate delivery behavior; the real guard is covered by the security suites.
const handleConsultationRequest = (input, dependencies) => guardedHandler(input, {
  securityCheck: async () => ({ ok: true }),
  ...dependencies,
});
const environment = { BREVO_API_KEY: "mock-key-never-used-on-network", BREVO_SENDER_EMAIL: "consultas@abrillatallada.uy", SITE_URL: "https://abrillatallada.uy" };
const payload = { name: "Ana", contact: "091383578", topic: "civil", message: "Quisiera coordinar una consulta.", consent: true, website: "", requestId: "e4810419-95ea-4c8d-93f4-9ddf2937cfc8" };
function request(body = payload, headers = {}) {
  return new Request("https://abrillatallada.uy/api/consultation", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://abrillatallada.uy", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
}

test("an accepted provider result returns a small no-store success without personal data or credentials", async () => {
  const response = await handleConsultationRequest(request({ ...payload, to: "attacker@example.com" }), {
    environment,
    fetcher: async (_url, options) => {
      const sent = JSON.parse(options.body);
      assert.equal(sent.to[0].email, "dra.latallada@gmail.com");
      assert.equal(sent.replyTo, undefined);
      assert.match(sent.textContent, /\+59891383578/);
      return Response.json({ messageId: "<accepted>" }, { status: 201 });
    },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { ok: true });
});

test("cross-origin, missing-origin and non-JSON posts are rejected without sending", async () => {
  const fetcher = async () => { throw new Error("Must not call provider"); };
  for (const [headers, status] of [
    [{ Origin: "https://other.example" }, 403], [{ Origin: "null" }, 403], [{ Origin: "" }, 403],
    [{ "Sec-Fetch-Site": "cross-site" }, 403], [{ "Content-Type": "text/plain" }, 415],
  ]) {
    const response = await handleConsultationRequest(request(payload, headers), { environment, fetcher });
    assert.equal(response.status, status);
  }
});

test("invalid, malformed and oversized submissions never send mail", async () => {
  let calls = 0;
  const fetcher = async () => { calls++; throw new Error("Must not call provider"); };
  for (const [body, status] of [
    ["{", 400], [{ ...payload, contact: "invalid contact" }, 422], [{ ...payload, contact: "ana@example.com" }, 422], [{ ...payload, website: "spam" }, 422],
    [{ ...payload, consent: false }, 422], [{ ...payload, requestId: "not-a-uuid" }, 422], ["a".repeat(16 * 1024 + 1), 413],
  ]) assert.equal((await handleConsultationRequest(request(body), { environment, fetcher })).status, status);
  const response = await handleConsultationRequest(request({ ...payload, message: " " }), { environment, fetcher });
  assert.ok((await response.json()).fieldErrors.message);
  assert.equal(calls, 0);
});

test("an absent sender/key produces a safe configuration response without contacting Brevo", async () => {
  const response = await handleConsultationRequest(request(), { environment: {}, logger: () => {}, fetcher: async () => { throw new Error("Must not send"); } });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /dra\.latallada@gmail\.com/);
});

test("a same-origin browser Host works when Next exposes an internal URL alias", async () => {
  const localRequest = (origin) => new Request("http://localhost:3000/api/consultation", {
    method: "POST", headers: { "Content-Type": "application/json", Host: "127.0.0.1:3000", Origin: origin, "Sec-Fetch-Site": "same-origin" }, body: JSON.stringify(payload),
  });
  let calls = 0;
  const fetcher = async () => { calls++; return Response.json({ messageId: "<accepted>" }, { status: 201 }); };
  assert.equal((await handleConsultationRequest(localRequest("http://127.0.0.1:3000"), { environment, fetcher })).status, 200);
  assert.equal((await handleConsultationRequest(localRequest("http://other.example"), { environment, fetcher })).status, 403);
  assert.equal(calls, 1);
});

test("provider failures and duplicates are handled without reflecting provider internals or claiming delivery", async () => {
  for (const [provider, status] of [
    [Response.json({ code: "unauthorized", message: "secret-key sensitive-provider-body" }, { status: 401 }), 502],
    [Response.json({ code: "duplicate_parameter" }, { status: 400 }), 409],
    [Response.json({}), 502],
  ]) {
    const response = await handleConsultationRequest(request(), { environment, logger: () => {}, fetcher: async () => provider });
    assert.equal(response.status, status);
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.doesNotMatch(JSON.stringify(body), /secret-key|sensitive-provider-body|mock-key-never/);
  }
});

test("provider diagnostics expose only bounded status and allowlisted codes, never private request or provider contents", async () => {
  const privatePayload = { ...payload, name: "Private Visitor Name", message: "Private legal consultation content.", contact: "091383578" };
  const privateEnvironment = { ...environment, BREVO_API_KEY: "private-api-key-value", BREVO_SENDER_EMAIL: "private-sender@example.com", CONSULTATION_TO_EMAIL: "private-recipient@example.com" };
  for (const [providerStatus, code, expectedCode] of [
    [401, "unauthorized", "unauthorized"],
    [403, "permission_denied", "permission_denied"],
    [400, "account_under_validation", "account_under_validation"],
    [429, "duplicate_request", "duplicate_request"],
    [403, "unauthorized\nprivate-api-key-value", "unknown"],
    [400, "private-visitor@example.com", "unknown"],
    [400, { private: "Private legal consultation content." }, "unknown"],
  ]) {
    const logs = [];
    const response = await handleConsultationRequest(request(privatePayload), {
      environment: privateEnvironment,
      logger: (entry) => logs.push(entry),
      fetcher: async () => Response.json({ code, message: "private-provider-message", key: privateEnvironment.BREVO_API_KEY, htmlContent: "<p>private-email-html</p>" }, { status: providerStatus }),
    });
    assert.equal(response.status, 502);
    assert.deepEqual(logs, [{
      event: "consultation_delivery_failed", requestId: payload.requestId, reason: "provider", responseStatus: 502, providerStatus, providerCode: expectedCode,
    }]);
    const output = JSON.stringify({ response: await response.json(), logs });
    for (const marker of [privatePayload.name, privatePayload.message, privatePayload.contact, "+59891383578", privateEnvironment.BREVO_API_KEY, privateEnvironment.BREVO_SENDER_EMAIL, privateEnvironment.CONSULTATION_TO_EMAIL, "private-provider-message", "private-email-html"]) {
      assert.equal(output.includes(marker), false, marker);
    }
    assert.equal(JSON.stringify(logs).includes("@"), false);
  }
});

test("non-JSON and malformed provider responses carry no body excerpts into diagnostics", async () => {
  for (const provider of [new Response("private-non-json-response", { status: 403 }), Response.json({ private: "private-response-property" })]) {
    const logs = [];
    const providerStatus = provider.status;
    const response = await handleConsultationRequest(request(), { environment, logger: (entry) => logs.push(entry), fetcher: async () => provider });
    assert.equal(response.status, 502);
    assert.deepEqual(logs, [{ event: "consultation_delivery_failed", requestId: payload.requestId, reason: "invalid_response", responseStatus: 502, providerStatus, providerCode: "unknown" }]);
    assert.doesNotMatch(JSON.stringify({ logs, response: await response.json() }), /private-non-json|private-response-property/);
  }
});

test("configuration diagnostics contain a validated normalized UUID and no environment values", async () => {
  const logs = [];
  const response = await handleConsultationRequest(request({ ...payload, requestId: payload.requestId.toUpperCase() }), { environment: {}, logger: (entry) => logs.push(entry), fetcher: async () => { throw new Error("Must not send"); } });
  assert.equal(response.status, 503);
  assert.deepEqual(logs, [{ event: "consultation_delivery_failed", requestId: payload.requestId, reason: "configuration", responseStatus: 503 }]);
  assert.equal(JSON.stringify(logs).includes("@"), false);
});

test("network, timeout and unexpected failures produce typed metadata without exception details", async () => {
  for (const reason of ["network", "timeout", "unexpected"]) {
    const logs = [];
    const response = await handleConsultationRequest(request(), {
      environment,
      logger: (entry) => logs.push(entry),
      timeoutMs: reason === "unexpected" ? -1 : 5,
      fetcher: async (_url, { signal }) => {
        if (reason === "network") throw new Error("private-network-exception");
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => resolve(Response.json({ messageId: "late" })), 100);
          signal.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("private-timeout-exception")); }, { once: true });
        });
      },
    });
    const responseStatus = reason === "timeout" ? 504 : 502;
    assert.equal(response.status, responseStatus);
    assert.deepEqual(logs, [{ event: "consultation_delivery_failed", requestId: payload.requestId, reason, responseStatus }]);
    assert.doesNotMatch(JSON.stringify({ logs, response: await response.json() }), /private-network-exception|private-timeout-exception|mock-key-never/);
  }
});

test("input rejections, accepted emails and normal duplicates do not emit failure diagnostics", async () => {
  const logs = [];
  const logger = (entry) => logs.push(entry);
  assert.equal((await handleConsultationRequest(request({ ...payload, requestId: "invalid-private-request-id" }), { environment, logger })).status, 422);
  for (const provider of [Response.json({ messageId: "<accepted>" }, { status: 201 }), Response.json({ code: "duplicate_parameter" }, { status: 400 })]) {
    await handleConsultationRequest(request(), { environment, logger, fetcher: async () => provider });
  }
  assert.deepEqual(logs, []);
});

test("a failing diagnostic sink does not change the public error response", async () => {
  const response = await handleConsultationRequest(request(), { environment: {}, logger: () => { throw new Error("private-logger-error"); } });
  assert.equal(response.status, 503);
  assert.doesNotMatch(JSON.stringify(await response.json()), /private-logger-error/);
});
