import { Fragment, useRef } from "react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage, RichContentBlock } from "../types";
import ToolUseBlock from "./ToolUseBlock";

interface ChatConversationPanelProps {
  messages: ChatMessage[];
  currentStreamingMessage: ChatMessage | null;
  agentName: string;
  panelState: "hidden" | "collapsed" | "expanded";
  onToggleExpand: () => void;
  onClear?: () => void;
  isStreaming?: boolean;
}

function extractText(message: ChatMessage): string {
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("");
  }
  return "";
}

function renderRichBlocks(blocks: RichContentBlock[]): React.ReactNode {
  return blocks.map((block, i) => {
    if (block.type === "text") {
      return <Fragment key={i}><ReactMarkdown>{block.text}</ReactMarkdown></Fragment>;
    }
    if (block.type === "tool_use_pair") {
      return (
        <ToolUseBlock
          key={block.toolUseId}
          toolName={block.toolName}
          result={block.result}
          isError={block.isError}
        />
      );
    }
    return null;
  });
}

function ChatConversationPanel({
  messages,
  currentStreamingMessage,
  agentName,
  panelState,
  onToggleExpand,
  onClear,
  isStreaming = false,
}: ChatConversationPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (panelState === "hidden") return null;

  const maxHeight = panelState === "expanded" ? 600 : 194;

  return (
    <div
      className="chat-conversation-area"
      style={{ maxHeight, transition: "max-height 0.3s ease" }}
    >
      {/* Toggle button row */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "4px 8px", position: "relative" }}>
        {onClear && (
          <button
            className="chat-clear-btn"
            onClick={onClear}
            disabled={isStreaming}
            type="button"
            style={{ position: "absolute", right: 8 }}
          >
            Clear chat
          </button>
        )}
        <button className="chat-panel-toggle" onClick={onToggleExpand} type="button">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{
              transform: panelState === "expanded" ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          >
            <path
              d="M4 10L8 6L12 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        className="chat-conversation-messages"
      >
        {messages.map((message) => {
          if (message.role === "user") {
            return (
              <div key={message.id} className="chat-msg-user">
                {extractText(message)}
              </div>
            );
          }

          // Assistant: prefer richBlocks when available
          if (message.richBlocks && message.richBlocks.length > 0) {
            return (
              <div key={message.id} className="chat-msg-agent">
                {renderRichBlocks(message.richBlocks)}
              </div>
            );
          }

          return (
            <div key={message.id} className="chat-msg-agent">
              <ReactMarkdown>{extractText(message)}</ReactMarkdown>
            </div>
          );
        })}

        {currentStreamingMessage && (
          <div className="chat-msg-agent">
            {currentStreamingMessage.richBlocks && currentStreamingMessage.richBlocks.length > 0 ? (
              renderRichBlocks(currentStreamingMessage.richBlocks)
            ) : (
              <ReactMarkdown>
                {extractText(currentStreamingMessage) || " "}
              </ReactMarkdown>
            )}
            {currentStreamingMessage.streaming && (
              <div className="chat-streaming-indicator">
                <span>{agentName} is thinking...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatConversationPanel;
