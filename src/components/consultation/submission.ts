import type { ConsultationDraft } from "./model.ts";
import { normalizeConsultationPhone } from "../../lib/consultation-contract.ts";

export type SubmissionState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "sent" }
  | { status: "duplicate"; message: string }
  | { status: "error"; message: string };

const IDLE_STATE: SubmissionState = { status: "idle" };

type SubmissionRecord = {
  requestId: string;
  state: SubmissionState;
  promise?: Promise<SubmissionState>;
};

type StateListener = (fingerprint: string, state: SubmissionState) => void;

function submissionFields(draft: ConsultationDraft) {
  return {
    name: draft.name.trim(),
    contact: normalizeConsultationPhone(draft.contact) ?? draft.contact.trim(),
    topic: draft.topic,
    message: draft.message.trim(),
    consent: draft.consent,
    website: draft.website ?? "",
  };
}

export function consultationFingerprint(draft: ConsultationDraft): string {
  return JSON.stringify(submissionFields(draft));
}

function errorForStatus(status: number): string {
  if (status === 400) return "Revisá los datos de tu consulta antes de volver a enviarla.";
  if (status === 403) return "Recargá la página antes de volver a enviar tu consulta. Tu mensaje se conserva mientras sigas acá.";
  if (status === 413) return "Tu consulta es demasiado extensa. Acortá el mensaje antes de enviarlo.";
  if (status === 429) return "Esperá un momento antes de volver a enviar tu consulta.";
  if (status === 503) return "El envío no está disponible en este momento. Tu consulta se conserva y podés escribirnos por email.";
  return "No pudimos confirmar el envío. Tu consulta se conserva; podés reintentar o escribirnos por email.";
}

export function createConsultationSender({
  fetcher = fetch,
  createRequestId = () => crypto.randomUUID(),
}: {
  fetcher?: typeof fetch;
  createRequestId?: () => string;
} = {}) {
  const records = new Map<string, SubmissionRecord>();

  return {
    stateFor(draft: ConsultationDraft): SubmissionState {
      return records.get(consultationFingerprint(draft))?.state ?? IDLE_STATE;
    },
    reset(): boolean {
      if ([...records.values()].some((record) => record.promise || record.state.status === "pending")) return false;
      records.clear();
      return true;
    },
    async send(draft: ConsultationDraft, onStateChange: StateListener = () => {}): Promise<SubmissionState> {
      const fingerprint = consultationFingerprint(draft);
      let record = records.get(fingerprint);
      if (record?.state.status === "sent" || record?.state.status === "duplicate") return record.state;
      if (record?.promise) return record.promise;

      if (!record) {
        try {
          record = { requestId: createRequestId(), state: IDLE_STATE };
        } catch {
          const state: SubmissionState = { status: "error", message: "No pudimos preparar el envío. Podés continuar desde tu correo." };
          onStateChange(fingerprint, state);
          return state;
        }
        records.set(fingerprint, record);
      }
      const currentRecord = record;
      currentRecord.state = { status: "pending" };
      onStateChange(fingerprint, currentRecord.state);

      async function deliver(): Promise<SubmissionState> {
        try {
          const response = await fetcher("/api/consultation", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...submissionFields(draft), requestId: currentRecord.requestId }),
          });
          const result: unknown = await response.json();
          if (response.status === 409 && result !== null && typeof result === "object" && "code" in result && result.code === "duplicate") {
            return { status: "duplicate", message: "Esta consulta ya fue procesada. Para evitar enviarla dos veces, podés confirmar la recepción directamente con el estudio." };
          }
          if (response.ok && result !== null && typeof result === "object" && "ok" in result && result.ok === true) {
            return { status: "sent" };
          }
          return { status: "error", message: errorForStatus(response.status) };
        } catch {
          return { status: "error", message: errorForStatus(0) };
        }
      }

      currentRecord.promise = deliver().then((state) => {
        currentRecord.state = state;
        currentRecord.promise = undefined;
        onStateChange(fingerprint, state);
        return state;
      });
      return currentRecord.promise;
    },
  };
}
