"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { CONTACT_EMAIL, CONTACT_EMAIL_URL } from "@/lib/contact";

function WhatsAppIcon() {
  return (
    <svg className="whatsapp-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.5L3 20.5l1.3-4.8A8.5 8.5 0 1 1 20.5 11.7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m8.3 7.7.8-.1c.2 0 .4.1.5.4l.8 1.8c.1.2.1.4-.1.6l-.6.8c.7 1.4 1.8 2.4 3.2 3.1l.8-.9c.2-.2.4-.2.6-.1l1.8.9c.2.1.3.3.3.5-.1 1.1-.8 1.8-1.8 1.8-3.6-.3-7.2-3.8-7.4-7.1 0-.7.4-1.4 1.1-1.7Z" fill="currentColor" />
    </svg>
  );
}

export function FloatingWhatsApp({ whatsappUrl }: { whatsappUrl: string | null }) {
  const [open, setOpen] = useState(false);

  if (whatsappUrl) {
    return (
      <a className="whatsapp-float" href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="Consultar por WhatsApp (se abre en una pestaña nueva)">
        <WhatsAppIcon />
        <span>WhatsApp</span>
      </a>
    );
  }

  return (
    <>
      <button className="whatsapp-float" type="button" aria-label="WhatsApp: disponible próximamente" aria-haspopup="dialog" aria-controls="whatsapp-dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <WhatsAppIcon />
        <span>WhatsApp<span className="whatsapp-float-note">Próximamente</span></span>
      </button>
      <Dialog.Root id="whatsapp-dialog" className="whatsapp-dialog" titleId="whatsapp-dialog-title" descriptionId="whatsapp-dialog-description" open={open} onClose={() => setOpen(false)}>
          <Dialog.Close className="dialog-close" aria-label="Cerrar información de WhatsApp"><Icon name="close" /></Dialog.Close>
          <span className="dialog-symbol"><WhatsAppIcon /></span>
          <p className="dialog-context">Contacto directo</p>
          <Dialog.Title className="whatsapp-dialog-heading">Hablemos de tu consulta.</Dialog.Title>
          <Dialog.Description className="whatsapp-dialog-copy">WhatsApp estará disponible próximamente. Mientras tanto, podés escribir por email.</Dialog.Description>
          <Dialog.Footer>
            <a className="button button-primary" href={CONTACT_EMAIL_URL}>Escribir por email <Icon name="arrow" /></a>
          </Dialog.Footer>
          <p className="dialog-note">{CONTACT_EMAIL}</p>
      </Dialog.Root>
    </>
  );
}
