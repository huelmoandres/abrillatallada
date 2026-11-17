import "server-only";

import { CONTACT_EMAIL } from "@/lib/contact";
import { isEmailContact, validateConsultationSubmission } from "@/lib/consultation-contract";
import type { ConsultationSubmission } from "@/lib/consultation-contract";
import { renderConsultationEmail } from "@/lib/email/consultation-template";
import { getPractice } from "@/lib/practice";
import { protectConsultationRequest } from "@/lib/server/consultation-security";
import type { SecurityEnvironment, SecurityFailureStage } from "@/lib/server/consultation-security";

export type MailEnvironment = SecurityEnvironment & {
  BREVO_API_KEY?: string;
  BREVO_SENDER_EMAIL?: string;
  BREVO_SENDER_NAME?: string;
  CONSULTATION_TO_EMAIL?: string;
  SITE_URL?: string;
};

export type MailConfiguration = Readonly<{
  apiKey: string;
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  siteUrl: string;
}>;

const defaultOrigin = "https://abrillatallada.uy";
const maxBodyBytes = 16 * 1024;
const unavailableMessage = `El envío no está disponible en este momento. Podés escribir a ${CONTACT_EMAIL}.`;

function publicOrigin(value: string | undefined): string | null {
  try {
    const url = new URL(value?.trim() || defaultOrigin);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash || url.port) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function singleLine(value: string): boolean {
  return [...value].every((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127);
}

export function resolveMailConfiguration(environment: MailEnvironment): MailConfiguration | null {
  const apiKey = environment.BREVO_API_KEY?.trim() || "";
  const senderEmail = environment.BREVO_SENDER_EMAIL?.trim() ?? "consultas@abrillatallada.uy";
  const senderName = environment.BREVO_SENDER_NAME?.trim() || "Abril Latallada D’Elias";
  const recipientEmail = environment.CONSULTATION_TO_EMAIL?.trim() || CONTACT_EMAIL;
  const siteUrl = publicOrigin(environment.SITE_URL);
  if (!apiKey || /\s/.test(apiKey) || /^(your[_-]?api[_-]?key|replace[_-]?.*|changeme|\.\.\.)$/i.test(apiKey) || !isEmailContact(senderEmail) || !isEmailContact(recipientEmail) || !singleLine(senderName) || senderName.length > 100 || !siteUrl) return null;
  return { apiKey, senderEmail, senderName, recipientEmail, siteUrl };
}

export type MailDelivery = { status: "accepted"; messageId: string } | { status: "duplicate" };

const brevoErrorCodes = [
  "invalid_parameter", "missing_parameter", "out_of_range", "unauthorized",
  "document_not_found", "method_not_allowed", "not_enough_credits",
  "duplicate_parameter", "duplicate_request", "account_under_validation", "permission_denied",
] as const;
type BrevoErrorCode = (typeof brevoErrorCodes)[number] | "unknown";
const knownBrevoErrorCodes = new Set<unknown>(brevoErrorCodes);

export type DeliveryFailureReason = "configuration" | "security" | "provider" | "network" | "timeout" | "invalid_response" | "unexpected";

export type ConsultationDeliveryDiagnostic = Readonly<{
  event: "consultation_delivery_failed";
  requestId: string;
  reason: DeliveryFailureReason;
  responseStatus: number;
  providerStatus?: number;
  providerCode?: BrevoErrorCode;
  securityStage?: SecurityFailureStage;
  securityProviderStatus?: number;
}>;

export type ConsultationDiagnosticLogger = (diagnostic: ConsultationDeliveryDiagnostic) => void;

type MailFailureDetails = { reason?: DeliveryFailureReason; providerStatus?: number; providerCode?: unknown };

function safeProviderCode(code: unknown): BrevoErrorCode {
  return knownBrevoErrorCodes.has(code) ? code as BrevoErrorCode : "unknown";
}

function httpStatus(status: number | undefined): number | undefined {
  return status !== undefined && Number.isInteger(status) && status >= 100 && status <= 599 ? status : undefined;
}

export class ConsultationMailError extends Error {
  readonly kind: "timeout" | "unavailable";
  readonly reason: DeliveryFailureReason;
  readonly providerStatus?: number;
  readonly providerCode?: BrevoErrorCode;
  constructor(kind: "timeout" | "unavailable", details: MailFailureDetails = {}) {
    super("Consultation email could not be confirmed.");
    this.name = "ConsultationMailError";
    this.kind = kind;
    this.reason = details.reason ?? (kind === "timeout" ? "timeout" : "unexpected");
    this.providerStatus = httpStatus(details.providerStatus);
    this.providerCode = details.providerCode === undefined ? undefined : safeProviderCode(details.providerCode);
  }
}

type MailDependencies = { fetcher?: typeof fetch; timeoutMs?: number };

export async function sendConsultationMail(
  configuration: MailConfiguration,
  submission: ConsultationSubmission,
  { fetcher = fetch, timeoutMs = 12_000 }: MailDependencies = {},
): Promise<MailDelivery> {
  const topicLabel = submission.topic === "other" ? "Otra consulta" : submission.topic ? getPractice(submission.topic).category : "A conversar";
  const email = renderConsultationEmail({
    name: submission.name,
    contact: submission.contact,
    topicLabel,
    message: submission.message,
    siteUrl: configuration.siteUrl,
  });
  const timeout = AbortSignal.timeout(timeoutMs);
  let response: Response;
  try {
    response = await fetcher("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json", "api-key": configuration.apiKey },
      body: JSON.stringify({
        sender: { name: configuration.senderName, email: configuration.senderEmail },
        to: [{ email: configuration.recipientEmail, name: "Abril Latallada D’Elias" }],
        ...(isEmailContact(submission.contact) ? { replyTo: { email: submission.contact, name: submission.name } } : {}),
        subject: email.subject,
        htmlContent: email.html,
        textContent: email.text,
        tags: ["abrillatallada", "consulta-web"],
        headers: { idempotencyKey: submission.requestId },
      }),
      cache: "no-store",
      signal: timeout,
    });
  } catch {
    throw new ConsultationMailError(timeout.aborted ? "timeout" : "unavailable", { reason: timeout.aborted ? "timeout" : "network" });
  }

  let result: Record<string, unknown>;
  try {
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid provider response.");
    result = body as Record<string, unknown>;
  } catch {
    throw new ConsultationMailError("unavailable", { reason: "invalid_response", providerStatus: response.status, providerCode: "unknown" });
  }
  if (!response.ok && result.code === "duplicate_parameter") return { status: "duplicate" };
  if (!response.ok) {
    throw new ConsultationMailError("unavailable", { reason: "provider", providerStatus: response.status, providerCode: safeProviderCode(result.code) });
  }
  if (typeof result.messageId !== "string" || !result.messageId.trim()) {
    throw new ConsultationMailError("unavailable", { reason: "invalid_response", providerStatus: response.status, providerCode: "unknown" });
  }
  return { status: "accepted", messageId: result.messageId };
}

type RequestDependencies = MailDependencies & {
  environment?: MailEnvironment;
  logger?: ConsultationDiagnosticLogger;
  securityCheck?: typeof protectConsultationRequest;
  securityFetcher?: typeof fetch;
};

function logDeliveryDiagnostic(diagnostic: ConsultationDeliveryDiagnostic): void {
  console.error(JSON.stringify(diagnostic));
}

function reportDeliveryFailure(logger: ConsultationDiagnosticLogger, diagnostic: ConsultationDeliveryDiagnostic): void {
  try {
    logger(diagnostic);
  } catch {
    // Diagnostics must not change the form's public error response.
  }
}

function processMailEnvironment(): MailEnvironment {
  return {
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL,
    BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME,
    CONSULTATION_TO_EMAIL: process.env.CONSULTATION_TO_EMAIL,
    SITE_URL: process.env.SITE_URL,
    TURNSTILE_SECRET: process.env.TURNSTILE_SECRET,
    TURNSTILE_HOSTNAMES: process.env.TURNSTILE_HOSTNAMES,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    RATE_LIMIT_HASH_SECRET: process.env.RATE_LIMIT_HASH_SECRET,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
  };
}

function jsonResponse(body: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...extraHeaders, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

function isAllowedOrigin(request: Request, siteUrl: string | undefined): boolean {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site") return false;
  try {
    if (new URL(origin).origin !== origin) return false;
    const requestUrl = new URL(request.url);
    const host = request.headers.get("host");
    // Next.js can expose an internal URL whose hostname differs from the browser-facing Host.
    const hostOrigin = host ? new URL(`${requestUrl.protocol}//${host}`).origin : null;
    return origin === requestUrl.origin || origin === hostOrigin || origin === publicOrigin(siteUrl);
  } catch {
    return false;
  }
}

class RequestBodyError extends Error {
  readonly status: 400 | 413;
  constructor(status: 400 | 413) {
    super("Invalid consultation request.");
    this.status = status;
  }
}

async function readRequestBody(request: Request): Promise<unknown> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > maxBodyBytes)) throw new RequestBodyError(413);
  if (!request.body) throw new RequestBodyError(400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBodyBytes) {
        await reader.cancel();
        throw new RequestBodyError(413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError(400);
  } finally {
    reader.releaseLock();
  }
}

export async function handleConsultationRequest(request: Request, { environment = processMailEnvironment(), logger = logDeliveryDiagnostic, securityCheck = protectConsultationRequest, securityFetcher, ...dependencies }: RequestDependencies = {}): Promise<Response> {
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "Usá el formulario para enviar tu consulta." }, 405);
  if (!isAllowedOrigin(request, environment.SITE_URL)) return jsonResponse({ ok: false, error: "No pudimos validar el origen del envío. Abrí el formulario desde la web del estudio." }, 403);
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") || "")) {
    return jsonResponse({ ok: false, error: "El formato del envío no es válido. Volvé a intentar desde el formulario." }, 415);
  }
  let payload: unknown;
  try {
    payload = await readRequestBody(request);
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return jsonResponse({ ok: false, error: status === 413 ? "Tu consulta es demasiado extensa. Resumila y volvé a intentar." : "No pudimos leer el envío. Revisá tu consulta y volvé a intentar." }, status);
  }
  const validation = validateConsultationSubmission(payload);
  if (!validation.ok) return jsonResponse(validation, 422);
  const configuration = resolveMailConfiguration(environment);
  if (!configuration) {
    reportDeliveryFailure(logger, { event: "consultation_delivery_failed", requestId: validation.data.requestId, reason: "configuration", responseStatus: 503 });
    return jsonResponse({ ok: false, error: unavailableMessage }, 503);
  }
  let security: Awaited<ReturnType<typeof protectConsultationRequest>>;
  try {
    const rawToken = payload && typeof payload === "object" && "turnstileToken" in payload ? payload.turnstileToken : undefined;
    security = await securityCheck(request, rawToken, environment, { fetcher: securityFetcher });
  } catch {
    security = { ok: false, status: 503, code: "security_unavailable" };
  }
  if (!security.ok) {
    if (security.status === 503) {
      reportDeliveryFailure(logger, {
        event: "consultation_delivery_failed", requestId: validation.data.requestId, reason: "security", responseStatus: 503,
        ...(security.stage ? { securityStage: security.stage } : {}),
        ...(security.upstreamStatus !== undefined ? { securityProviderStatus: security.upstreamStatus } : {}),
      });
    }
    const error = security.code === "verification_failed"
      ? "No pudimos completar la verificación. Volvé a intentarlo."
      : security.code === "rate_limited"
        ? "Recibimos varios intentos en poco tiempo. Esperá unos minutos o escribinos por email."
        : "No pudimos verificar el envío en este momento. Tu consulta se conserva; podés reintentar o escribirnos por email.";
    const retryAfter = security.retryAfter;
    const headers: Record<string, string> = security.status === 429 && retryAfter !== undefined && Number.isInteger(retryAfter) && retryAfter > 0
      ? { "Retry-After": String(retryAfter) }
      : {};
    return jsonResponse({ ok: false, code: security.code, error }, security.status, headers);
  }
  try {
    const delivery = await sendConsultationMail(configuration, validation.data, dependencies);
    if (delivery.status === "duplicate") {
      return jsonResponse({ ok: false, error: "Esta consulta ya fue procesada por el servicio de correo. Para evitar duplicados, escribí al estudio si necesitás confirmar la recepción.", code: "duplicate" }, 409);
    }
    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    const status = error instanceof ConsultationMailError && error.kind === "timeout" ? 504 : 502;
    reportDeliveryFailure(logger, {
      event: "consultation_delivery_failed",
      requestId: validation.data.requestId,
      reason: error instanceof ConsultationMailError ? error.reason : "unexpected",
      responseStatus: status,
      ...(error instanceof ConsultationMailError && error.providerStatus !== undefined ? { providerStatus: error.providerStatus } : {}),
      ...(error instanceof ConsultationMailError && error.providerCode !== undefined ? { providerCode: error.providerCode } : {}),
    });
    return jsonResponse({ ok: false, error: "No pudimos confirmar el envío. Conservá tu mensaje y volvé a intentar, o escribí directamente al estudio." }, status);
  }
}
