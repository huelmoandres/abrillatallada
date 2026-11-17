import { Icon } from "@/components/ui/icon";
import { ConsultationForm } from "@/components/consultation/consultation-form";
import { CONTACT_EMAIL, CONTACT_EMAIL_URL, INSTAGRAM_HANDLE, INSTAGRAM_URL, LINKEDIN_URL, OFFICE_ADDRESS, OFFICE_LOCALITY, OFFICE_MAP_URL } from "@/lib/contact";

export function ContactSection() {
  return (
    <section className="contact section-space container" id="consulta" aria-labelledby="contact-heading">
      <div className="contact-layout">
        <div className="contact-intro">
          <p className="section-context">Tu primera consulta</p><h2 id="contact-heading">Empecemos por<br />lo que te<br />preocupa.</h2>
          <p className="contact-description">Completá lo esencial, revisá el resumen y confirmá el envío al estudio. No hace falta escribir una explicación jurídica.</p>
          <address className="contact-place">
            <Icon name="pin" />
            <div className="contact-place-copy">
              <span className="contact-place-street">{OFFICE_ADDRESS.streetAddress}</span>
              <span className="contact-place-locality">{OFFICE_LOCALITY}</span>
              <a className="text-link" href={OFFICE_MAP_URL} target="_blank" rel="noopener noreferrer" aria-label="Ver ubicación del estudio en Google Maps (se abre en una pestaña nueva)">Ver ubicación en Google Maps</a>
            </div>
          </address>
          <ul className="contact-channel-list" aria-label="Canales de contacto">
            <li>
              <a className="contact-channel" href={CONTACT_EMAIL_URL}>
                <span className="contact-channel-icon"><Icon name="mail" /></span>
                <span className="contact-channel-copy"><span className="contact-channel-label">Email</span><span className="contact-channel-value">{CONTACT_EMAIL}</span></span>
                <Icon name="arrow" />
              </a>
            </li>
            <li>
              <a className="contact-channel" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label={`Instagram ${INSTAGRAM_HANDLE} (se abre en una pestaña nueva)`}>
                <span className="contact-channel-icon"><Icon name="instagram" /></span>
                <span className="contact-channel-copy"><span className="contact-channel-label">Instagram</span><span className="contact-channel-value">{INSTAGRAM_HANDLE}</span></span>
                <Icon name="arrow" />
              </a>
            </li>
            <li>
              <a className="contact-channel" href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn de Abril Latallada D’Elías (se abre en una pestaña nueva)">
                <span className="contact-channel-icon"><Icon name="linkedin" /></span>
                <span className="contact-channel-copy"><span className="contact-channel-label">LinkedIn</span><span className="contact-channel-value">Perfil profesional</span></span>
                <Icon name="arrow" />
              </a>
            </li>
          </ul>
          <div className="contact-privacy"><Icon name="lock" /><p>Tu consulta se envía al email del estudio cuando confirmás. Compartí solo lo necesario para una primera conversación.</p></div>
        </div>
        <ConsultationForm />
      </div>
    </section>
  );
}
