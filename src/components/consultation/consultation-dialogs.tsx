"use client";

import { useRef, useState } from "react";
import type { MouseEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { Dialog, useDialogActions } from "@/components/ui/dialog";
import { getPractice } from "@/lib/practice";
import type { PracticeId } from "@/lib/practice";
import { CONTACT_EMAIL, CONTACT_EMAIL_URL } from "@/lib/contact";
import { useConsultationActions, useConsultationDelivery, useConsultationModal } from "./consultation-provider";
import type { ConsultationDraft } from "./model";

function PracticeStart({ topicId }: { topicId: PracticeId }) {
  const { selectTopic } = useConsultationActions();
  const { close } = useDialogActions();
  return <a className="button button-primary" id="practice-start" href="#consulta" onClick={() => { selectTopic(topicId); close({ motion: "none" }); }}>Preparar mi consulta <Icon name="arrow" /></a>;
}

function ReviewContent({ message, draft }: { message: string; draft: ConsultationDraft }) {
  const previewRef = useRef<HTMLPreElement>(null);
  const [status, setStatus] = useState("");
  const { state, pending } = useConsultationDelivery(draft);
  const { sendConsultation, resetDraft } = useConsultationActions();
  const { close } = useDialogActions();
  const sent = state.status === "sent";
  const processed = sent || state.status === "duplicate";
  const emailUrl = `${CONTACT_EMAIL_URL}?subject=${encodeURIComponent("Consulta jurídica")}&body=${encodeURIComponent(message)}`;

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setStatus("Consulta copiada. Ya podés pegarla en tu mensaje.");
    } catch {
      setStatus("No se pudo copiar. Podés seleccionar el resumen o descargarlo.");
      const selection = window.getSelection();
      if (selection && previewRef.current) {
        const range = document.createRange();
        range.selectNodeContents(previewRef.current);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }

  function downloadMessage() {
    const url = URL.createObjectURL(new Blob([message], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "mi-consulta-abril-latallada.txt";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Resumen preparado para descargar.");
  }

  function prepareAnother(event: MouseEvent<HTMLAnchorElement>) {
    if (!resetDraft()) {
      event.preventDefault();
      return;
    }
    close({ motion: "none" });
    requestAnimationFrame(() => document.getElementById("name")?.focus());
  }

  async function sendReviewedConsultation() {
    await sendConsultation(draft);
    requestAnimationFrame(() => document.getElementById("start-new-consultation")?.focus());
  }

  return (
    <>
      <Dialog.Close className="dialog-close" aria-label={processed ? "Cerrar confirmación" : "Cerrar resumen"}>×</Dialog.Close>
      <span className="dialog-symbol"><Icon name={sent ? "check" : "document"} /></span>
      <p className="dialog-context">{processed ? "Gracias por escribir" : "Paso 2 de 2"}</p>
      <Dialog.Title>{sent ? "Consulta enviada." : state.status === "duplicate" ? "Consulta ya procesada." : "Revisá tu consulta."}</Dialog.Title>
      <Dialog.Description>{sent ? "Tu mensaje ya está en camino al estudio. Abril podrá responderte al teléfono que indicaste." : state.status === "duplicate" ? "Este intento corresponde a una consulta que ya fue procesada. Si necesitás confirmar la recepción, podés escribir directamente al estudio." : "Comprobá que los datos y el mensaje estén correctos. Al confirmar, enviaremos tu consulta al email del estudio."}</Dialog.Description>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{sent ? "Consulta enviada. Tu mensaje está en camino al estudio." : state.status === "duplicate" ? "Consulta ya procesada. Podés confirmar la recepción con el estudio." : ""}</p>
      {sent ? <p className="consultation-sent-recipient"><Icon name="mail" /><span>{CONTACT_EMAIL}</span></p> : null}
      <pre id="message-preview" ref={previewRef}>{message}</pre>
      <Dialog.Footer className="review-actions">
        {processed ? (
          <a className="button button-primary consultation-success-actions" id="start-new-consultation" href="#consulta" aria-disabled={pending} onClick={prepareAnother}>Preparar otra consulta <Icon name="arrow" /></a>
        ) : (
          <button className="button button-primary review-email" id="send-consultation" type="button" disabled={pending} aria-busy={state.status === "pending"} onClick={() => { void sendReviewedConsultation(); }}>
            {pending ? "Enviando consulta…" : state.status === "error" ? "Reintentar envío" : "Enviar consulta"}<Icon name="arrow" />
          </button>
        )}
        {state.status === "pending" ? <p className="consultation-send-status" data-state="pending" role="status">Estamos enviando tu consulta. Esperá la confirmación antes de volver a intentarlo.</p> : null}
        {state.status === "error" ? <div className="consultation-send-status" data-state="error" role="alert"><p>{state.message}</p><a className="text-link" href={emailUrl}>Continuar desde mi correo</a></div> : null}
        {state.status === "duplicate" ? <div className="consultation-send-status" data-state="error"><a className="text-link" href={emailUrl}>Confirmar recepción por email</a></div> : null}
        <div className="review-tools">
          <button className="download-button" type="button" id="copy-message" onClick={copyMessage}>Copiar consulta</button>
          <button className="download-button" type="button" id="download-message" onClick={downloadMessage}>Descargar resumen</button>
        </div>
      </Dialog.Footer>
      <p className="dialog-status" id="copy-status" role="status" aria-live="polite">{status}</p>
    </>
  );
}

export function ConsultationDialogs() {
  const modal = useConsultationModal();
  const { closeModal } = useConsultationActions();
  if (!modal) return null;

  if (modal.kind === "practice") {
    const practice = getPractice(modal.topicId);
    return (
      <Dialog.Root key={modal.topicId} id="practice-dialog" className="practice-dialog" titleId="practice-dialog-title" descriptionId="practice-dialog-description" open onClose={closeModal}>
        <Dialog.Close className="practice-close dialog-close" aria-label="Cerrar guía"><Icon name="close" /></Dialog.Close>
        <p className="dialog-context">Prepará la primera conversación</p>
        <Dialog.Title>{practice.category}</Dialog.Title>
        <Dialog.Description>{practice.guideDescription}</Dialog.Description>
        <h3>Qué conviene tener a mano</h3>
        <ul id="practice-checklist">{practice.checklist.map((item) => <li key={item}>{item}</li>)}</ul>
        <PracticeStart topicId={practice.id} />
        <p className="dialog-note">Guía orientativa. Las áreas de atención deben confirmarse con el estudio.</p>
      </Dialog.Root>
    );
  }

  return (
    <Dialog.Root id="message-dialog" className="message-dialog" titleId="dialog-title" descriptionId="dialog-description" open onClose={closeModal}>
      <ReviewContent key={JSON.stringify(modal.draft)} message={modal.message} draft={modal.draft} />
    </Dialog.Root>
  );
}
