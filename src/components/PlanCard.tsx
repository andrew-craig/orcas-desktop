import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { startTaskPlanning, cancelTaskPlanning } from "../api";
import type { SubTask, TaskWithSubTasks } from "../types";

interface PlanningProgressEvent {
  task_id: number;
  status: string;
  message: string;
  progress: number;
  current_step?: string;
}

interface PlanningCompleteEvent {
  task_id: number;
  success: boolean;
  message: string;
  subtasks_created?: number;
  error?: string;
}

interface PlanningCancelledEvent {
  task_id: number;
  message: string;
}

interface PlanCardProps {
  subtasks: SubTask[];
  task?: TaskWithSubTasks;
  onPlanningComplete?: () => void;
}

// Inline heroicon SVGs
function ChevronDown({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CheckCircle({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function StopCircle({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  );
}

function XMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PlanCard({ subtasks, task, onPlanningComplete }: PlanCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<number>>(new Set());
  const [isPlanning, setIsPlanning] = useState(false);
  const [planningProgress, setPlanningProgress] = useState<number>(0);
  const [planningMessage, setPlanningMessage] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<string>("");
  const [planningResult, setPlanningResult] = useState<string | null>(null);
  const [planningError, setPlanningError] = useState<string | null>(null);
  const [wasCancelled, setWasCancelled] = useState(false);

  const completedCount = subtasks.filter((s) => s.completed).length;
  const totalCount = subtasks.length;

  useEffect(() => {
    if (!task) return;

    const setupEventListeners = async () => {
      const unlistenProgress = await listen<PlanningProgressEvent>('task-planning-progress', (event) => {
        const progress = event.payload;
        if (progress.task_id === task.id) {
          setPlanningProgress(progress.progress);
          setPlanningMessage(progress.message);
          setCurrentStep(progress.current_step || "");
        }
      });

      const unlistenComplete = await listen<PlanningCompleteEvent>('task-planning-complete', (event) => {
        const completion = event.payload;
        if (completion.task_id === task.id) {
          setIsPlanning(false);
          setPlanningProgress(1.0);
          if (completion.success) {
            setPlanningResult(completion.message);
            setPlanningError(null);
            setPlanningMessage("Task planning completed successfully!");
            onPlanningComplete?.();
          } else {
            setPlanningError(completion.error || "Task planning failed");
            setPlanningResult(null);
            setPlanningMessage("");
          }
          setTimeout(() => {
            setPlanningProgress(0);
            setPlanningMessage("");
            setCurrentStep("");
          }, 3000);
        }
      });

      const unlistenCancelled = await listen<PlanningCancelledEvent>('task-planning-cancelled', (event) => {
        const cancellation = event.payload;
        if (cancellation.task_id === task.id) {
          setIsPlanning(false);
          setPlanningProgress(0);
          setWasCancelled(true);
          setPlanningMessage("");
          setCurrentStep("");
          setPlanningResult(null);
          setPlanningError(null);
          setTimeout(() => {
            setWasCancelled(false);
          }, 2000);
        }
      });

      return () => {
        unlistenProgress();
        unlistenComplete();
        unlistenCancelled();
      };
    };

    const cleanup = setupEventListeners();
    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, [task, onPlanningComplete]);

  const handlePlanTask = async () => {
    if (!task) return;

    try {
      setIsPlanning(true);
      setPlanningResult(null);
      setPlanningProgress(0);
      setPlanningMessage("Starting task planning...");
      setCurrentStep("");
      setPlanningError(null);
      setWasCancelled(false);

      await startTaskPlanning(task.id, task.title, task.description);
    } catch (err) {
      console.error("Failed to start task planning:", err);
      setPlanningError("Failed to start task planning");
      setIsPlanning(false);
      setPlanningProgress(0);
      setPlanningMessage("");
      setCurrentStep("");
    }
  };

  const handleCancelPlanning = async () => {
    if (!task) return;

    try {
      await cancelTaskPlanning(task.id);
    } catch (err) {
      console.error("Failed to cancel task planning:", err);
      setPlanningError("Failed to cancel task planning");
    }
  };

  // Empty state
  if (totalCount === 0 && !isPlanning && !planningResult && !wasCancelled) {
    return (
      <div className="plan-card">
        <div className="plan-card-header">
          <span className="plan-card-title">Plan</span>
          <button className="plan-card-btn" onClick={handlePlanTask} disabled={!task}>
            Plan
          </button>
        </div>
        {planningError && (
          <div className="plan-card-error">
            <span>{planningError}</span>
          </div>
        )}
      </div>
    );
  }

  // Planning in progress
  if (isPlanning) {
    return (
      <div className="plan-card" style={{ padding: 12 }}>
        <span className="plan-card-title" style={{ marginBottom: 12, display: "block" }}>Plan</span>
        <div className="plan-card-inset">
          <div className="plan-card-progress-header">
            <div className="plan-card-progress-label">
              <div className="chat-spinner" />
              <span className="plan-card-step">{currentStep || "Processing..."}</span>
            </div>
            <span className="plan-card-percent">{Math.round(planningProgress * 100)}%</span>
          </div>
          <div className="plan-card-progress-bar">
            <div className="plan-card-progress-fill" style={{ width: `${planningProgress * 100}%` }} />
          </div>
          {planningMessage && (
            <span className="plan-card-message">{planningMessage}</span>
          )}
          <button className="plan-card-btn plan-card-btn--danger plan-card-btn--full" onClick={handleCancelPlanning}>
            <StopCircle size={14} />
            Cancel Planning
          </button>
        </div>
      </div>
    );
  }

  // Planning complete (success) but no subtasks yet
  if (planningResult && totalCount === 0) {
    return (
      <div className="plan-card" style={{ padding: 12 }}>
        <span className="plan-card-title" style={{ marginBottom: 12, display: "block" }}>Plan</span>
        <div className="plan-card-success">
          <span className="plan-card-success-title">
            <CheckCircle size={16} />
            Task Planning Complete
          </span>
          <span className="plan-card-success-text">{planningResult}</span>
        </div>
      </div>
    );
  }

  // Cancelled state
  if (wasCancelled) {
    return (
      <div className="plan-card" style={{ padding: 12 }}>
        <span className="plan-card-title" style={{ marginBottom: 12, display: "block" }}>Plan</span>
        <div className="plan-card-warning">
          <span className="plan-card-warning-title">
            <XMark size={16} />
            Task planning cancelled
          </span>
          <span className="plan-card-warning-text">
            The task planning operation was cancelled. You can try again at any time.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="plan-card">
      {/* Collapsed header */}
      <div className="plan-card-header plan-card-header--clickable" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="plan-card-header-left">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="plan-card-title">Plan</span>
          <span className="plan-card-count">{totalCount} subtask{totalCount !== 1 ? "s" : ""}</span>
        </div>
        {completedCount > 0 && (
          <div className="plan-card-completed">
            <CheckCircle size={14} />
            <span>{completedCount}/{totalCount}</span>
          </div>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="plan-card-content">
          {subtasks.map((subtask, index) => {
            const isSubtaskExpanded = expandedSubtasks.has(subtask.id);
            const hasDescription = subtask.description && subtask.description.trim().length > 0;

            const toggleSubtask = () => {
              if (!hasDescription) return;
              setExpandedSubtasks((prev) => {
                const next = new Set(prev);
                if (next.has(subtask.id)) {
                  next.delete(subtask.id);
                } else {
                  next.add(subtask.id);
                }
                return next;
              });
            };

            return (
              <div key={subtask.id}>
                <div
                  className={`plan-card-subtask${hasDescription ? " plan-card-subtask--expandable" : ""}`}
                  onClick={toggleSubtask}
                >
                  {hasDescription && (
                    <span className="plan-card-subtask-chevron">
                      {isSubtaskExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  )}
                  <span
                    className={`plan-card-subtask-number${subtask.completed ? " plan-card-subtask-number--done" : ""}`}
                    style={{ marginLeft: hasDescription ? 0 : 22 }}
                  >
                    {subtask.completed ? "✓" : index + 1}
                  </span>
                  <span className={`plan-card-subtask-title${subtask.completed ? " plan-card-subtask-title--done" : ""}`}>
                    {subtask.title}
                  </span>
                </div>
                {isSubtaskExpanded && hasDescription && (
                  <div className="plan-card-subtask-desc">
                    <span>{subtask.description}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PlanCard;
