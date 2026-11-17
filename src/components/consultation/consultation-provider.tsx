"use client";

import { createContext, use, useMemo, useReducer, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import type { PracticeId } from "@/lib/practice";
import { createDraftState, draftReducer } from "./model";
import type { ConsultationDraft, ConsultationTopic, ExampleFeedback, TextField } from "./model";

type ConsultationModal = { kind: "practice"; topicId: PracticeId } | { kind: "review"; message: string } | null;
type ConsultationActions = {
  updateText: (field: TextField, value: string) => void;
  selectTopic: (topic: ConsultationTopic) => void;
  setConsent: (value: boolean) => void;
  applyExample: (topic: PracticeId, message: string) => void;
  clearExampleFeedback: () => void;
  showPractice: (topicId: PracticeId) => void;
  showReview: (message: string) => void;
  closeModal: () => void;
};

const DraftContext = createContext<ConsultationDraft | null>(null);
const ActionsContext = createContext<ConsultationActions | null>(null);
const ModalContext = createContext<ConsultationModal | undefined>(undefined);
const ExampleFeedbackContext = createContext<ExampleFeedback>("idle");
const MessageFieldContext = createContext<RefObject<HTMLTextAreaElement | null> | null>(null);

export function ConsultationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(draftReducer, undefined, createDraftState);
  const [modal, setModal] = useState<ConsultationModal>(null);
  const messageFieldRef = useRef<HTMLTextAreaElement>(null);
  const actions = useMemo<ConsultationActions>(() => ({
    updateText: (field, value) => dispatch({ type: "text", field, value }),
    selectTopic: (value) => dispatch({ type: "topic", value }),
    setConsent: (value) => dispatch({ type: "consent", value }),
    applyExample: (topic, message) => {
      dispatch({ type: "example", topic, message });
      requestAnimationFrame(() => {
        document.getElementById("consulta")?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        });
        messageFieldRef.current?.focus({ preventScroll: true });
      });
    },
    clearExampleFeedback: () => dispatch({ type: "clear-example-feedback" }),
    showPractice: (topicId) => setModal({ kind: "practice", topicId }),
    showReview: (message) => setModal({ kind: "review", message }),
    closeModal: () => setModal(null),
  }), []);

  return (
    <ActionsContext value={actions}>
      <DraftContext value={state.draft}>
        <ModalContext value={modal}>
          <ExampleFeedbackContext value={state.exampleFeedback}>
            <MessageFieldContext value={messageFieldRef}>{children}</MessageFieldContext>
          </ExampleFeedbackContext>
        </ModalContext>
      </DraftContext>
    </ActionsContext>
  );
}

export function useConsultationActions() {
  const actions = use(ActionsContext);
  if (!actions) throw new Error("Consultation actions require ConsultationProvider.");
  return actions;
}

export function useConsultationDraft() {
  const draft = use(DraftContext);
  if (!draft) throw new Error("Consultation draft requires ConsultationProvider.");
  return draft;
}

export function useConsultationModal() {
  const modal = use(ModalContext);
  if (modal === undefined) throw new Error("Consultation dialogs require ConsultationProvider.");
  return modal;
}

export function useExampleFeedback() {
  return use(ExampleFeedbackContext);
}

export function useMessageFieldRef() {
  const ref = use(MessageFieldContext);
  if (!ref) throw new Error("Consultation form requires ConsultationProvider.");
  return ref;
}
