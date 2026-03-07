import { useState, useEffect, useRef } from 'react';
import type { CalendarEvent, Space, EventSpaceTagWithSpace } from '../types';
import { extractMeetingLink } from '../utils/videoConferencing';

interface EventPopoverProps {
  event: CalendarEvent;
  anchorElement: HTMLElement;
  onClose: () => void;
  spaces?: Space[];
  taggedSpaces?: EventSpaceTagWithSpace[];
  onTagSpace?: (spaceId: number) => void;
  onUntagSpace?: (spaceId: number) => void;
}

export default function EventPopover({ event, anchorElement, onClose, spaces, taggedSpaces, onTagSpace, onUntagSpace }: EventPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [showSpaceMenu, setShowSpaceMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !anchorElement.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [anchorElement, onClose]);

  useEffect(() => {
    if (popoverRef.current && anchorElement) {
      const rect = anchorElement.getBoundingClientRect();
      const popover = popoverRef.current;

      popover.style.position = 'fixed';
      popover.style.left = `${rect.right + 10}px`;
      popover.style.top = `${rect.top}px`;

      const popoverRect = popover.getBoundingClientRect();
      if (popoverRect.right > window.innerWidth) {
        popover.style.left = `${rect.left - popoverRect.width - 10}px`;
      }
      if (popoverRect.bottom > window.innerHeight) {
        popover.style.top = `${window.innerHeight - popoverRect.height - 10}px`;
      }
    }
  }, [anchorElement]);

  // Close space menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowSpaceMenu(false);
      }
    };
    if (showSpaceMenu) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSpaceMenu]);

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateRange = (): string => {
    if (event.is_all_day) {
      return 'All day';
    }
    return `${formatTime(event.start_date)} - ${formatTime(event.end_date)}`;
  };

  const meetingLink = extractMeetingLink(event);

  const resolvedTaggedSpaces = taggedSpaces ?? [];
  const resolvedSpaces = spaces ?? [];
  const taggedSpaceIds = new Set(resolvedTaggedSpaces.map(ts => ts.space_id));
  const untaggedSpaces = resolvedSpaces.filter(s => !taggedSpaceIds.has(s.id));

  return (
    <>
      {/* Backdrop */}
      <div className="event-popover-backdrop" />

      {/* Popover */}
      <div ref={popoverRef} className="event-popover">
        {/* Header */}
        <div className="event-popover-header">
          <h3 className="event-popover-title">{event.title}</h3>
          <button className="event-popover-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Time */}
        <div className="event-popover-row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{formatDateRange()}</span>
        </div>

        {/* Location */}
        {event.location && (
          <div className="event-popover-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span>{event.location}</span>
          </div>
        )}

        {/* Meeting Link */}
        {meetingLink && (
          <div className="event-popover-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            <a href={meetingLink} target="_blank" rel="noopener noreferrer" className="event-popover-link">
              Join Meeting
            </a>
          </div>
        )}

        {/* Attendees */}
        {event.attendees && event.attendees.length > 0 && (
          <div className="event-popover-row" style={{ alignItems: 'start' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2 }}>
              <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <div>
              <span className="event-popover-label">Attendees ({event.attendees.length})</span>
              <div className="event-popover-attendees">
                {event.attendees.slice(0, 5).map((attendee, index) => (
                  <span key={index} className="event-popover-attendee">{attendee}</span>
                ))}
                {event.attendees.length > 5 && (
                  <span className="event-popover-attendee" style={{ fontStyle: 'italic' }}>
                    +{event.attendees.length - 5} more
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notes/Description */}
        {event.notes && (
          <div className="event-popover-notes">
            <span className="event-popover-label">Notes</span>
            <p className="event-popover-notes-text">{event.notes}</p>
          </div>
        )}

        {/* Tag to Space */}
        {spaces && (
          <div className="event-popover-spaces">
            <span className="event-popover-label">Spaces</span>

            {resolvedTaggedSpaces.length > 0 && (
              <div className="event-popover-tags">
                {resolvedTaggedSpaces.map(tagged => (
                  <span key={tagged.id} className="event-popover-tag">
                    <span className="event-popover-tag-dot" style={{ backgroundColor: tagged.space_color }} />
                    <span>{tagged.space_title}</span>
                    <button
                      className="event-popover-tag-remove"
                      aria-label={`Remove from ${tagged.space_title}`}
                      onClick={() => onUntagSpace?.(tagged.space_id)}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            {untaggedSpaces.length > 0 && (
              <div className="event-popover-add-space" ref={menuRef}>
                <button
                  className="event-popover-add-btn"
                  onClick={() => setShowSpaceMenu(!showSpaceMenu)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add to space
                </button>
                {showSpaceMenu && (
                  <div className="event-popover-space-menu">
                    {untaggedSpaces.map(space => (
                      <button
                        key={space.id}
                        className="event-popover-space-item"
                        onClick={() => {
                          onTagSpace?.(space.id);
                          setShowSpaceMenu(false);
                        }}
                      >
                        <span className="event-popover-tag-dot" style={{ backgroundColor: space.color }} />
                        {space.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
