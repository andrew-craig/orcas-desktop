import type { Space } from "../types";

// Heroicons outline SVGs (20px to match Figma sidebar spec)
function IconStar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

function IconQueueList() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function IconCog() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

type ViewName = "home" | "settings" | "agents" | "today" | "task";

interface SidebarProps {
  spaces: Space[];
  selectedSpace: Space | null;
  currentView: ViewName;
  onNavigate: (view: "home" | "settings" | "agents" | "today") => void;
  onSelectSpace: (space: Space) => void;
  onCreateSpace: () => void;
}

function Sidebar({
  spaces,
  selectedSpace,
  currentView,
  onNavigate,
  onSelectSpace,
  onCreateSpace,
}: SidebarProps) {
  return (
    <nav className="sidebar">
      {/* Top content */}
      <div className="sidebar-top">
        {/* On Deck: Today + Review */}
        <div className="sidebar-section">
          <button
            className={`sidebar-row${currentView === "today" ? " sidebar-row--selected" : ""}`}
            onClick={() => onNavigate("today")}
          >
            <IconStar />
            <span>Today</span>
          </button>
          <button className="sidebar-row">
            <IconQueueList />
            <span>Review</span>
          </button>
        </div>

        {/* Spaces */}
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <span>Spaces</span>
            <button
              className="sidebar-icon-btn"
              onClick={onCreateSpace}
              title="New space"
            >
              <IconPlus />
            </button>
          </div>

          {spaces.map((space) => (
            <button
              key={space.id}
              className={`sidebar-row sidebar-row--space${currentView === "home" && selectedSpace?.id === space.id ? " sidebar-row--selected" : ""}`}
              onClick={() => onSelectSpace(space)}
            >
              <div className="sidebar-color-dot-wrapper">
                <div
                  className="sidebar-color-dot"
                  style={{ backgroundColor: space.color }}
                />
              </div>
              <span className="sidebar-space-title">
                {space.title || "(Untitled)"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom content: Agents + Settings */}
      <div className="sidebar-bottom">
        <button
          className={`sidebar-row${currentView === "agents" ? " sidebar-row--selected" : ""}`}
          onClick={() => onNavigate("agents")}
        >
          <IconUsers />
          <span>Agents</span>
        </button>
        <button
          className={`sidebar-row${currentView === "settings" ? " sidebar-row--selected" : ""}`}
          onClick={() => onNavigate("settings")}
        >
          <IconCog />
          <span>Settings</span>
        </button>
      </div>
    </nav>
  );
}

export default Sidebar;
