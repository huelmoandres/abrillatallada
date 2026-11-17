import assert from "node:assert/strict";
import test from "node:test";
import {
  applyExampleToDraft,
  createConsultationDraft,
  formatConsultation,
  validateConsultation,
} from "../src/components/consultation/model.ts";
import { createFormControl } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { consultationFormSchema } from "../src/lib/consultation-contract.ts";
import { createConsultationSender } from "../src/components/consultation/submission.ts";

test("examples preserve every field and the draft identity when a message already exists", () => {
  const draft = { name: "Ana", contact: "ana@example.com", topic: "other", message: "  Mi mensaje escrito  ", consent: true };
  const result = applyExampleToDraft(draft, { topic: "civil", message: "Un inicio de ejemplo" });
  assert.equal(result.applied, false);
  assert.equal(result.draft, draft);
  assert.deepEqual(result.draft, draft);
});

test("an example fills only an empty message and topic while retaining contact and consent", () => {
  const draft = { name: "Ana", contact: "099123456", topic: "", message: " \n ", consent: true };
  const result = applyExampleToDraft(draft, { topic: "family", message: "Quisiera consultar sobre mi familia…" });
  assert.equal(result.applied, true);
  assert.deepEqual(result.draft, { ...draft, topic: "family", message: "Quisiera consultar sobre mi familia…" });
});

test("an example retains an explicitly selected topic when the message is empty", () => {
  for (const topic of ["labor", "other"]) {
    const draft = { name: "Ana", contact: "099123456", topic, message: "", consent: true };
    const result = applyExampleToDraft(draft, { topic: "family", message: "Quisiera consultar sobre mi familia…" });
    assert.equal(result.applied, true);
    assert.deepEqual(result.draft, { ...draft, message: "Quisiera consultar sobre mi familia…" });
  }
});

test("an example clears the message error through React Hook Form without changing existing fields", async () => {
  const initial = { name: "Ana", contact: "091383578", topic: "labor", message: "          ", consent: true, website: "" };
  const form = createFormControl({ resolver: zodResolver(consultationFormSchema), defaultValues: initial });
  const unsubscribe = form.subscribe({ formState: { values: true }, callback: () => {} });
  for (const field of Object.keys(initial)) form.register(field);
  await form.handleSubmit(() => assert.fail("Whitespace is not a message"), () => {})();
  assert.ok(form.getFieldState("message").error);
  const result = applyExampleToDraft(form.getValues(), { topic: "family", message: "Quisiera consultar sobre mi familia…" });
  form.setValue("message", result.draft.message, { shouldDirty: true, shouldValidate: true });
  form.setValue("topic", result.draft.topic, { shouldDirty: true, shouldValidate: true });
  await form.trigger(["message", "topic"]);
  assert.equal(form.getFieldState("message").error, undefined);
  assert.equal(form.getValues("topic"), "labor");
  assert.equal(form.getValues("contact"), initial.contact);
  assert.equal(form.getValues("name"), initial.name);
  assert.equal(form.getValues("consent"), true);
  unsubscribe();
});

test("validation rejects whitespace-only identity/contact and a short trimmed message", () => {
  const draft = { name: "  ", contact: " \t ", topic: "civil", message: "   abcdefghi   ", consent: false };
  assert.deepEqual(Object.keys(validateConsultation(draft)), ["name", "contact", "message", "consent"]);
});

test("validation normalizes a national mobile in the review without inventing delivery", () => {
  const draft = { name: " Ana ", contact: " 091383578 ", topic: "civil", message: "  Mi consulta sobre el contrato.  ", consent: true };
  assert.deepEqual(validateConsultation(draft), {});
  const message = formatConsultation(draft, "Derecho civil");
  assert.match(message, /Nombre: Ana\nTeléfono: \+59891383578\nTema: Derecho civil/);
  assert.match(message, /\nMi consulta sobre el contrato\.$/);
  assert.doesNotMatch(message, /Consulta enviada/);
});

test("validation bounds identity and accepts Uruguay mobile numbers only", () => {
  const draft = { name: "Ana", contact: "091383578", topic: "civil", message: "Quisiera consultar sobre este contrato.", consent: true, website: "" };
  assert.deepEqual(validateConsultation(draft), {});
  assert.deepEqual(validateConsultation({ ...draft, contact: "91383578" }), {});
  assert.deepEqual(validateConsultation({ ...draft, contact: "+59891383578" }), {});
  assert.ok(validateConsultation({ ...draft, name: "A".repeat(101) }).name);
  for (const contact of ["ana@example.com", "+5491138357812", "24123456", "09138", "09 138 3578", "0913835780"]) {
    assert.ok(validateConsultation({ ...draft, contact }).contact, contact);
  }
  assert.ok(validateConsultation({ ...draft, topic: "unlisted" }).topic);
});

test("React Hook Form submits canonical phone values and explicit reset restores the empty form", async () => {
  const initial = createConsultationDraft();
  const form = createFormControl({ resolver: zodResolver(consultationFormSchema), defaultValues: initial });
  const unsubscribe = form.subscribe({ formState: { values: true }, callback: () => {} });
  for (const field of Object.keys(initial)) form.register(field);
  const fields = { ...initial, name: "Ana", contact: "ana@example.com", message: "Consulta de ejemplo para el estudio.", consent: true };
  for (const [field, value] of Object.entries(fields)) form.setValue(field, value);
  let errors;
  await form.handleSubmit(() => assert.fail("Email is not an accepted telephone"), (value) => { errors = value; })();
  assert.ok(errors.contact);
  form.setValue("contact", "091383578");
  let reviewed;
  await form.handleSubmit((value) => { reviewed = value; })();
  assert.equal(reviewed.contact, "+59891383578");
  assert.equal(form.getValues("contact"), "091383578");
  form.reset(createConsultationDraft());
  assert.deepEqual(form.getValues(), createConsultationDraft());
  assert.equal(form.getFieldState("contact").error, undefined);
  assert.equal(form.getValues("consent"), false);
  unsubscribe();
});

const completeDraft = { name: "Ana", contact: "091383578", topic: "civil", message: "Quisiera consultar sobre este contrato.", consent: true, website: "" };

test("an uncertain network failure retries the same payload with the same request ID", async () => {
  const requests = [];
  let attempt = 0;
  const sender = createConsultationSender({
    createRequestId: () => "f5374b7c-95a7-4765-9b3f-9816fa83ba15",
    fetcher: async (url, init) => {
      requests.push({ url, body: JSON.parse(init.body) });
      if (++attempt === 1) throw new Error("private transport detail");
      return Response.json({ ok: true });
    },
  });
  const before = { ...completeDraft };
  const first = await sender.send(completeDraft);
  assert.equal(first.status, "error");
  assert.doesNotMatch(first.message, /private transport detail/);
  assert.equal((await sender.send(completeDraft)).status, "sent");
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, "/api/consultation");
  assert.deepEqual(requests[0].body, requests[1].body);
  assert.equal(requests[0].body.requestId, "f5374b7c-95a7-4765-9b3f-9816fa83ba15");
  assert.equal(requests[0].body.contact, "+59891383578");
  assert.equal("to" in requests[0].body, false);
  assert.deepEqual(completeDraft, before);
});

test("concurrent confirmation and reopening an accepted consultation never resend it", async () => {
  let resolveRequest;
  let requests = 0;
  const states = [];
  const sender = createConsultationSender({
    createRequestId: () => "f5374b7c-95a7-4765-9b3f-9816fa83ba15",
    fetcher: () => {
      requests++;
      return new Promise((resolve) => { resolveRequest = resolve; });
    },
  });
  const first = sender.send(completeDraft, (_, state) => states.push(state.status));
  const second = sender.send({ ...completeDraft });
  assert.equal(sender.stateFor(completeDraft).status, "pending");
  assert.equal(requests, 1);
  resolveRequest(Response.json({ ok: true }));
  await Promise.all([first, second]);
  assert.equal((await sender.send({ ...completeDraft, name: " Ana ", contact: "91383578" })).status, "sent");
  assert.equal(requests, 1);
  assert.deepEqual(states, ["pending", "sent"]);
});

test("an edited consultation gets a new request ID and errors never become success", async () => {
  const requests = [];
  let counter = 0;
  const sender = createConsultationSender({
    createRequestId: () => `request-${++counter}`,
    fetcher: async (_, init) => {
      requests.push(JSON.parse(init.body));
      return Response.json({ ok: false, error: "private provider error" });
    },
  });
  const result = await sender.send(completeDraft);
  assert.equal(result.status, "error");
  assert.doesNotMatch(result.message, /private provider error/);
  await sender.send({ ...completeDraft, message: "Otra pregunta sobre el contrato." });
  assert.notEqual(requests[0].requestId, requests[1].requestId);
});

test("an explicit new consultation clears accepted delivery and allows the same fields with a fresh ID", async () => {
  const requests = [];
  let counter = 0;
  const sender = createConsultationSender({
    createRequestId: () => `request-${++counter}`,
    fetcher: async (_, init) => {
      requests.push(JSON.parse(init.body));
      return Response.json({ ok: true });
    },
  });
  await sender.send(completeDraft);
  await sender.send({ ...completeDraft });
  assert.equal(requests.length, 1);
  assert.equal(sender.reset(), true);
  assert.equal(sender.stateFor(completeDraft).status, "idle");
  await sender.send({ ...completeDraft });
  assert.equal(requests.length, 2);
  assert.notEqual(requests[0].requestId, requests[1].requestId);
});

test("reset is refused throughout a pending send and its eventual result remains recorded", async () => {
  let resolveRequest;
  let requests = 0;
  const states = [];
  const sender = createConsultationSender({
    createRequestId: () => "request-one",
    fetcher: () => {
      requests++;
      return new Promise((resolve) => { resolveRequest = resolve; });
    },
  });
  const sending = sender.send(completeDraft, (_, state) => {
    states.push(state.status);
    if (state.status === "pending") assert.equal(sender.reset(), false);
  });
  assert.equal(sender.reset(), false);
  assert.equal(sender.stateFor(completeDraft).status, "pending");
  const duplicateClick = sender.send(completeDraft);
  resolveRequest(Response.json({ ok: true }));
  await Promise.all([sending, duplicateClick]);
  assert.equal(requests, 1);
  assert.equal(sender.stateFor(completeDraft).status, "sent");
  assert.deepEqual(states, ["pending", "sent"]);
  assert.equal(sender.reset(), true);
  assert.equal(sender.stateFor(completeDraft).status, "idle");
});

test("an upstream duplicate becomes a terminal confirmation state without claiming a new send", async () => {
  let requests = 0;
  const sender = createConsultationSender({
    createRequestId: () => "request-one",
    fetcher: async () => {
      requests++;
      return Response.json({ ok: false, code: "duplicate" }, { status: 409 });
    },
  });
  const result = await sender.send(completeDraft);
  assert.equal(result.status, "duplicate");
  assert.doesNotMatch(result.message, /Consulta enviada/);
  await sender.send(completeDraft);
  assert.equal(requests, 1);
  assert.equal(sender.reset(), true);
  await sender.send(completeDraft);
  assert.equal(requests, 2);
});
