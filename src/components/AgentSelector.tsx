import { useState, useEffect } from "react";
import { getAllAgents } from "../api";
import type { Agent } from "../types";

interface AgentSelectorProps {
  onAgentSelected: (agent: Agent) => void;
  selectedAgent: Agent | null;
}

function AgentSelector({ onAgentSelected, selectedAgent }: AgentSelectorProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const agentList = await getAllAgents();
      setAgents(agentList);
      setError(null);
    } catch (err) {
      console.error("Failed to load agents:", err);
      setError("Failed to load agents");
    } finally {
      setLoading(false);
    }
  };

  const handleAgentSelect = (agent: Agent) => {
    onAgentSelected(agent);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div className="chat-spinner" />
        <span style={{ marginLeft: 8, color: "var(--color-text-secondary)" }}>Loading agents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <span style={{ color: "var(--color-red)", marginBottom: 8, display: "block" }}>{error}</span>
        <button className="settings-btn settings-btn--small" onClick={loadAgents}>
          Retry
        </button>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <span style={{ color: "var(--color-text-secondary)", textAlign: "center", display: "block" }}>
          No agents available. Create an agent to get started.
        </span>
      </div>
    );
  }

  if (selectedAgent) {
    return (
      <div className="agent-selector-selected">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="agent-selector-avatar">🤖</div>
          <div>
            <span style={{ fontWeight: 600, fontSize: 14, display: "block" }}>
              {selectedAgent.name}
            </span>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              {selectedAgent.model_name}
            </span>
          </div>
        </div>
        <button className="settings-btn settings-btn--small" onClick={() => onAgentSelected(null as any)}>
          Change Agent
        </button>
      </div>
    );
  }

  return (
    <div className="vertical-center">
      <div className="agent-empty-state">
        <h2>Send to an agent</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {agents.map((agent) => (
            <button
              key={agent.id}
              className="agent-selector-item"
              onClick={() => handleAgentSelect(agent)}
            >
              <span style={{ fontWeight: 600, fontSize: 14, display: "block" }}>
                {agent.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AgentSelector;
