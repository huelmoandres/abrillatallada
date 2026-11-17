"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { PRACTICES, getPractice } from "@/lib/practice";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatConsultation, validateConsultation } from "./model";
import type { ConsultationTopic } from "./model";
import { useConsultationActions, useConsultationDraft, useMessageFieldRef } from "./consultation-provider";
import "./consultation-fields.css";

export function ConsultationForm() {
  const draft = useConsultationDraft();
  const { updateText, selectTopic, setConsent, showReview } = useConsultationActions();
  const messageFieldRef = useMessageFieldRef();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const errors = hasSubmitted ? validateConsultation(draft) : {};
  const hydrated = useHydrated();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateConsultation(draft);
    setHasSubmitted(true);
    const firstInvalid = Object.keys(nextErrors)[0];
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }
    const topicLabel = draft.topic === "other" ? "Otra consulta" : draft.topic ? getPractice(draft.topic).category : "A conversar";
    showReview(formatConsultation(draft, topicLabel));
  }

  return (
    <form className="consultation-form" id="consultation-form" onSubmit={submit}>
      <div className="form-top"><h3>Tu mensaje.</h3><span>Paso 1 de 2</span></div>
      <p className="form-intro">Después vas a poder revisarlo.</p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">Tu nombre <span aria-hidden="true">*</span></label>
          <div className="input-shell">
            <Icon name="person" className="input-icon" aria-hidden="true" focusable="false" />
            <input id="name" name="name" autoComplete="name" required maxLength={100} placeholder="¿Cómo te llamás?" value={draft.name} onChange={(event) => updateText("name", event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} />
          </div>
          {errors.name ? <p className="field-note" id="name-error" role="alert">{errors.name}</p> : null}
        </div>
        <div className="field">
          <label htmlFor="contact">Email o teléfono <span aria-hidden="true">*</span></label>
          <div className="input-shell">
            <Icon name="mail" className="input-icon" aria-hidden="true" focusable="false" />
            <input id="contact" name="contact" autoComplete="email" required maxLength={150} placeholder="Tu medio de contacto" value={draft.contact} onChange={(event) => updateText("contact", event.target.value)} aria-invalid={Boolean(errors.contact)} aria-describedby={errors.contact ? "contact-error" : undefined} />
          </div>
          {errors.contact ? <p className="field-note" id="contact-error" role="alert">{errors.contact}</p> : null}
        </div>
      </div>
      <div className="field">
        <label htmlFor="area">Tema de la consulta</label>
        <select id="area" name="area" value={draft.topic} onChange={(event) => selectTopic(event.target.value as ConsultationTopic)}>
          <option value="">No estoy seguro/a</option>
          {PRACTICES.map((practice) => <option key={practice.id} value={practice.id}>{practice.category}</option>)}
          <option value="other">Otra consulta</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="message">¿Qué te gustaría resolver? <span aria-hidden="true">*</span></label>
        <textarea ref={messageFieldRef} id="message" name="message" required minLength={10} maxLength={3000} rows={4} aria-describedby={errors.message ? "message-help message-error" : "message-help"} aria-invalid={Boolean(errors.message)} placeholder="Contame qué pasa y cuál es tu principal pregunta..." value={draft.message} onChange={(event) => updateText("message", event.target.value)} />
        <p className="field-note" id="message-help">Una descripción general alcanza. Evitá incluir información sensible.</p>
        {errors.message ? <p className="field-note" id="message-error" role="alert">{errors.message}</p> : null}
      </div>
      <label className="consent"><input id="consent" type="checkbox" required checked={draft.consent} onChange={(event) => setConsent(event.target.checked)} aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? "consent-error" : undefined} /><span>Entiendo que el mensaje se prepara en mi dispositivo y que debo revisarlo y enviarlo desde mi correo.</span></label>
      {errors.consent ? <p className="field-note" id="consent-error" role="alert">{errors.consent}</p> : null}
      <button className="button button-primary form-submit" type="submit" disabled={!hydrated}>Revisar mi consulta <Icon name="arrow" /></button>
      <noscript><p className="field-note">Activá JavaScript para preparar el resumen en tu dispositivo. Este formulario no envía consultas al estudio.</p></noscript>
    </form>
  );
}
