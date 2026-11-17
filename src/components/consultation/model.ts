import type { PracticeId } from "@/lib/practice";

export type ConsultationTopic = PracticeId | "other" | "";
export type ConsultationDraft = {
  name: string;
  contact: string;
  topic: ConsultationTopic;
  message: string;
  consent: boolean;
};
export type TextField = "name" | "contact" | "message";
export type DraftErrors = Partial<Record<TextField | "consent", string>>;
export type ExampleFeedback = "idle" | "applied" | "preserved";
export type DraftState = { draft: ConsultationDraft; exampleFeedback: ExampleFeedback };
export type DraftAction =
  | { type: "text"; field: TextField; value: string }
  | { type: "topic"; value: ConsultationTopic }
  | { type: "consent"; value: boolean }
  | { type: "example"; topic: PracticeId; message: string }
  | { type: "clear-example-feedback" };

export function createDraftState(): DraftState {
  return {
    draft: { name: "", contact: "", topic: "", message: "", consent: false },
    exampleFeedback: "idle",
  };
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

export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case "text":
      return { ...state, draft: { ...state.draft, [action.field]: action.value } };
    case "topic":
      return { ...state, draft: { ...state.draft, topic: action.value } };
    case "consent":
      return { ...state, draft: { ...state.draft, consent: action.value } };
    case "example": {
      const result = applyExampleToDraft(state.draft, action);
      return { draft: result.draft, exampleFeedback: result.applied ? "applied" : "preserved" };
    }
    case "clear-example-feedback":
      return state.exampleFeedback === "idle" ? state : { ...state, exampleFeedback: "idle" };
  }
}

export function validateConsultation(draft: ConsultationDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.name.trim()) errors.name = "Escribí tu nombre para continuar.";
  if (!draft.contact.trim()) errors.contact = "Indicá un email o teléfono de contacto.";
  if (draft.message.trim().length < 10) {
    errors.message = "Contame tu situación en al menos 10 caracteres, sin contar espacios al inicio o al final.";
  }
  if (!draft.consent) errors.consent = "Confirmá que entendés cómo se prepara el mensaje.";
  return errors;
}

export function formatConsultation(draft: ConsultationDraft, topicLabel: string): string {
  return [
    "Consulta para Abril Latallada D’Elias",
    "",
    `Nombre: ${draft.name.trim()}`,
    `Contacto: ${draft.contact.trim()}`,
    `Tema: ${topicLabel}`,
    "",
    draft.message.trim(),
    "",
    "Mensaje preparado, pendiente de compartir con el estudio.",
  ].join("\n");
}
