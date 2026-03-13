/**
 * User knowledge background task.
 *
 * Runs after the user leaves a TaskDetail or TodayPage view. The Chief of
 * Staff agent analyses recent chat messages and updates a global user
 * knowledge document — keeping it under 500 words.
 */

import { getSetting, setSetting } from "../api";
import type { BackgroundTaskDefinition } from "./backgroundTasks";
import type { ToolResult } from "./agentTools";

// ── Trigger context ──────────────────────────────────────────────────────

export interface UserKnowledgeContext {
  chatSource: "task" | "today";
  taskId?: number;
  spaceId?: number;
  agentId?: number;
}

const SETTINGS_KEY = "user_knowledge_document";

// ── Helpers ──────────────────────────────────────────────────────────────

/** Collect chat messages from localStorage for either task or today chats. */
function gatherChatMessages(
  ctx: UserKnowledgeContext,
): { role: string; content: string }[] {
  const messages: { role: string; content: string }[] = [];

  const prefix =
    ctx.chatSource === "task"
      ? `chat-task-${ctx.taskId}-agent-`
      : "chat-today-agent-";

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;

    try {
      const parsed = JSON.parse(localStorage.getItem(key)!);
      if (!Array.isArray(parsed)) continue;
      for (const msg of parsed) {
        if (msg.role && typeof msg.content === "string") {
          messages.push({ role: msg.role, content: msg.content });
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

export const userKnowledgeTask: BackgroundTaskDefinition<UserKnowledgeContext> = {
  taskType: "cos_user_knowledge",
  scopeType: "global",

  getScopeId: () => 0, // singleton — no per-entity scope

  debounceMins: 10,

  getAgentSystemRole: () => "chief_of_staff",

  async gatherContext(ctx) {
    const chatMessages = gatherChatMessages(ctx);
    if (chatMessages.length === 0) return null;

    const currentKnowledge = (await getSetting(SETTINGS_KEY)) || "";

    // Build a hash-friendly summary
    const lastMsg = chatMessages[chatMessages.length - 1];
    const hashInput = `${chatMessages.length}|${lastMsg?.content?.slice(-100) ?? ""}|${currentKnowledge.length}`;

    const chatSummary = chatMessages
      .slice(-40) // last 40 messages to stay within token budget
      .map((m) => `[${m.role}]: ${m.content}`)
      .join("\n");

    const parts = [
      `--- CURRENT USER KNOWLEDGE ---\n${currentKnowledge || "(empty)"}`,
      `--- RECENT CONVERSATION (${ctx.chatSource}) ---\n${chatSummary}`,
      `--- HASH ---\n${hashInput}`,
    ];

    return parts.join("\n\n");
  },

  getSystemPrompt(_ctx, agent) {
    return `${agent.agent_prompt}

You are running as a background task after the user finished a conversation.
Your job: analyse the conversation and update the User Knowledge document with
any new insights about the user — their role, preferences, working style, key
decisions, recurring themes, or other durable personal context.

Rules:
- The User Knowledge document MUST stay under 500 words. If it currently
  exceeds that, condense it before adding new information.
- Preserve existing knowledge that is still relevant. Remove outdated information.
- Be concise and structured (use headings, bullets).
- Do NOT include task-specific or ephemeral details — those belong in Space
  context. Focus on information about the USER that applies across all spaces.
- Use the read_user_knowledge tool first to see the current state, then
  update_user_knowledge to write the new version.
- If there is nothing meaningful to add about the user, do NOT update — just
  respond saying no update was needed.`;
  },

  getUserMessage(_ctx, gatheredContext) {
    return `Please review the following conversation, then update the User Knowledge document if there are meaningful new insights about the user.\n\n${gatheredContext}`;
  },

  getTools() {
    return [
      {
        name: "read_user_knowledge",
        description: "Read the current User Knowledge document.",
        input_schema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "update_user_knowledge",
        description:
          "Update the User Knowledge document. Must stay under 500 words.",
        input_schema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description:
                "The full markdown content for the user knowledge document.",
            },
          },
          required: ["content"],
        },
      },
    ];
  },

  createToolExecutor() {
    return async (toolName: string, args: any): Promise<ToolResult> => {
      switch (toolName) {
        case "read_user_knowledge": {
          const knowledge = await getSetting(SETTINGS_KEY);
          return textResult(
            knowledge && knowledge.length > 0
              ? knowledge
              : "No user knowledge document exists yet.",
          );
        }

        case "update_user_knowledge": {
          const wordCount = args.content
            .split(/\s+/)
            .filter(Boolean).length;
          if (wordCount > 500) {
            return textResult(
              `User knowledge exceeds the 500-word limit (currently ${wordCount} words). Please condense and retry.`,
            );
          }
          await setSetting(SETTINGS_KEY, args.content);
          return textResult(
            `Successfully updated user knowledge document (${wordCount} words).`,
          );
        }

        default:
          return textResult(`Unknown tool: ${toolName}`);
      }
    };
  },
};
