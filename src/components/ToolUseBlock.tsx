import { useState } from "react";

interface ToolUseBlockProps {
  toolName: string;
  result: string | null;
  isError: boolean;
}

/** Convert a human-readable tool name from snake_case. */
function formatToolName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Simple JSON-to-YAML-style formatter for display.
 * Produces indented key: value lines, not strict YAML.
 */
function jsonToYaml(value: unknown, indent = 0): string {
  const pad = " ".repeat(indent);
  if (value === null || value === undefined) return `${pad}null`;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return `${pad}${value}`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}[]`;
    return value
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          const inner = jsonToYaml(item, indent + 2).trimStart();
          return `${pad}- ${inner}`;
        }
        return `${pad}- ${item}`;
      })
      .join("\n");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return `${pad}{}`;
    return entries
      .map(([key, val]) => {
        if (typeof val === "object" && val !== null) {
          return `${pad}${key}:\n${jsonToYaml(val, indent + 2)}`;
        }
        return `${pad}${key}: ${val}`;
      })
      .join("\n");
  }
  return `${pad}${String(value)}`;
}

/** Try to parse as JSON and format as YAML-style, otherwise return raw text. */
function formatResult(result: string): { isYaml: boolean; formatted: string } {
  try {
    const parsed = JSON.parse(result);
    if (typeof parsed === "object" && parsed !== null) {
      return { isYaml: true, formatted: jsonToYaml(parsed) };
    }
  } catch {
    // Not JSON — use as-is
  }
  return { isYaml: false, formatted: result };
}

function ToolUseBlock({ toolName, result, isError }: ToolUseBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const displayName = formatToolName(toolName);
  const hasResult = result !== null && result !== "";

  return (
    <div className="tool-use-block">
      <div
        className="tool-use-block-header"
        onClick={() => hasResult && setExpanded((prev) => !prev)}
      >
        <span className="tool-use-block-label">Tool</span>
        <span className="tool-use-block-name">{displayName}</span>
        {hasResult && (
          <span className="tool-use-block-chevron">
            <svg
              width="20"
              height="20"
              viewBox="0 0 16 16"
              fill="none"
              style={{
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            >
              <path
                d="M4 6L8 10L12 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
      </div>
      {expanded && hasResult && (
        <div className={`tool-use-block-content${isError ? " tool-use-block-content--error" : ""}`}>
          <ResultContent result={result!} />
        </div>
      )}
    </div>
  );
}

function ResultContent({ result }: { result: string }) {
  const { isYaml, formatted } = formatResult(result);

  if (isYaml) {
    return (
      <pre className="tool-use-block-yaml">
        {formatted}
      </pre>
    );
  }

  return <span>{formatted}</span>;
}

export default ToolUseBlock;
