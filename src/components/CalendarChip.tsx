import React from 'react';

interface CalendarChipProps {
  time: string;
  title: string;
  attendees?: string;
  hasVideoLink?: boolean;
  onVideoClick?: () => void;
  onClick?: () => void;
}

const CalendarChip: React.FC<CalendarChipProps> = ({
  time,
  title,
  attendees,
  hasVideoLink,
  onVideoClick,
  onClick,
}) => {
  return (
    <div
      className="calendar-chip"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <div className="calendar-chip-time">{time}</div>
      <div className="calendar-chip-content">
        <span className="calendar-chip-title">{title}</span>
        {attendees && (
          <span className="calendar-chip-attendees">{attendees}</span>
        )}
      </div>
      {hasVideoLink && (
        <button
          className="calendar-chip-video-btn"
          onClick={(e) => {
            e.stopPropagation();
            onVideoClick?.();
          }}
          aria-label="Join video call"
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            width="20"
            height="20"
          >
            <path d="M3.25 4A2.25 2.25 0 0 0 1 6.25v7.5A2.25 2.25 0 0 0 3.25 16h7.5A2.25 2.25 0 0 0 13 13.75v-7.5A2.25 2.25 0 0 0 10.75 4h-7.5ZM19 4.75a.75.75 0 0 0-1.28-.53l-3 3a.75.75 0 0 0-.22.53v4.5c0 .199.079.39.22.53l3 3a.75.75 0 0 0 1.28-.53V4.75Z" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default CalendarChip;
