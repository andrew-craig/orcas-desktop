import { useState, useEffect, useCallback } from "react";
import { getAllAgents, createAgent, updateAgent, deleteAgent, getAvailableModels } from "../api";
import { MDXEditor, headingsPlugin, listsPlugin, quotePlugin, thematicBreakPlugin, markdownShortcutPlugin } from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import type { Agent, ModelInfo } from "../types";

interface AgentsManagerProps {
  onBack?: () => void;
}

// Fallback models in case API fetch fails
const FALLBACK_MODELS: ModelInfo[] = [
  { id: "claude-sonnet-4-20250514", display_name: "claude-sonnet-4", display_label: "Claude Sonnet 4", supports_tools: true },
  { id: "claude-3-5-sonnet-20241022", display_name: "claude-3-5-sonnet", display_label: "Claude 3.5 Sonnet", supports_tools: true },
  { id: "claude-3-opus-20240229", display_name: "claude-3-opus", display_label: "Claude 3 Opus", supports_tools: true },
  { id: "claude-3-haiku-20240307", display_name: "claude-3-haiku", display_label: "Claude 3 Haiku", supports_tools: true },
];

// Human-readable labels for system roles
const SYSTEM_ROLE_LABELS: Record<string, string> = {
  planning: "Task Planning",
};

function AgentsManager({ onBack: _onBack }: AgentsManagerProps) {
  const [userAgents, setUserAgents] = useState<Agent[]>([]);
  const [systemAgents, setSystemAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>(FALLBACK_MODELS);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  // Edit state
  const [editName, setEditName] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [editWebSearch, setEditWebSearch] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Key to force MDXEditor re-render when agent selection changes
  const [editorKey, setEditorKey] = useState(0);

  // Delete confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  // Agent list item menu state
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Helper to check if an agent is a system agent
  const isSystemAgent = (agent: Agent) => !!agent.system_role;

  useEffect(() => {
    loadAgents();
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setIsLoadingModels(true);
      const models = await getAvailableModels();
      if (models.length > 0) {
        setAvailableModels(models);
      }
    } catch (err) {
      console.error("Failed to load models, using fallback:", err);
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    if (selectedAgent) {
      setEditName(selectedAgent.name);
      setEditModel(selectedAgent.model_name);
      setEditPrompt(selectedAgent.agent_prompt);
      setEditWebSearch(!!selectedAgent.web_search_enabled);
      setHasChanges(false);
      setEditorKey((prev) => prev + 1);
    }
  }, [selectedAgent]);

  useEffect(() => {
    if (selectedAgent) {
      const isSystem = isSystemAgent(selectedAgent);
      const nameChanged = !isSystem && editName !== selectedAgent.name;
      const modelChanged = editModel !== selectedAgent.model_name;
      const promptChanged = editPrompt !== selectedAgent.agent_prompt;
      const webSearchChanged = editWebSearch !== !!selectedAgent.web_search_enabled;
      setHasChanges(nameChanged || modelChanged || promptChanged || webSearchChanged);
    }
  }, [editName, editModel, editPrompt, editWebSearch, selectedAgent]);

  // Close menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const handleClick = () => setOpenMenuId(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [openMenuId]);

  const loadAgents = async () => {
    try {
      setIsLoading(true);
      const fetchedAgents = await getAllAgents();
      const system = fetchedAgents.filter((agent) => agent.system_role);
      const user = fetchedAgents.filter((agent) => !agent.system_role);
      setSystemAgents(system);
      setUserAgents(user);
      if (!selectedAgent) {
        if (system.length > 0) {
          setSelectedAgent(system[0]);
        } else if (user.length > 0) {
          setSelectedAgent(user[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load agents:", err);
      setError("Failed to load agents");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedAgent) return;

    try {
      setIsSaving(true);
      setError(null);
      setShowSuccess(false);

      const isSystem = isSystemAgent(selectedAgent);

      const updatedAgent = await updateAgent(selectedAgent.id, {
        name: isSystem ? selectedAgent.name : editName.trim(),
        model_name: editModel,
        agent_prompt: editPrompt.trim(),
        web_search_enabled: editWebSearch,
      });

      if (isSystem) {
        setSystemAgents((prev) =>
          prev.map((agent) =>
            agent.id === updatedAgent.id ? updatedAgent : agent,
          ),
        );
      } else {
        setUserAgents((prev) =>
          prev.map((agent) =>
            agent.id === updatedAgent.id ? updatedAgent : agent,
          ),
        );
      }
      setSelectedAgent(updatedAgent);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save agent:", err);
      setError("Failed to save agent. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAgent = async () => {
    try {
      setError(null);
      const defaultModel = availableModels[0]?.display_name || FALLBACK_MODELS[0].display_name;
      const createdAgent = await createAgent(
        "New Agent",
        defaultModel,
        "You are a helpful assistant.",
        false,
      );

      setUserAgents((prev) => [...prev, createdAgent].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedAgent(createdAgent);
    } catch (err) {
      console.error("Failed to create agent:", err);
      setError("Failed to create agent. Please try again.");
    }
  };

  const handleDeleteAgent = async () => {
    if (!agentToDelete) return;

    try {
      await deleteAgent(agentToDelete.id);
      setUserAgents((prev) => prev.filter((agent) => agent.id !== agentToDelete.id));

      if (selectedAgent?.id === agentToDelete.id) {
        const remainingAgents = userAgents.filter(
          (agent) => agent.id !== agentToDelete.id,
        );
        if (remainingAgents.length > 0) {
          setSelectedAgent(remainingAgents[0]);
        } else if (systemAgents.length > 0) {
          setSelectedAgent(systemAgents[0]);
        } else {
          setSelectedAgent(null);
        }
      }

      setShowDeleteDialog(false);
      setAgentToDelete(null);
    } catch (err) {
      console.error("Failed to delete agent:", err);
      setError("Failed to delete agent. Please try again.");
    }
  };

  const confirmDelete = (agent: Agent) => {
    setAgentToDelete(agent);
    setShowDeleteDialog(true);
  };

  const handlePromptChange = useCallback((newContent: string) => {
    setEditPrompt(newContent);
  }, []);

  const renderAgentListItem = (agent: Agent, showDeleteOption: boolean) => (
    <button
      key={agent.id}
      className={`agent-list-item${selectedAgent?.id === agent.id ? ' agent-list-item--active' : ''}`}
      onClick={() => setSelectedAgent(agent)}
    >
      <span
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: agent.system_role ? "var(--color-green)" : "var(--color-blue)",
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 500, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {agent.name}
        </span>
        <span style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)" }}>
          {availableModels.find((m) => m.display_name === agent.model_name || m.id === agent.model_name)?.display_label ||
            agent.model_name}
        </span>
      </div>
      {showDeleteOption && (
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            className="agent-list-menu-btn"
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId(openMenuId === agent.id ? null : agent.id);
            }}
          >
            ...
          </button>
          {openMenuId === agent.id && (
            <div className="agent-list-menu-dropdown">
              <button
                className="agent-list-menu-dropdown-item agent-list-menu-dropdown-item--danger"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(null);
                  confirmDelete(agent);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </button>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          padding: 16,
          borderBottom: "1px solid var(--color-gray-4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h2 style={{ fontSize: "var(--font-heading2-size)", fontWeight: 600, margin: 0 }}>Agents</h2>
      </div>

      {/* Content */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Agent List Sidebar */}
        <div
          style={{
            width: 280,
            borderRight: "1px solid var(--color-gray-4)",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "var(--color-background-light)",
          }}
        >
          <div style={{ flex: 1, overflowY: "auto" }}>
            {isLoading ? (
              <div style={{ padding: 16 }}>
                <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Loading...</span>
              </div>
            ) : (
              <>
                {/* System Agents Section */}
                {systemAgents.length > 0 && (
                  <>
                    <div
                      style={{
                        padding: 8,
                        borderBottom: "1px solid var(--color-gray-4)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        System Agents
                      </span>
                    </div>
                    <div className="agent-list">
                      {systemAgents.map((agent) => renderAgentListItem(agent, false))}
                    </div>
                  </>
                )}

                {/* User Agents Section */}
                <div
                  style={{
                    padding: 8,
                    borderBottom: "1px solid var(--color-gray-4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    Your Agents
                  </span>
                  <button
                    className="settings-btn settings-btn--small"
                    onClick={handleCreateAgent}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    New
                  </button>
                </div>

                {userAgents.length === 0 ? (
                  <div style={{ padding: 16 }}>
                    <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
                      No agents yet. Create one to get started.
                    </span>
                  </div>
                ) : (
                  <div className="agent-list">
                    {userAgents.map((agent) => renderAgentListItem(agent, true))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Agent Editor */}
        <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
          {showSuccess && (
            <div className="flash flash--success" style={{ marginBottom: 12 }}>
              Agent saved successfully!
            </div>
          )}

          {error && (
            <div className="flash flash--danger" style={{ marginBottom: 12 }}>
              {error}
            </div>
          )}

          {selectedAgent ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <h2 style={{ fontSize: "var(--font-heading2-size)", fontWeight: 600, margin: 0 }}>Edit Agent</h2>
                {isSystemAgent(selectedAgent) && (
                  <span className="settings-label settings-label--success">
                    {SYSTEM_ROLE_LABELS[selectedAgent.system_role!] || selectedAgent.system_role}
                  </span>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Name</label>
                {isSystemAgent(selectedAgent) ? (
                  <>
                    <input
                      type="text"
                      className="settings-input"
                      value={selectedAgent.name}
                      disabled
                    />
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginTop: 4 }}>
                      System agent names cannot be changed
                    </span>
                  </>
                ) : (
                  <input
                    type="text"
                    className="settings-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={isSaving}
                  />
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Model</label>
                <select
                  className="settings-select"
                  value={editModel}
                  onChange={(e) => setEditModel(e.target.value)}
                  disabled={isSaving || isLoadingModels}
                >
                  {availableModels.map((model) => (
                    <option key={model.display_name} value={model.display_name}>
                      {model.display_label}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginTop: 4 }}>
                  {isLoadingModels
                    ? "Loading models..."
                    : (() => {
                        const selectedModel = availableModels.find(
                          (m) => m.display_name === editModel
                        );
                        if (selectedModel && !selectedModel.supports_tools) {
                          return "This model does not support tool use. The agent will not be able to read or write documents.";
                        }
                        return "The AI model that powers this agent";
                      })()}
                </span>
                {(() => {
                  const selectedModel = availableModels.find(
                    (m) => m.display_name === editModel
                  );
                  if (selectedModel && !selectedModel.supports_tools) {
                    return (
                      <div className="flash flash--warning" style={{ marginTop: 8, fontSize: 12 }}>
                        This model does not support tool calling. Agent features like reading/writing task notes will not work.
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={editWebSearch}
                    onChange={(e) => setEditWebSearch(e.target.checked)}
                    disabled={isSaving}
                  />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Enable web search</span>
                </label>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginTop: 4, marginLeft: 24 }}>
                  Allow this agent to search the web for up-to-date information. Uses the Anthropic web search API.
                </span>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>System Prompt</label>
                <div
                  style={{
                    border: "1px solid var(--color-gray-4)",
                    borderRadius: 6,
                    minHeight: 200,
                  }}
                >
                  <MDXEditor
                    key={editorKey}
                    markdown={editPrompt}
                    onChange={handlePromptChange}
                    plugins={[
                      headingsPlugin(),
                      listsPlugin(),
                      quotePlugin(),
                      thematicBreakPlugin(),
                      markdownShortcutPlugin(),
                    ]}
                    contentEditableClassName="mdx-editor-content"
                  />
                </div>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginTop: 4 }}>
                  Instructions that define how this agent behaves. This is sent
                  as the system prompt to the AI model.
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  className="settings-btn settings-btn--primary"
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges || (!isSystemAgent(selectedAgent) && !editName.trim())}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>

                {hasChanges && (
                  <span style={{ fontSize: 14, color: "var(--color-orange)" }}>
                    Unsaved changes
                  </span>
                )}
              </div>
            </>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
                Select an agent to edit, or create a new one.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && agentToDelete && (
        <div className="dialog-backdrop" onClick={() => { setShowDeleteDialog(false); setAgentToDelete(null); }}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Delete Agent</h3>
              <button
                className="dialog-close-btn"
                onClick={() => { setShowDeleteDialog(false); setAgentToDelete(null); }}
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <p style={{ marginBottom: 16 }}>
                Are you sure you want to delete "{agentToDelete.name}"? This action
                cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="settings-btn settings-btn--danger" onClick={handleDeleteAgent}>
                  Delete
                </button>
                <button
                  className="settings-btn"
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setAgentToDelete(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentsManager;
