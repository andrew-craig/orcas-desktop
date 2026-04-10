/**
 * Agent self-update background task.
 *
 * Runs after the user leaves a TaskDetail view. The Chief of Staff agent
 * analyses recent chat messages and task notes, then updates a designated
 * section of its own system prompt with learned preferences and patterns.
 */

import { invoke } from "@tauri-apps/api/core";
import {
  getTaskById,
  updateAgentPromptSection,
} from "../api";
import type { BackgroundTaskDefinition } from "./backgroundTasks";
import type { ToolResult } from "./agentTools";

// ── Trigger context ──────────────────────────────────────────────────────

export interface AgentPromptSelfUpdateContext {
  taskId: number;
  spaceId: number;
  agentId: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Collect all chat localStorage entries for a given task (across agents). */
function gatherChatMessages(taskId: number): { role: string; content: string; agentKey: string }[] {
  const messages: { role: string; content: string; agentKey: string }[] = [];
  const prefix = `chat-task-${taskId}-agent-`;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;

    try {
      const parsed = JSON.parse(localStorage.getItem(key)!);
      if (!Array.isArray(parsed)) continue;
      for (const msg of parsed) {
        if (msg.role && typeof msg.content === "string") {
          messages.push({ role: msg.role, content: msg.content, agentKey: key });
        }
      }
    } catch {
      // Skip malformed entries
    }
  }
  return messages;
}

function textResult(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

// ── Task definition ─────────────────────────────────────────────────────

export const agentPromptSelfUpdateTask: BackgroundTaskDefinition<AgentPromptSelfUpdateContext> = {
  taskType: "agent_prompt_self_update",
  scopeType: "agent",

  getScopeId: (ctx) => ctx.agentId,

  debounceMins: 5,

  getAgentSystemRole: () => "chief_of_staff",

  async gatherContext(ctx) {
    const chatMessages = gatherChatMessages(ctx.taskId);
    if (chatMessages.length === 0) return null;

    const taskNotes = await invoke<string>("read_task_notes", { taskId: ctx.taskId }).catch(() => "");
    const task = await getTaskById(ctx.taskId);

    // Build a hash-friendly summary string
    const lastMsg = chatMessages[chatMessages.length - 1];
    const hashInput = `${chatMessages.length}|${lastMsg?.content?.slice(-100) ?? ""}|${taskNotes.length}`;

    // Build the full context payload that getUserMessage will receive
    const taskMeta = task
      ? `Task: "${task.title}" (status: ${task.status}, priority: ${task.priority})${task.description ? `\nDescription: ${task.description}` : ""}`
      : `Task ID: ${ctx.taskId}`;

    const chatSummary = chatMessages
      .slice(-40) // last 40 messages to stay within token budget
      .map((m) => `[${m.role}]: ${m.content}`)
      .join("\n");

    const parts = [
      `--- TASK METADATA ---\n${taskMeta}`,
      `--- TASK NOTES ---\n${taskNotes || "(none)"}`,
      `--- RECENT CONVERSATION ---\n${chatSummary}`,
      `--- HASH ---\n${hashInput}`,
    ];

    return parts.join("\n\n");
  },

  getSystemPrompt(_ctx, agent) {
    return `${agent.agent_prompt}

You are running as a background task after the user finished working on a task.
Your job: analyse the conversation and task notes, then update the "Learned Preferences"
section of your system prompt with any patterns, preferences, or insights about how to
interact better with this user in the future.

Rules:
- The "Learned Preferences" section is delimited by:
  <!-- UPDATABLE_SECTION_START -->
  <!-- UPDATABLE_SECTION_END -->
- This section must stay under 500 words. Keep it concise and structured.
- Only include durable knowledge: recurring preferences, communication style insights,
  working patterns. Exclude ephemeral details.
- Start with bullet points or short paragraphs.
- Use the update_agent_prompt_section tool to write the new section content
  (without the delimiters).
- If there is nothing meaningful to learn, do NOT update — just respond saying
  no update was needed.`;
  },

  getUserMessage(_ctx, gatheredContext) {
    return `Please review the following task conversation and notes, then update your "Learned Preferences" section if there are meaningful new insights about this user's preferences or working style.\n\n${gatheredContext}`;
  },

  getTools() {
    return [
      {
        name: "update_agent_prompt_section",
        description:
          "Update the 'Learned Preferences' section of your system prompt. Content must stay under 500 words.",
        input_schema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "The new content for the Learned Preferences section (without delimiters).",
            },
          },
          required: ["content"],
        },
      },
    ];
  },

  createToolExecutor(ctx) {
    return async (toolName: string, args: any): Promise<ToolResult> => {
      switch (toolName) {
        case "update_agent_prompt_section": {
          const wordCount = args.content
            .split(/\s+/)
            .filter(Boolean).length;
          if (wordCount > 500) {
            return textResult(
              `Learned Preferences section exceeds the 500-word limit (currently ${wordCount} words). Please condense and retry.`,
            );
          }
          await updateAgentPromptSection(ctx.agentId, args.content);
          return textResult(
            `Successfully updated your Learned Preferences section (${wordCount} words).`,
          );
        }

        default:
          return textResult(`Unknown tool: ${toolName}`);
      }
    };
  },
};
