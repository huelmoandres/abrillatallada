"use client";

import { createContext, use, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { PracticeId } from "@/lib/practice";
import { consultationFormSchema } from "@/lib/consultation-contract";
import type { ConsultationFormInput, ConsultationFormValues } from "@/lib/consultation-contract";
import { applyExampleToDraft, createConsultationDraft } from "./model";
import type { ConsultationDraft, ConsultationTopic, ExampleFeedback } from "./model";
import { consultationFingerprint, createConsultationSender } from "./submission";
import type { SubmissionState } from "./submission";

type ConsultationModal = { kind: "practice"; topicId: PracticeId } | { kind: "review"; message: string; draft: ConsultationDraft } | null;
type ConsultationActions = {
  selectTopic: (topic: ConsultationTopic) => void;
  applyExample: (topic: PracticeId, message: string) => void;
  clearExampleFeedback: () => void;
  showPractice: (topicId: PracticeId) => void;
  showReview: (draft: ConsultationDraft, message: string) => void;
  sendConsultation: (draft: ConsultationDraft) => Promise<void>;
  resetDraft: () => boolean;
  closeModal: () => void;
};

const ActionsContext = createContext<ConsultationActions | null>(null);
const ModalContext = createContext<ConsultationModal | undefined>(undefined);
const ExampleFeedbackContext = createContext<ExampleFeedback>("idle");
const MessageFieldContext = createContext<RefObject<HTMLTextAreaElement | null> | null>(null);
const DeliveryContext = createContext<{ states: Record<string, SubmissionState>; pending: boolean } | null>(null);

export function ConsultationProvider({ children }: { children: ReactNode }) {
  const form = useForm<ConsultationFormInput, unknown, ConsultationFormValues>({
    resolver: zodResolver(consultationFormSchema),
    defaultValues: createConsultationDraft(),
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });
  const { getValues, setValue, reset } = form;
  const [exampleFeedback, setExampleFeedback] = useState<ExampleFeedback>("idle");
  const [modal, setModal] = useState<ConsultationModal>(null);
  const [sender] = useState(createConsultationSender);
  const [deliveryStates, setDeliveryStates] = useState<Record<string, SubmissionState>>({});
  const delivery = useMemo(() => ({
    states: deliveryStates,
    pending: Object.values(deliveryStates).some((state) => state.status === "pending"),
  }), [deliveryStates]);
  const messageFieldRef = useRef<HTMLTextAreaElement>(null);
  const actions = useMemo<ConsultationActions>(() => ({
    selectTopic: (topic) => setValue("topic", topic, { shouldDirty: true, shouldValidate: true }),
    applyExample: (topic, message) => {
      const draft = { ...getValues(), website: getValues("website") ?? "" };
      const result = applyExampleToDraft(draft, { topic, message });
      if (result.applied) {
        setValue("message", result.draft.message, { shouldDirty: true, shouldValidate: true });
        setValue("topic", result.draft.topic, { shouldDirty: true, shouldValidate: true });
      }
      setExampleFeedback(result.applied ? "applied" : "preserved");
      requestAnimationFrame(() => {
        document.getElementById("consulta")?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        });
        messageFieldRef.current?.focus({ preventScroll: true });
      });
    },
    clearExampleFeedback: () => setExampleFeedback("idle"),
    showPractice: (topicId) => setModal({ kind: "practice", topicId }),
    showReview: (draft, message) => setModal({ kind: "review", draft: { ...draft }, message }),
    sendConsultation: async (draft) => {
      await sender.send(draft, (fingerprint, state) => {
        setDeliveryStates((previous) => ({ ...previous, [fingerprint]: state }));
      });
    },
    resetDraft: () => {
      if (!sender.reset()) return false;
      setDeliveryStates({});
      setExampleFeedback("idle");
      reset(createConsultationDraft());
      return true;
    },
    closeModal: () => setModal(null),
  }), [getValues, setValue, reset, sender]);

  return (
    <FormProvider {...form}>
      <ActionsContext value={actions}>
        <DeliveryContext value={delivery}>
          <ModalContext value={modal}>
            <ExampleFeedbackContext value={exampleFeedback}>
              <MessageFieldContext value={messageFieldRef}>{children}</MessageFieldContext>
            </ExampleFeedbackContext>
          </ModalContext>
        </DeliveryContext>
      </ActionsContext>
    </FormProvider>
  );
}

export function useConsultationActions() {
  const actions = use(ActionsContext);
  if (!actions) throw new Error("Consultation actions require ConsultationProvider.");
  return actions;
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

export function useConsultationDelivery(draft: ConsultationDraft) {
  const delivery = use(DeliveryContext);
  if (!delivery) throw new Error("Consultation delivery requires ConsultationProvider.");
  return {
    state: delivery.states[consultationFingerprint(draft)] ?? { status: "idle" as const },
    pending: delivery.pending,
  };
}
