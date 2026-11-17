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

const { ConsultationMailError, resolveMailConfiguration, sendConsultationMail } = await import("../src/lib/server/consultation-mail.ts");
const { consultationFormSchema, normalizeUruguayMobile, validateConsultationFields, validateConsultationSubmission } = await import("../src/lib/consultation-contract.ts");
const environment = { BREVO_API_KEY: "mock-server-key", BREVO_SENDER_EMAIL: "consultas@abrillatallada.uy", SITE_URL: "https://abrillatallada.uy" };
const submission = { name: "Ana Pérez", contact: "+59891383578", topic: "civil", message: "Quisiera conversar sobre un contrato.", consent: true, website: "", requestId: "b105cb7b-aab2-4f65-8f9c-d0c53d82aaf5" };

test("mail config requires a private key and valid sender while keeping the confirmed recipient", () => {
  const config = resolveMailConfiguration(environment);
  assert.equal(config.recipientEmail, "dra.latallada@gmail.com");
  assert.equal(config.senderName, "Abril Latallada D’Elias");
  assert.equal(config.siteUrl, "https://abrillatallada.uy");
  assert.equal(resolveMailConfiguration({ BREVO_API_KEY: "mock-server-key" }).senderEmail, "consultas@abrillatallada.uy");
  for (const override of [
    { BREVO_API_KEY: "" }, { BREVO_API_KEY: "replace_me" }, { BREVO_SENDER_EMAIL: "" }, { BREVO_SENDER_EMAIL: "invalid" },
    { CONSULTATION_TO_EMAIL: "person@example.com\r\nBcc: attacker@example.com" },
    { BREVO_SENDER_NAME: "Abril\nInjected" }, { SITE_URL: "https://user:password@example.com" },
  ]) assert.equal(resolveMailConfiguration({ ...environment, ...override }), null);
});

test("Zod validation rejects oversized fields, email contacts and unknown topics", () => {
  assert.deepEqual(validateConsultationFields(submission), {});
  const invalid = { ...submission, name: "a".repeat(101), contact: "not a contact", message: "m".repeat(3001), topic: "attacker", consent: false };
  assert.deepEqual(Object.keys(validateConsultationFields(invalid)), ["name", "contact", "topic", "message", "consent"]);
  for (const contact of ["ana@example.com", "words", "123", "+5491138357891", "+598091383578", "29138357", "0913835789", "091 383 578", "091abc578"]) {
    assert.ok(validateConsultationFields({ ...submission, contact }).contact);
  }
});

test("national mobile inputs with or without the initial zero normalize identically in form and server schemas", () => {
  for (const contact of ["091383578", "91383578", "+59891383578"]) {
    assert.equal(normalizeUruguayMobile(contact), "+59891383578");
    assert.equal(consultationFormSchema.parse({ ...submission, contact }).contact, "+59891383578");
    const result = validateConsultationSubmission({ ...submission, contact });
    assert.equal(result.ok, true);
    assert.equal(result.data.contact, "+59891383578");
  }
});

test("server submission validation requires consent, an empty honeypot and a UUID", () => {
  for (const payload of [null, [], { ...submission, website: "https://spam.example" }, { ...submission, requestId: "forged" }, { ...submission, consent: "true" }]) {
    assert.equal(validateConsultationSubmission(payload).ok, false);
  }
  const result = validateConsultationSubmission({ ...submission, name: " Ana ", message: "  Consulta de prueba válida.  ", to: "attacker@example.com" });
  assert.equal(result.ok, true);
  assert.equal(result.data.name, "Ana");
  assert.equal(result.data.message, "Consulta de prueba válida.");
  assert.equal("to" in result.data, false);
});

test("Brevo receives the fixed recipient, normalized mobile, rendered message and stable idempotency key", async () => {
  let sent;
  const fetcher = async (url, options) => {
    sent = { url, options, body: JSON.parse(options.body) };
    return Response.json({ messageId: "<accepted@example.com>" }, { status: 201 });
  };
  const result = await sendConsultationMail(resolveMailConfiguration(environment), submission, { fetcher });
  assert.deepEqual(result, { status: "accepted", messageId: "<accepted@example.com>" });
  assert.equal(sent.url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(sent.options.headers["api-key"], environment.BREVO_API_KEY);
  assert.equal(sent.options.cache, "no-store");
  assert.equal(sent.body.to[0].email, "dra.latallada@gmail.com");
  assert.equal(sent.body.replyTo, undefined);
  assert.match(sent.body.textContent, /\+59891383578/);
  assert.equal(sent.body.headers.idempotencyKey, submission.requestId);
  assert.equal(sent.options.headers.idempotencyKey, undefined);
  assert.match(sent.body.htmlContent, /Quisiera conversar sobre un contrato/);
  assert.match(sent.body.textContent, /Quisiera conversar sobre un contrato/);
  assert.ok(sent.body.subject);
  assert.deepEqual(sent.body.tags, ["abrillatallada", "consulta-web"]);
});

test("a mobile-only consultation never adds an invalid Reply-To email header", async () => {
  let body;
  await sendConsultationMail(resolveMailConfiguration(environment), submission, {
    fetcher: async (_url, options) => { body = JSON.parse(options.body); return Response.json({ messageId: "<ok>" }, { status: 201 }); },
  });
  assert.equal(body.replyTo, undefined);
  assert.match(body.textContent, /\+59891383578/);
});

test("an upstream error or malformed success never becomes a claimed delivery and is not retried", async () => {
  for (const [response, reason, providerStatus, providerCode] of [
    [Response.json({ code: "unauthorized", message: "private secret details" }, { status: 401 }), "provider", 401, "unauthorized"],
    [Response.json({ code: "permission_denied", message: "private secret details" }, { status: 403 }), "provider", 403, "permission_denied"],
    [Response.json({}), "invalid_response", 200, "unknown"],
    [new Response("invalid"), "invalid_response", 200, "unknown"],
  ]) {
    let calls = 0;
    await assert.rejects(() => sendConsultationMail(resolveMailConfiguration(environment), submission, {
      fetcher: async () => { calls++; return response; },
    }), (error) => error instanceof ConsultationMailError && !error.message.includes("secret") && error.reason === reason && error.providerStatus === providerStatus && error.providerCode === providerCode);
    assert.equal(calls, 1);
  }
  assert.deepEqual(await sendConsultationMail(resolveMailConfiguration(environment), submission, {
    fetcher: async () => Response.json({ code: "duplicate_parameter" }, { status: 400 }),
  }), { status: "duplicate" });
});

test("a stalled provider request is aborted and classified as a timeout", async () => {
  await assert.rejects(() => sendConsultationMail(resolveMailConfiguration(environment), submission, {
    timeoutMs: 5,
    fetcher: async (_url, { signal }) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(Response.json({ messageId: "late" })), 100);
      signal.addEventListener("abort", () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
    }),
  }), (error) => error instanceof ConsultationMailError && error.kind === "timeout" && error.reason === "timeout" && error.providerStatus === undefined);
});
