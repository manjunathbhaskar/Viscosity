"use client";

import type { DealStage } from "@/lib/types";

const STAGES: DealStage[] = ["sourced", "screening", "diligence", "decision_ready"];
const LABELS: Record<string, string> = {
  sourced: "sourced",
  screening: "screen",
  diligence: "diligence",
  decision_ready: "decision",
};

interface PipelineStageProps {
  stage: DealStage;
  compact?: boolean;
}

export default function PipelineStage({ stage, compact }: PipelineStageProps) {
  const currentIdx = STAGES.indexOf(stage);
  const isFinal = stage === "passed" || stage === "invested";

  return (
    <div className="pipeline-track">
      {STAGES.map((s, i) => {
        const isActive = isFinal || i <= currentIdx;
        const isCurrent = !isFinal && i === currentIdx;
        return (
          <div key={s} className="pipeline-segment">
            {i > 0 && <div className={`pipeline-line ${isActive ? "active" : ""}`} />}
            <div className={`pipeline-dot ${isActive ? "active" : ""} ${isCurrent ? "current" : ""}`} />
            {!compact && (
              <span className="label ml-0.5 mr-1 text-[10px]" style={{ color: isActive ? "var(--ink)" : undefined }}>
                {LABELS[s]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
