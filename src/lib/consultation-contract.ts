import { z } from "zod";

export const CONSULTATION_LIMITS = { name: 100, contact: 12, message: 3000 } as const;

const nameError = "Escribí tu nombre, en un máximo de 100 caracteres.";
const phoneError = "Ingresá un celular uruguayo de 8 dígitos que empiece con 9, o de 9 dígitos con el 0 inicial.";
const messageError = "Contame tu situación en entre 10 y 3000 caracteres, sin contar espacios al inicio o al final.";
const consentError = "Confirmá que aceptás enviar estos datos al estudio para responder tu consulta.";
const requestError = "No pudimos validar el envío. Actualizá la página y volvé a intentar.";

export function normalizeUruguayMobile(value: string): string | null {
  const candidate = value.trim();
  if (/^\+5989\d{7}$/.test(candidate)) return candidate;
  if (!/^0?9\d{7}$/.test(candidate)) return null;
  return `+598${candidate.startsWith("0") ? candidate.slice(1) : candidate}`;
}

export const normalizeConsultationPhone = normalizeUruguayMobile;

function singleLine(value: string): boolean {
  return [...value].every((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127);
}

export const consultationFieldsSchema = z.object({
  name: z.string({ error: nameError }).max(CONSULTATION_LIMITS.name, nameError).trim().min(1, nameError).refine(singleLine, nameError),
  contact: z.string({ error: phoneError }).trim().max(CONSULTATION_LIMITS.contact, phoneError)
    .refine((value) => normalizeUruguayMobile(value) !== null, phoneError)
    .transform((value) => normalizeUruguayMobile(value) as string),
  topic: z.enum(["family", "civil", "succession", "labor", "other", ""], { error: "Elegí un tema de la lista o indicá otra consulta." }),
  message: z.string({ error: messageError }).max(CONSULTATION_LIMITS.message, messageError).trim().min(10, messageError).refine((value) => !value.includes("\0"), messageError),
  consent: z.boolean({ error: consentError }).refine((value) => value, consentError).transform(() => true as const),
});

export const consultationFormSchema = consultationFieldsSchema.extend({
  website: z.string({ error: requestError }).max(0, requestError),
});

export const consultationSubmissionSchema = consultationFormSchema.extend({
  requestId: z.uuid({ error: requestError }).transform((value) => value.toLowerCase()),
});

export type ConsultationTopic = z.input<typeof consultationFieldsSchema>["topic"];
export type ConsultationFields = z.input<typeof consultationFieldsSchema>;
export type ConsultationFormInput = z.input<typeof consultationFormSchema>;
export type ConsultationFormValues = z.output<typeof consultationFormSchema>;
export type ConsultationSubmission = z.output<typeof consultationSubmissionSchema>;
export type ConsultationFieldErrors = Partial<Record<keyof ConsultationFields, string>>;

const mailAddressSchema = z.email().max(254);

export function isEmailContact(value: string): boolean {
  return mailAddressSchema.safeParse(value).success;
}

type ValidationIssue = { readonly path: readonly PropertyKey[]; readonly message: string };

function fieldErrorsFromIssues(issues: readonly ValidationIssue[]): ConsultationFieldErrors {
  const errors: ConsultationFieldErrors = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === "string" && ["name", "contact", "topic", "message", "consent"].includes(field)) {
      const key = field as keyof ConsultationFields;
      errors[key] ??= issue.message;
    }
  }
  return errors;
}

export function validateConsultationFields(fields: ConsultationFields): ConsultationFieldErrors {
  const result = consultationFieldsSchema.safeParse(fields);
  return result.success ? {} : fieldErrorsFromIssues(result.error.issues);
}

type SubmissionValidation =
  | { ok: true; data: ConsultationSubmission }
  | { ok: false; error: string; fieldErrors?: ConsultationFieldErrors };

export function validateConsultationSubmission(raw: unknown): SubmissionValidation {
  const result = consultationSubmissionSchema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors = fieldErrorsFromIssues(result.error.issues);
  if (Object.keys(fieldErrors).length) {
    return { ok: false, error: "Revisá los campos indicados antes de enviar tu consulta.", fieldErrors };
  }
  return { ok: false, error: requestError };
}
