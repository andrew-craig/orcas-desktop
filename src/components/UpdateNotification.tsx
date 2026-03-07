import { useEffect, useState, useCallback, useRef } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

type UpdateState =
  | { kind: "idle" }
  | { kind: "available"; version: string; update: Update }
  | { kind: "downloading"; version: string; progress: number }
  | { kind: "ready"; version: string }
  | { kind: "error"; message: string };

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
const INITIAL_DELAY_MS = 5000; // 5 seconds

export default function UpdateNotification() {
  const [state, setState] = useState<UpdateState>({ kind: "idle" });
  const [dismissed, setDismissed] = useState(false);
  const updateRef = useRef<Update | null>(null);

  const checkForUpdate = useCallback(async () => {
    try {
      const update = await check();
      if (update) {
        updateRef.current = update;
        setState({ kind: "available", version: update.version, update });
      }
    } catch (err) {
      console.error("Update check failed:", err);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(checkForUpdate, INITIAL_DELAY_MS);
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL_MS);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [checkForUpdate]);

  const handleDownload = useCallback(async () => {
    const update = updateRef.current;
    if (!update) return;

    const version = update.version;
    setState({ kind: "downloading", version, progress: 0 });

    try {
      let totalLength = 0;
      let downloaded = 0;

      await update.downloadAndInstall((event) => {
        if (event.event === "Started" && event.data.contentLength) {
          totalLength = event.data.contentLength;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (totalLength > 0) {
            const pct = Math.round((downloaded / totalLength) * 100);
            setState({ kind: "downloading", version, progress: pct });
          }
        } else if (event.event === "Finished") {
          setState({ kind: "ready", version });
        }
      });

      // In case the Finished event didn't fire
      setState((prev) => (prev.kind === "downloading" ? { kind: "ready", version } : prev));
    } catch (err) {
      console.error("Update download failed:", err);
      setState({ kind: "error", message: String(err) });
    }
  }, []);

  const handleRestart = useCallback(async () => {
    try {
      await relaunch();
    } catch (err) {
      console.error("Relaunch failed:", err);
    }
  }, []);

  if (dismissed || state.kind === "idle") return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 1000,
        backgroundColor: "var(--bgColor-default, #ffffff)",
        border: "1px solid var(--borderColor-default, #d0d7de)",
        borderRadius: 8,
        padding: "12px 16px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        maxWidth: 400,
      }}
    >
      {state.kind === "available" && (
        <>
          <span style={{ fontSize: 14, flexShrink: 0 }}>
            Update available: <strong>v{state.version}</strong>
          </span>
          <button className="update-notification-btn" onClick={handleDownload}>
            Download
          </button>
        </>
      )}

      {state.kind === "downloading" && (
        <>
          <div className="chat-spinner" />
          <span style={{ fontSize: 14 }}>
            Downloading... {state.progress}%
          </span>
        </>
      )}

      {state.kind === "ready" && (
        <>
          <span style={{ fontSize: 14, flexShrink: 0 }}>
            Update v{state.version} ready
          </span>
          <button className="update-notification-btn" onClick={handleRestart}>
            Restart now
          </button>
        </>
      )}

      {state.kind === "error" && (
        <span style={{ fontSize: 14, color: "var(--color-red)" }}>
          Update failed
        </span>
      )}

      <button
        style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 4, color: "var(--color-text-secondary)" }}
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
