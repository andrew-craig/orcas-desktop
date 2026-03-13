# Automatic Context Supplementation Framework

## Context

Epic **orcas-uwq**: The Chief of Staff agent currently assists users in Today view but doesn't learn from task conversations. When users work on tasks — chatting with agents, editing notes — valuable context about goals, decisions, and preferences is generated but not captured at the Space level. This framework enables background agent tasks that automatically update Space context after conversations, making the CoS agent (and all space-level prompts) progressively smarter.

## Architecture Overview

**Frontend-driven orchestration.** Chat history lives in localStorage, so context gathering must happen in the frontend. The background task uses the existing `sendChatTurn` from `chatEngine.ts` — no new Rust-side agent infrastructure needed.

```
TaskDetail unmounts
  → trigger fires (frontend)
  → check debounce (5 min, via DB)
  → check for changes (hash comparison)
  → gather context (localStorage chat + DB notes)
  → sendChatTurn with CoS agent + restricted tools
  → agent updates space context (with 1000-word limit)
```

## Implementation Plan

### Step 1: Database migration — `024_add_background_task_runs.sql`

New table to track background task execution (debounce + change detection):

```sql
CREATE TABLE IF NOT EXISTS background_task_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_type TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  scope_id INTEGER NOT NULL,
  trigger_source TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  input_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_btr_scope
  ON background_task_runs(task_type, scope_type, scope_id, created_at);
```

**Files:** Create `src-tauri/migrations/024_add_background_task_runs.sql`, add to migration vec in `src-tauri/src/lib.rs`.

### Step 2: API helpers — `src/api.ts`

Add 3 functions for the new table (using `tauri-plugin-sql` direct queries, matching existing patterns in api.ts):

- `getLastBackgroundTaskRun(taskType, scopeType, scopeId)` — returns last completed run (for debounce + hash comparison)
- `insertBackgroundTaskRun(taskType, scopeType, scopeId, triggerSource, inputHash)` — insert with status `'running'`
- `updateBackgroundTaskRunStatus(id, status, errorMessage?)` — update status + completed_at

### Step 3: Background task framework — `src/utils/backgroundTasks.ts`

Core framework with these abstractions:

```typescript
interface BackgroundTaskDefinition {
  taskType: string;
  scopeType: string;
  getScopeId: (ctx: TriggerContext) => number;
  debounceMins: number;
  getAgentSystemRole: () => string;
  gatherContext: (ctx: TriggerContext) => Promise<TaskRunContext>;
  shouldRun: (ctx: TriggerContext, lastInputHash: string | null) => Promise<{ run: boolean; context?: TaskRunContext }>;
  getSystemPrompt: (context: TaskRunContext) => string;
  getUserMessage: (context: TaskRunContext) => string;
  getTools: () => any[];
  createToolExecutor: (context: TaskRunContext) => (name: string, args: any) => Promise<ToolResult>;
}
```

**`executeBackgroundTask(definition, triggerContext)`** — the main entry point:
1. Look up agent by `system_role` (query `agents` table)
2. Query last completed run → check debounce (5 min)
3. Call `shouldRun` → check input hash for changes
4. Insert run record (status: `running`)
5. Call `sendChatTurn` with the definition's prompt, tools, and executor
6. Update run record to `completed` or `failed`

Guard against concurrent runs: skip if a `running` entry exists for this scope that's < 10 minutes old.

### Step 4: Context supplementation task — `src/utils/contextSupplementationTask.ts`

Implements `BackgroundTaskDefinition` for the initial use case.

**Context gathering:**
- Read chat messages from localStorage: `chat-task-${taskId}-agent-*` (all agents for this task)
- Read task notes via `invoke("read_task_notes", { taskId })`
- Read current space context via `getSpaceContext(spaceId)`
- Read task metadata (title, description, status)
- Compute `inputHash` = simple hash of (chat message count + last message timestamp + notes length)

**Change detection (`shouldRun`):**
- Compare current hash to last run's `input_hash`
- Skip if unchanged (no new conversation or edits since last update)
- Also skip if chat is empty (nothing to analyze)

**System prompt:** Instructs the CoS to analyze the conversation and update Space context with relevant insights, decisions, preferences, and progress. Emphasizes the 1000-word limit.

**Tools (restricted set):**
- `read_space_context` — read current context (reuse from `agentTools.ts`)
- `update_space_context` — write updated context, **with word-count enforcement**:
  - Count words: `content.split(/\s+/).filter(Boolean).length`
  - If > 1000: return error result `"Space context exceeds the 1000-word limit (currently N words). Please condense and retry."`
  - Otherwise: call `updateSpaceContext(spaceId, content)`

**Agent:** Chief of Staff, looked up by `system_role = 'chief_of_staff'`.

### Step 5: Trigger integration — modify `TaskDetail.tsx`

Add a `useEffect` with a cleanup function that fires `executeBackgroundTask` on unmount:

```typescript
useEffect(() => {
  return () => {
    executeBackgroundTask(contextSupplementationTask, {
      taskId: task.id,
      spaceId: task.space_id,
    }).catch(err => console.error("Background context update failed:", err));
  };
}, [task.id, task.space_id]);
```

Fire-and-forget — the task runs async even after navigation. No UI indication needed.

### Step 6: Create follow-up issues (not implemented in this phase)

1. **"Agent self-updating system prompt component"** — Background task where the CoS updates a portion of its own system prompt based on learnings from conversations
2. **"User knowledge document"** — New storage (table or dedicated field) where the CoS tracks information about the user's role, preferences, and working style

## Files Summary

| Action | File | Purpose |
|--------|------|---------|
| Create | `src-tauri/migrations/024_add_background_task_runs.sql` | New tracking table |
| Modify | `src-tauri/src/lib.rs` | Register migration 24 |
| Modify | `src/api.ts` | Add 3 helper functions for background_task_runs |
| Create | `src/utils/backgroundTasks.ts` | Reusable framework |
| Create | `src/utils/contextSupplementationTask.ts` | Context supplementation task definition |
| Modify | `src/components/TaskDetail.tsx` | Add unmount trigger |

## Verification

1. **Unit flow:** Open a task, have a conversation with an agent, navigate back to Space → check console for background task execution logs
2. **Debounce:** Navigate away, immediately navigate back and away again → second run should be skipped (< 5 min)
3. **Change detection:** Navigate away without any new messages → should skip (no changes)
4. **Word limit:** Manually set space context to a long document, trigger update → agent should receive error and condense
5. **No agent:** Delete CoS agent, trigger update → should log warning and skip silently
6. **DB verification:** `sqlite3 ~/Library/Application\ Support/com.orcas.dev/orcascore.db "SELECT * FROM background_task_runs"` → should show run records
