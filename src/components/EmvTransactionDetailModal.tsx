import { useState, useMemo, useEffect } from "react";
import { parseEmvLog } from "@/utils/emvLogParser";
import { getStepDescription } from "@/data/emvStepDescriptions";
import { cn } from "@/lib/utils";

export interface EmvTransactionDetailModalProps {
  open: boolean;
  onClose: () => void;
  logText: string;
  success: boolean;
}

/**
 * 카드 탭 EMV 트랜잭션 상세 모달
 * TCP 로그와 별도로, 단계별 설명이 붙은 전용 UI를 제공한다.
 */
export function EmvTransactionDetailModal({
  open,
  onClose,
  logText,
  success,
}: EmvTransactionDetailModalProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const parsed = useMemo(() => parseEmvLog(logText ?? ""), [logText]);
  const { steps, rawLines } = parsed;
  const hasSteps = steps.length > 0;

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emv-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg border bg-card shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단: 결과 요약 */}
        <div className="shrink-0 border-b px-4 py-3">
          <h2
            id="emv-modal-title"
            className="text-lg font-semibold text-foreground"
          >
            EMV 트랜잭션 상세
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                "inline-flex px-2 py-0.5 text-xs font-medium rounded",
                success
                  ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
              )}
            >
              {success ? "승차/하차 성공" : "승차/하차 실패"}
            </span>
          </div>
        </div>

        {/* 본문: 단계별 아코디언 또는 원문 */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {hasSteps ? (
            <div className="space-y-1">
              {steps.map((step, index) => {
                const isExpanded = expandedIndex === index;
                const description = getStepDescription(step.title);
                return (
                  <div
                    key={`${step.title}-${index}`}
                    className="rounded-lg border bg-muted/30"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted/50"
                      onClick={() =>
                        setExpandedIndex(isExpanded ? null : index)
                      }
                      aria-expanded={isExpanded}
                    >
                      <span className="truncate">
                        {index + 1}. {step.title}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 transition-transform",
                          isExpanded && "rotate-180"
                        )}
                      >
                        ▼
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="border-t px-3 py-2">
                        {description && (
                          <p className="mb-2 text-xs text-muted-foreground">
                            {description}
                          </p>
                        )}
                        <pre className="max-h-64 overflow-auto rounded bg-background/80 p-2 text-xs font-mono text-foreground whitespace-pre-wrap break-all">
                          {step.lines.join("\n")}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <pre className="rounded bg-muted/50 p-3 text-xs font-mono text-foreground whitespace-pre-wrap break-all">
              {rawLines.length > 0 ? rawLines.join("\n") : "표시할 로그가 없습니다."}
            </pre>
          )}
        </div>

        {/* 푸터: 닫기 */}
        <div className="shrink-0 border-t px-4 py-3 text-right">
          <button
            type="button"
            className="rounded-lg border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
