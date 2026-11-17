import { MessageExamples } from "@/components/consultation/message-examples";

const steps = [
  { title: "Contá lo esencial.", description: "Qué ocurrió, en qué punto está la situación y qué te gustaría resolver. Una descripción breve es suficiente." },
  { title: "Anotá tus preguntas.", description: "Separá lo que ya sabés de lo que necesitás consultar. Si tenés documentos, podés indicar cuáles." },
  { title: "Revisá y enviá tu mensaje.", description: "El formulario prepara un resumen. Podés corregirlo y, cuando esté listo, confirmar el envío al estudio." },
] as const;

export function PreparationSection() {
  return (
    <section className="preparation section-space container" id="como-trabajo" aria-labelledby="process-heading">
      <div className="preparation-heading"><p className="section-context">El primer paso</p><h2 id="process-heading">Una consulta<br />bien preparada.</h2></div>
      <div className="preparation-layout">
        <ol className="prep-steps">
          {steps.map((step, index) => <li key={step.title}><span className="step-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}
        </ol>
        <MessageExamples />
      </div>
    </section>
  );
}
