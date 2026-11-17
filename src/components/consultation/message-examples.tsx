"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { getPractice } from "@/lib/practice";
import type { PracticeId } from "@/lib/practice";
import { useConsultationActions, useExampleFeedback } from "./consultation-provider";

const EXAMPLE_TOPICS: readonly { id: PracticeId; label: string }[] = [
  { id: "civil", label: "Un contrato" },
  { id: "family", label: "Familia" },
  { id: "succession", label: "Una herencia" },
  { id: "labor", label: "Trabajo" },
];
const FEEDBACK = {
  idle: "",
  applied: "El inicio de ejemplo ya está en tu consulta. Adaptalo a tu situación antes de continuar.",
  preserved: "Tu mensaje y los datos que ya habías completado se conservaron.",
};

export function MessageExamples() {
  const [selected, setSelected] = useState<PracticeId>("civil");
  const { applyExample, clearExampleFeedback } = useConsultationActions();
  const feedback = useExampleFeedback();
  const practice = getPractice(selected);

  return (
    <div className="example-card">
      <div className="example-heading"><Icon name="chat" /><h3>Podés empezar así.</h3></div>
      <p className="example-intro">Elegí un tema y probá un inicio de mensaje.</p>
      <div className="example-options" role="group" aria-label="Ejemplos por tema">
        {EXAMPLE_TOPICS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            data-example={id}
            aria-pressed={selected === id}
            className={selected === id ? "is-active" : undefined}
            onClick={() => { setSelected(id); clearExampleFeedback(); }}
          >{label}</button>
        ))}
      </div>
      <p className="example-text" id="example-text" aria-live="polite">{practice.starter}</p>
      <button className="example-use" id="example-use" type="button" onClick={() => applyExample(selected, practice.starter)}>
        Usar este inicio <Icon name="arrow" />
      </button>
      <p className="example-help">Es un inicio de ejemplo. Adaptalo a tu situación.</p>
      <p id="example-status" className="example-status" role="status" aria-live="polite">{FEEDBACK[feedback]}</p>
    </div>
  );
}
