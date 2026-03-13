import { Fragment, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage, ContentBlock, RichContentBlock } from "../types";
import ToolUseBlock from "./ToolUseBlock";

interface ChatMessageListProps {
  messages: ChatMessage[];
  currentStreamingMessage: ChatMessage | null;
  agentName: string;
  renderMessageContent?: (content: string, messageId: string) => React.ReactNode;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  messagesEndRef?: React.RefObject<HTMLDivElement | null>;
  emptyState?: React.ReactNode;
}

function extractTextContent(content: string | ContentBlock[]): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map((block) => block.text)
      .join("");
  }
  return "";
}

function renderRichBlocks(
  blocks: RichContentBlock[],
  renderText: (text: string) => React.ReactNode,
): React.ReactNode {
  return blocks.map((block, i) => {
    if (block.type === "text") {
      return <Fragment key={i}>{renderText(block.text)}</Fragment>;
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

function ChatMessageList({
  messages,
  currentStreamingMessage,
  agentName,
  renderMessageContent,
  containerRef,
  messagesEndRef: _messagesEndRef,
  emptyState,
}: ChatMessageListProps) {
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const scrollRef = containerRef || internalContainerRef;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentStreamingMessage]);

  const defaultEmptyState = (
    <div className="chat-conversation-empty">
      <h4>Start a conversation with {agentName}</h4>
      <p>Ask questions, get feedback, or discuss your tasks. I&apos;m here to help!</p>
    </div>
  );

  const isEmpty = messages.length === 0 && !currentStreamingMessage;

  const renderTextDefault = (text: string) => <ReactMarkdown>{text}</ReactMarkdown>;

  return (
    <div className="chat-conversation-area">
      {isEmpty ? (
        emptyState || defaultEmptyState
      ) : (
        <div ref={scrollRef} className="chat-conversation-messages">
          {messages.map((message) => {
            if (message.role === "user") {
              const contentText = extractTextContent(message.content);
              return (
                <div key={message.id} className="chat-msg chat-msg-user">
                  {contentText}
                </div>
              );
            }

            // Assistant message: prefer richBlocks when available
            if (message.richBlocks && message.richBlocks.length > 0) {
              return (
                <div key={message.id} className="chat-msg chat-msg-agent">
                  {renderRichBlocks(message.richBlocks, renderTextDefault)}
                </div>
              );
            }

            const contentText = extractTextContent(message.content);
            return (
              <div key={message.id} className="chat-msg chat-msg-agent">
                {renderMessageContent
                  ? renderMessageContent(contentText, message.id)
                  : <ReactMarkdown>{contentText}</ReactMarkdown>}
              </div>
            );
          })}

          {currentStreamingMessage && (
            <div className="chat-msg chat-msg-agent">
              {currentStreamingMessage.richBlocks && currentStreamingMessage.richBlocks.length > 0 ? (
                renderRichBlocks(currentStreamingMessage.richBlocks, renderTextDefault)
              ) : (
                <ReactMarkdown>
                  {extractTextContent(currentStreamingMessage.content) || " "}
                </ReactMarkdown>
              )}
              {currentStreamingMessage.streaming && (
                <div className="chat-streaming-indicator">
                  <div className="chat-spinner" />
                  <span>{agentName} is thinking...</span>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default ChatMessageList;
export { extractTextContent };
