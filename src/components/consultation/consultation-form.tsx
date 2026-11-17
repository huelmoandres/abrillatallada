"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Icon } from "@/components/ui/icon";
import { TopicSelect } from "@/components/ui/topic-select";
import { getPractice } from "@/lib/practice";
import { CONTACT_EMAIL, CONTACT_EMAIL_URL } from "@/lib/contact";
import type { ConsultationFormInput, ConsultationFormValues } from "@/lib/consultation-contract";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatConsultation } from "./model";
import { useConsultationActions, useMessageFieldRef } from "./consultation-provider";
import "./consultation-fields.css";

export function ConsultationForm() {
  const { register, control, handleSubmit, formState: { errors } } = useFormContext<ConsultationFormInput, unknown, ConsultationFormValues>();
  const { showReview } = useConsultationActions();
  const messageFieldRef = useMessageFieldRef();
  const { ref: messageRegistrationRef, ...messageRegistration } = register("message");
  const hydrated = useHydrated();

  function review(values: ConsultationFormValues) {
    const draft = { ...values, website: values.website ?? "" };
    const topicLabel = draft.topic === "other" ? "Otra consulta" : draft.topic ? getPractice(draft.topic).category : "A conversar";
    showReview(draft, formatConsultation(draft, topicLabel));
  }

  return (
    <form className="consultation-form" id="consultation-form" noValidate onSubmit={handleSubmit(review)}>
      <div className="form-top"><h3>Tu mensaje.</h3><span>Paso 1 de 2</span></div>
      <p className="form-intro">Primero revisás el resumen. Después confirmás el envío al estudio.</p>
      <div className="consultation-honeypot" aria-hidden="true">
        <label htmlFor="website">Dejá este campo vacío</label>
        <input id="website" type="text" autoComplete="off" tabIndex={-1} {...register("website")} />
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">Tu nombre <span aria-hidden="true">*</span></label>
          <div className="input-shell">
            <Icon name="person" className="input-icon" aria-hidden="true" focusable="false" />
            <input id="name" autoComplete="name" required maxLength={100} placeholder="¿Cómo te llamás?" {...register("name")} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} />
          </div>
          {errors.name ? <p className="field-note" id="name-error" role="alert">{errors.name.message}</p> : null}
        </div>
        <div className="field">
          <label htmlFor="contact">Teléfono de contacto <span aria-hidden="true">*</span></label>
          <div className="input-shell phone-input-shell">
            <Icon name="phone" className="input-icon" aria-hidden="true" focusable="false" />
            <span className="phone-prefix" aria-hidden="true">+598</span>
            <input id="contact" type="tel" inputMode="numeric" autoComplete="tel-national" required maxLength={9} placeholder="091383578" {...register("contact")} aria-invalid={Boolean(errors.contact)} aria-describedby={errors.contact ? "contact-help contact-error" : "contact-help"} />
          </div>
          <p className="field-note" id="contact-help">Uruguay (+598). Escribí tu celular con o sin el 0 inicial.</p>
          {errors.contact ? <p className="field-note" id="contact-error" role="alert">{errors.contact.message}</p> : null}
        </div>
      </div>
      <div className="field">
        <label htmlFor="area">Tema de la consulta</label>
        <Controller name="topic" control={control} render={({ field }) => (
          <TopicSelect id="area" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} ref={field.ref} invalid={Boolean(errors.topic)} describedBy={errors.topic ? "area-error" : undefined} />
        )} />
        {errors.topic ? <p className="field-note" id="area-error" role="alert">{errors.topic.message}</p> : null}
      </div>
      <div className="field">
        <label htmlFor="message">¿Qué te gustaría resolver? <span aria-hidden="true">*</span></label>
        <textarea {...messageRegistration} ref={(element) => { messageRegistrationRef(element); messageFieldRef.current = element; }} id="message" required minLength={10} maxLength={3000} rows={4} aria-describedby={errors.message ? "message-help message-error" : "message-help"} aria-invalid={Boolean(errors.message)} placeholder="Contame qué pasa y cuál es tu principal pregunta..." />
        <p className="field-note" id="message-help">Una descripción general alcanza. Evitá incluir información sensible.</p>
        {errors.message ? <p className="field-note" id="message-error" role="alert">{errors.message.message}</p> : null}
      </div>
      <label className="consent"><input id="consent" type="checkbox" required {...register("consent")} aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? "consent-error" : undefined} /><span>Autorizo el envío de estos datos al estudio por email para que puedan responder mi consulta.</span></label>
      {errors.consent ? <p className="field-note" id="consent-error" role="alert">{errors.consent.message}</p> : null}
      <button className="button button-primary form-submit" type="submit" disabled={!hydrated}>Revisar mi consulta <Icon name="arrow" /></button>
      <noscript><p className="field-note">Para usar el formulario, activá JavaScript. También podés escribir a <a href={CONTACT_EMAIL_URL}>{CONTACT_EMAIL}</a>.</p></noscript>
    </form>
  );
}
