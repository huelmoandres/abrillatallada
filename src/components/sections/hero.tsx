import Image from "next/image";
import portraitImage from "../../../public/images/abril-graduation-original.jpeg";
import { Icon } from "@/components/ui/icon";

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-heading">
      <div className="container hero-layout">
        <div className="hero-copy">
          <h1 id="hero-heading">
            <span className="hero-context"><Icon name="pin" />Abogada en Rocha, Uruguay</span>
            Hablemos de<br />lo que necesitás<br />resolver.
          </h1>
          <p className="hero-description">Un contrato, un acuerdo familiar o una situación de trabajo. Empecemos por lo que te preocupa y las preguntas que querés resolver.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#consulta">Preparar mi consulta <Icon name="arrow" /></a>
            <a className="text-link" href="#como-trabajo">Cómo empezar</a>
          </div>
          <div className="hero-person"><span className="person-line" aria-hidden="true" /><p>Atención directa con<br /><strong>Abril Latallada D’Elias</strong></p></div>
        </div>
        <figure className="hero-visual">
          <div className="hero-image">
            <Image src={portraitImage} alt="Abril Latallada D’Elias sosteniendo su título de abogada" sizes="(max-width: 650px) calc(100vw - 48px), (max-width: 1280px) 46vw, 588px" preload placeholder="blur" />
          </div>
          <div className="hero-image-note"><span className="note-mark" aria-hidden="true"><Icon name="document" /></span><div><strong>Tu consulta,<br />con atención personal.</strong><span>Abril Latallada D’Elias · Abogada</span></div></div>
          <figcaption>Rocha, Uruguay · Atención directa</figcaption>
        </figure>
      </div>
    </section>
  );
}
