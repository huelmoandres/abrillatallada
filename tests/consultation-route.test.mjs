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
  const response = await handleConsultationRequest(request(), { environment: {}, fetcher: async () => { throw new Error("Must not send"); } });
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
    const response = await handleConsultationRequest(request(), { environment, fetcher: async () => provider });
    assert.equal(response.status, status);
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.doesNotMatch(JSON.stringify(body), /secret-key|sensitive-provider-body|mock-key-never/);
  }
});
