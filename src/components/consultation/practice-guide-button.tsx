"use client";

import type { PracticeId } from "@/lib/practice";
import { Icon } from "@/components/ui/icon";
import { useConsultationActions } from "./consultation-provider";

export function PracticeGuideButton({ topicId }: { topicId: PracticeId }) {
  const { showPractice } = useConsultationActions();
  return (
    <button className="card-action" type="button" data-practice={topicId} onClick={() => showPractice(topicId)}>
      Ver guía para la consulta <span><Icon name="arrow" /></span>
    </button>
  );
}
