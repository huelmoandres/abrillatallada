import type { PracticeId } from "@/lib/practice";
import { normalizeConsultationPhone, validateConsultationFields } from "../../lib/consultation-contract.ts";
import type { ConsultationFieldErrors, ConsultationFields } from "../../lib/consultation-contract.ts";

export type ConsultationTopic = PracticeId | "other" | "";
export type ConsultationDraft = ConsultationFields & { website: string };
export type DraftErrors = ConsultationFieldErrors;
export type ExampleFeedback = "idle" | "applied" | "preserved";

export function createConsultationDraft(): ConsultationDraft {
  return { name: "", contact: "", topic: "", message: "", consent: false, website: "" };
}

export function applyExampleToDraft(
  draft: ConsultationDraft,
  example: { topic: PracticeId; message: string },
): { draft: ConsultationDraft; applied: boolean } {
  if (draft.message.trim()) return { draft, applied: false };
  return {
    draft: { ...draft, topic: draft.topic || example.topic, message: example.message },
    applied: true,
  };
}

export function validateConsultation(draft: ConsultationDraft): DraftErrors {
  return validateConsultationFields(draft);
}

export function formatConsultation(draft: ConsultationDraft, topicLabel: string): string {
  return [
    "Consulta para Abril Latallada D’Elias",
    "",
    `Nombre: ${draft.name.trim()}`,
    `Teléfono: ${normalizeConsultationPhone(draft.contact) ?? draft.contact.trim()}`,
    `Tema: ${topicLabel}`,
    "",
    draft.message.trim(),
  ].join("\n");
}
