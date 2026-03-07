import { useState, useEffect } from "react";
import "./App.css";
import {
  getAllSpaces,
  getTasksBySpace,
  getTaskById,
  createSpace,
  createTask,
  updateTask,
  updateTaskStatus,
  updateSpace,
  updateSpaceColor,
} from "./api";
import type { Space, TaskWithSubTasks, NewSpace, NewTask } from "./types";
import TaskDetail from "./components/TaskDetail";
import Settings from "./components/Settings";
import AgentsManager from "./components/AgentsManager";
import SpaceHome from "./components/SpaceHome";
import TodayPage from "./components/TodayPage";
import UpdateNotification from "./components/UpdateNotification";
import Sidebar from "./components/Sidebar";

function App() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [tasks, setTasks] = useState<TaskWithSubTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAgents, setShowAgents] = useState(false);
  const [showToday, setShowToday] = useState(true);
  const [taskRefreshTrigger, setTaskRefreshTrigger] = useState(0);
  const [shouldEditSpaceTitle, setShouldEditSpaceTitle] = useState(false);
  const [standaloneTask, setStandaloneTask] = useState<TaskWithSubTasks | null>(null);

  useEffect(() => {
    loadSpaces();
  }, []);

  useEffect(() => {
    if (selectedSpace) {
      loadTasks(selectedSpace.id);
    }
  }, [selectedSpace]);

  async function loadSpaces() {
    try {
      console.log("Loading spaces...");
      setLoading(true);
      const fetchedSpaces = await getAllSpaces();
      console.log("Spaces loaded:", fetchedSpaces);
      setSpaces(fetchedSpaces);
      if (fetchedSpaces.length > 0 && !selectedSpace) {
        setSelectedSpace(fetchedSpaces[0]);
      }
    } catch (error) {
      console.error("Failed to load spaces:", error);
      alert("Failed to load spaces: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTasks(spaceId: number) {
    try {
      const fetchedTasks = await getTasksBySpace(spaceId);
      setTasks(fetchedTasks);
    } catch (error) {
      console.error("Failed to load tasks:", error);
      alert("Failed to load tasks: " + (error as Error).message);
    }
  }

  async function handleCreateSpace() {
    try {
      console.log("Creating new space with empty title");
      const newSpace: NewSpace = { title: "" };
      const createdSpace = await createSpace(newSpace);
      console.log("Space created successfully:", createdSpace);
      setSpaces((prev) => [createdSpace, ...prev]);
      setSelectedSpace(createdSpace);
      setShouldEditSpaceTitle(true);
      handleNavigation("home");
    } catch (error) {
      console.error("Failed to create space:", error);
      alert("Failed to create space: " + (error as Error).message);
    }
  }

  async function handleUpdateSpaceTitle(spaceId: number, newTitle: string) {
    try {
      const updatedSpace = await updateSpace(spaceId, { title: newTitle });
      setSpaces((prev) =>
        prev.map((space) => (space.id === spaceId ? updatedSpace : space))
      );
      setSelectedSpace(updatedSpace);
      setShouldEditSpaceTitle(false);
    } catch (error) {
      console.error("Failed to update space title:", error);
      throw error;
    }
  }

  async function handleUpdateSpaceColor(spaceId: number, color: string) {
    try {
      const updatedSpace = await updateSpaceColor(spaceId, color);
      setSpaces((prev) =>
        prev.map((space) => (space.id === spaceId ? updatedSpace : space))
      );
      setSelectedSpace(updatedSpace);
    } catch (error) {
      console.error("Failed to update space color:", error);
      throw error;
    }
  }

  async function handleCreateTask(
    title: string,
    status: "todo" | "in_progress" | "for_review" | "done" = "todo",
  ) {
    if (!selectedSpace) {
      console.error("No selected space for task creation");
      return;
    }

    try {
      const newTask: NewTask = {
        space_id: selectedSpace.id,
        title,
        status,
      };
      const createdTask = await createTask(newTask);
      const taskWithSubTasks: TaskWithSubTasks = {
        ...createdTask,
        subtasks: [],
      };
      setTasks((prev) => [taskWithSubTasks, ...prev]);
    } catch (error) {
      console.error("Failed to create task:", error);
      alert("Failed to create task: " + (error as Error).message);
      throw error;
    }
  }

  async function handleCreateTaskFromDialog() {
    if (!newTaskTitle.trim()) return;

    try {
      await handleCreateTask(newTaskTitle.trim());
      setTaskRefreshTrigger((prev) => prev + 1);
      setShowNewTaskDialog(false);
      setNewTaskTitle("");
    } catch (error) {
      console.error("Failed to create task from dialog:", error);
      alert("Failed to create task: " + (error as Error).message);
    }
  }

  async function handleUpdateTask(
    taskId: number,
    updates: Partial<TaskWithSubTasks>,
  ) {
    try {
      const isStatusOnly =
        Object.keys(updates).length === 1 && updates.status !== undefined;
      const updatedTask = isStatusOnly
        ? await updateTaskStatus(taskId, updates.status!)
        : await updateTask(taskId, updates);

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, ...updatedTask } : task,
        ),
      );
    } catch (error) {
      console.error("Failed to update task:", error);
      alert("Failed to update task: " + (error as Error).message);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div className="chat-spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  const handleTaskClick = async (taskId: number) => {
    setSelectedTaskId(taskId);
    // If the task isn't in the current space's task list, fetch it directly
    const found = tasks.find((t) => t.id === taskId);
    if (!found) {
      const fetched = await getTaskById(taskId);
      setStandaloneTask(fetched);
    } else {
      setStandaloneTask(null);
    }
  };

  const selectedTask = selectedTaskId !== null
    ? tasks.find((task) => task.id === selectedTaskId) || standaloneTask || undefined
    : undefined;

  const currentView = selectedTask ? "task" : showSettings ? "settings" : showAgents ? "agents" : showToday ? "today" : "home";

  const handleNavigation = (view: "home" | "settings" | "agents" | "today") => {
    setShowSettings(view === "settings");
    setShowAgents(view === "agents");
    setShowToday(view === "today");
    if (view !== "home") {
      setShouldEditSpaceTitle(false);
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex" }}>
      <Sidebar
        spaces={spaces}
        selectedSpace={selectedSpace}
        currentView={currentView}
        onNavigate={handleNavigation}
        onSelectSpace={(space) => {
          setSelectedSpace(space);
          setShouldEditSpaceTitle(false);
          handleNavigation("home");
        }}
        onCreateSpace={handleCreateSpace}
      />

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {currentView === "task" && selectedTask && (
          <TaskDetail
            task={selectedTask}
            spaceName={selectedSpace?.title || ""}
            onBack={() => { setSelectedTaskId(null); setStandaloneTask(null); }}
            onUpdateTask={handleUpdateTask}
          />
        )}
        {currentView === "settings" && <Settings />}
        {currentView === "agents" && <AgentsManager onBack={() => handleNavigation("home")} />}
        {currentView === "today" && <TodayPage onTaskClick={handleTaskClick} />}
        {currentView === "home" && (
          <SpaceHome
            selectedSpace={selectedSpace}
            onTaskClick={handleTaskClick}
            onShowNewTaskDialog={() => setShowNewTaskDialog(true)}
            onShowNewSpaceDialog={handleCreateSpace}
            onTaskCreated={(task) => setTasks((prev) => [task, ...prev])}
            refreshTrigger={taskRefreshTrigger}
            onUpdateSpaceTitle={handleUpdateSpaceTitle}
            onUpdateSpaceColor={handleUpdateSpaceColor}
            shouldEditSpaceTitle={shouldEditSpaceTitle}
          />
        )}
      </div>

      {showNewTaskDialog && (
        <div className="dialog-backdrop" onClick={() => { setShowNewTaskDialog(false); setNewTaskTitle(""); }}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Add new task</h3>
              <button
                className="dialog-close-btn"
                onClick={() => { setShowNewTaskDialog(false); setNewTaskTitle(""); }}
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <input
                type="text"
                className="settings-input"
                placeholder="Enter task title..."
                value={newTaskTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter" && newTaskTitle.trim()) {
                    e.preventDefault();
                    handleCreateTaskFromDialog();
                  }
                }}
                autoFocus
                style={{ marginBottom: 12 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="settings-btn settings-btn--primary"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (newTaskTitle.trim()) {
                      handleCreateTaskFromDialog().catch(console.error);
                    }
                  }}
                  disabled={!newTaskTitle.trim()}
                >
                  Add Task
                </button>
                <button
                  className="settings-btn"
                  onClick={() => {
                    setShowNewTaskDialog(false);
                    setNewTaskTitle("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <UpdateNotification />
    </div>
  );
}

export default App;
