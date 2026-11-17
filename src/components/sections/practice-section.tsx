import { Icon, type IconName } from "@/components/ui/icon";
import { PracticeGuideButton } from "@/components/consultation/practice-guide-button";
import { PRACTICES, type PracticeId } from "@/lib/practice";

const practiceIcons: Record<PracticeId, IconName> = {
  family: "family",
  civil: "document",
  succession: "branch",
  labor: "case",
};

export function PracticeSection() {
  return (
    <section className="practice section-space container" id="areas" aria-labelledby="practice-heading">
      <div className="section-heading-row">
        <div><p className="section-context">Temas de consulta</p><h2 id="practice-heading">¿Qué te trae<br />por acá?</h2></div>
        <p>Encontrá una situación cercana a la tuya. En cada tema podés ver qué información conviene preparar para una primera conversación.</p>
      </div>
      <div className="practice-grid">
        {PRACTICES.map((practice) => (
          <article className={`practice-card card-${practice.id}`} key={practice.id}>
            <div className="card-top"><p className="card-topic">{practice.category}</p><span className="card-icon"><Icon name={practiceIcons[practice.id]} /></span></div>
            <h3>{practice.title}</h3>
            <p>{practice.description}</p>
            <PracticeGuideButton topicId={practice.id} />
          </article>
        ))}
      </div>
      <div className="practice-footnote"><p>Temas orientativos para esta propuesta. Las áreas de atención deben confirmarse con el estudio.</p><a className="text-link" href="#consulta">Quiero consultar por otro tema</a></div>
    </section>
  );
}
