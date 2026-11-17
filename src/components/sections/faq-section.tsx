const questions = [
  { question: "¿Tengo que saber qué tipo de consulta es?", answer: "No. Explicá lo que sucede con tus palabras. No necesitás elegir un término jurídico para preparar el mensaje." },
  { question: "¿Qué conviene contar en el primer mensaje?", answer: "Una descripción breve de lo que pasó, la situación actual y tu principal pregunta. Evitá incluir información sensible." },
  { question: "¿Tengo que adjuntar documentos?", answer: "Este formulario no recibe archivos. Podés indicar qué documentos tenés y consultar después cómo revisarlos." },
  { question: "¿El formulario envía mi consulta al estudio?", answer: "El formulario prepara un resumen para que puedas revisarlo, copiarlo o descargarlo. Después podés enviarlo por email a dra.latallada@gmail.com. No se envía automáticamente." },
] as const;

export function FaqSection() {
  return (
    <section className="faq section-space" id="preguntas" aria-labelledby="faq-heading">
      <div className="container faq-layout">
        <div className="faq-heading"><p className="section-context">Preguntas frecuentes</p><h2 id="faq-heading">Antes de<br />dar el paso.</h2><p>Lo que conviene saber para preparar tu consulta.</p></div>
        <div className="faq-list">
          {questions.map((item) => <details key={item.question}><summary>{item.question}<span className="expand-icon" aria-hidden="true" /></summary><div className="faq-answer"><p>{item.answer}</p></div></details>)}
        </div>
      </div>
    </section>
  );
}
