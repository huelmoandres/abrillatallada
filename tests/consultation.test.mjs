import assert from "node:assert/strict";
import test from "node:test";
import {
  applyExampleToDraft,
  createDraftState,
  draftReducer,
  formatConsultation,
  validateConsultation,
} from "../src/components/consultation/model.ts";

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

test("a valid example clears current validation errors after a whitespace-only message", () => {
  const state = { draft: { name: "Ana", contact: "099123456", topic: "labor", message: "          ", consent: true }, exampleFeedback: "idle" };
  assert.deepEqual(Object.keys(validateConsultation(state.draft)), ["message"]);
  const updated = draftReducer(state, { type: "example", topic: "family", message: "Quisiera consultar sobre mi familia…" });
  assert.deepEqual(validateConsultation(updated.draft), {});
  assert.equal(updated.draft.topic, "labor");
});

test("validation rejects whitespace-only identity/contact and a short trimmed message", () => {
  const draft = { name: "  ", contact: " \t ", topic: "civil", message: "   abcdefghi   ", consent: false };
  assert.deepEqual(Object.keys(validateConsultation(draft)), ["name", "contact", "message", "consent"]);
});

test("validation accepts a complete local consultation and formatting trims without inventing delivery", () => {
  const draft = { name: " Ana ", contact: " ana@example.com ", topic: "civil", message: "  Mi consulta sobre el contrato.  ", consent: true };
  assert.deepEqual(validateConsultation(draft), {});
  const message = formatConsultation(draft, "Derecho civil");
  assert.match(message, /Nombre: Ana\nContacto: ana@example.com\nTema: Derecho civil/);
  assert.match(message, /\nMi consulta sobre el contrato\.\n/);
  assert.match(message, /Mensaje preparado, pendiente de compartir con el estudio\.$/);
});

test("reducer records example feedback without replacing a previously written message", () => {
  const initial = createDraftState();
  const withDraft = draftReducer(initial, { type: "text", field: "message", value: "Mensaje existente" });
  const result = draftReducer(withDraft, { type: "example", topic: "labor", message: "Otro mensaje" });
  assert.equal(result.exampleFeedback, "preserved");
  assert.equal(result.draft, withDraft.draft);
  assert.equal(result.draft.topic, "");
});
