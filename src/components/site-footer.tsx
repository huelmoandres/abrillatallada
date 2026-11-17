import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import { CONTACT_EMAIL, CONTACT_EMAIL_URL, INSTAGRAM_HANDLE, INSTAGRAM_URL, LINKEDIN_URL, OFFICE_MAP_URL } from "@/lib/contact";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top"><a href="#inicio" aria-label="Volver al inicio"><Image src="/brand/logo-dark.png" alt="Abril Latallada D’Elias · Abogada" width={170} height={88} sizes="170px" /></a><p>Asesoramiento jurídico,<br />de persona a persona.</p><a className="footer-invitation" href="#consulta" aria-label="Preparar una consulta"><span className="footer-invitation-icon"><Icon name="chat" /></span><span><span className="footer-invitation-context">¿Lo conversamos?</span><strong>Preparar mi consulta</strong></span></a></div>
        <nav className="footer-contact-links" aria-label="Contacto del estudio">
          <a href={OFFICE_MAP_URL} target="_blank" rel="noopener noreferrer" aria-label="Cómo llegar al estudio en Google Maps (se abre en una pestaña nueva)"><Icon name="pin" /><span>Cómo llegar</span></a>
          <a href={CONTACT_EMAIL_URL}><Icon name="mail" /><span>{CONTACT_EMAIL}</span></a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label={`Instagram ${INSTAGRAM_HANDLE} (se abre en una pestaña nueva)`}><Icon name="instagram" /><span>Instagram</span></a>
          <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn de Abril Latallada D’Elías (se abre en una pestaña nueva)"><Icon name="linkedin" /><span>LinkedIn</span></a>
        </nav>
        <div className="footer-bottom"><span>© Abril Latallada D’Elias</span><span>Abogada en Rocha, Uruguay</span></div>
        <p className="footer-proposal">La información de esta web es general. Cada consulta se evalúa de forma individual.</p>
      </div>
    </footer>
  );
}
