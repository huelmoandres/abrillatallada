"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Dialog, useDialogActions } from "@/components/ui/dialog";
import { getPractice } from "@/lib/practice";
import type { PracticeId } from "@/lib/practice";
import { CONTACT_EMAIL_URL } from "@/lib/contact";
import { useConsultationActions, useConsultationModal } from "./consultation-provider";

function PracticeStart({ topicId }: { topicId: PracticeId }) {
  const { selectTopic } = useConsultationActions();
  const { close } = useDialogActions();
  return <a className="button button-primary" id="practice-start" href="#consulta" onClick={() => { selectTopic(topicId); close({ motion: "none" }); }}>Preparar mi consulta <Icon name="arrow" /></a>;
}

function ReviewContent({ message }: { message: string }) {
  const previewRef = useRef<HTMLPreElement>(null);
  const [status, setStatus] = useState("");
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
    setStatus("Resumen preparado para descargar. El mensaje no fue enviado.");
  }

  return (
    <>
      <Dialog.Close className="dialog-close" aria-label="Cerrar resumen">×</Dialog.Close>
      <span className="dialog-symbol"><Icon name="check" /></span>
      <p className="dialog-context">Paso 2 de 2</p>
      <Dialog.Title>Revisá tu consulta.</Dialog.Title>
      <Dialog.Description>Continuar por email abre tu aplicación de correo con este resumen. Revisalo y enviá el mensaje desde allí. También podés copiarlo o descargarlo. El mensaje todavía no fue enviado.</Dialog.Description>
      <pre id="message-preview" ref={previewRef}>{message}</pre>
      <Dialog.Footer className="review-actions">
        <a className="button button-primary review-email" id="continue-email" href={emailUrl}>Continuar por email <Icon name="arrow" /></a>
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
      <ReviewContent message={modal.message} />
    </Dialog.Root>
  );
}
