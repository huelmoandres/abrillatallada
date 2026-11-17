"use client";

import * as Select from "@radix-ui/react-select";
import type { Ref } from "react";
import type { ConsultationTopic } from "@/lib/consultation-contract";
import { PRACTICES } from "@/lib/practice";
import { Icon } from "./icon";
import "./topic-select.css";

const UNSURE_VALUE = "unsure";

const TOPIC_OPTIONS = [
  { value: "", label: "No estoy seguro/a" },
  ...PRACTICES.map((practice) => ({ value: practice.id, label: practice.category })),
  { value: "other", label: "Otra consulta" },
] satisfies readonly { value: ConsultationTopic; label: string }[];

export type TopicSelectProps = {
  value: ConsultationTopic;
  onValueChange: (value: ConsultationTopic) => void;
  onBlur: () => void;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
  ref?: Ref<HTMLButtonElement>;
};

function Chevron() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg>;
}

export function TopicSelect({ value, onValueChange, onBlur, id, invalid, describedBy, ref }: TopicSelectProps) {
  const selectedOption = TOPIC_OPTIONS.find((option) => option.value === value) ?? TOPIC_OPTIONS[0];

  function changeTopic(nextValue: string) {
    const nextOption = TOPIC_OPTIONS.find((option) => (option.value || UNSURE_VALUE) === nextValue);
    if (nextOption) onValueChange(nextOption.value);
  }

  return (
    <Select.Root value={value || UNSURE_VALUE} onValueChange={changeTopic}>
      <Select.Trigger
        ref={ref}
        id={id}
        className="topic-select-trigger"
        onBlur={onBlur}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      >
        <span className="topic-select-value"><Select.Value>{selectedOption.label}</Select.Value></span>
        <Select.Icon className="topic-select-chevron"><Chevron /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="topic-select-content" position="popper" align="start" sideOffset={8} collisionPadding={16}>
          <Select.ScrollUpButton className="topic-select-scroll topic-select-scroll-up"><Chevron /></Select.ScrollUpButton>
          <Select.Viewport className="topic-select-viewport">
            {TOPIC_OPTIONS.map((option) => (
              <Select.Item key={option.value || UNSURE_VALUE} value={option.value || UNSURE_VALUE} className="topic-select-item">
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="topic-select-indicator"><Icon name="check" /></Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className="topic-select-scroll"><Chevron /></Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
