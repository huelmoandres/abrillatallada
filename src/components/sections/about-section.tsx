export function AboutSection() {
  return (
    <section className="about" id="sobre-mi" aria-labelledby="about-heading">
      <div className="container about-layout section-space">
        <div className="about-copy">
          <p className="section-context">El estudio</p><h2 id="about-heading">Abril Latallada<br />D’Elias.</h2>
          <p className="about-role">Abogada en Rocha, Uruguay.</p>
          <p>Podés acercar tu consulta con tus palabras, aunque todavía no sepas a qué área corresponde. La primera conversación permite ubicar la situación y ordenar las preguntas.</p>
          <p>Mi propuesta es una atención personal: entender el contexto, explicar las alternativas y conversar sobre el alcance del trabajo antes de comenzar.</p>
          <a className="text-link" href="#consulta">Preparar mi consulta</a>
        </div>
        <div className="about-portraits" aria-label="Fotografías de Abril">
          <figure className="about-portrait-main">
            <Image src={graduationImage} alt="Abril Latallada D’Elias sosteniendo su título de abogada" sizes="(max-width: 650px) 65vw, (max-width: 880px) 28vw, 305px" placeholder="blur" />
            <figcaption>Vocación y<br />cercanía.</figcaption>
          </figure>
          <figure className="about-portrait-detail">
            <Image src={consultationImage} alt="Retrato de Abril Latallada D’Elias en una sala del Poder Judicial" sizes="(max-width: 650px) 46vw, (max-width: 880px) 22vw, 245px" placeholder="blur" />
          </figure>
          <span className="portrait-accent" aria-hidden="true">A.L.</span>
        </div>
      </div>
    </section>
  );
}
import Image from "next/image";
import consultationImage from "../../../public/images/abril-consultation-v1.jpg";
import graduationImage from "../../../public/images/abril-graduation-original.jpeg";
