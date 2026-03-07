import { useState, useEffect } from 'react';
import { platform } from '@tauri-apps/plugin-os';
import type { Calendar, PermissionStatus } from '../types';
import { requestCalendarPermission, getCalendarList, openCalendarSettings } from '../api';

export default function CalendarSettings() {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMacOS, setIsMacOS] = useState<boolean>(true);
  const [recheckLoading, setRecheckLoading] = useState(false);

  useEffect(() => {
    const platformName = platform();
    setIsMacOS(platformName === 'macos');
    loadCalendarSettings();
  }, []);

  const loadCalendarSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const status = await requestCalendarPermission();
      setPermissionStatus(status);

      if (status === 'authorized') {
        const calendarList = await getCalendarList();
        setCalendars(calendarList);

        const saved = localStorage.getItem('selected_calendar_ids');
        if (saved) {
          setSelectedCalendarIds(new Set(JSON.parse(saved)));
        }
      }
    } catch (err) {
      console.error('Failed to load calendar settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load calendar settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCalendarToggle = (calendarId: string) => {
    const newSelected = new Set(selectedCalendarIds);
    if (newSelected.has(calendarId)) {
      newSelected.delete(calendarId);
    } else {
      newSelected.add(calendarId);
    }
    setSelectedCalendarIds(newSelected);
    localStorage.setItem('selected_calendar_ids', JSON.stringify(Array.from(newSelected)));
  };

  const handleRequestPermission = async () => {
    try {
      const status = await requestCalendarPermission();
      setPermissionStatus(status);

      if (status === 'authorized') {
        await loadCalendarSettings();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request permission');
    }
  };

  const handleRecheckPermission = async () => {
    setRecheckLoading(true);
    setError(null);
    try {
      const status = await requestCalendarPermission();
      setPermissionStatus(status);

      if (status === 'authorized') {
        const calendarList = await getCalendarList();
        setCalendars(calendarList);

        const saved = localStorage.getItem('selected_calendar_ids');
        if (saved) {
          setSelectedCalendarIds(new Set(JSON.parse(saved)));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recheck permission');
    } finally {
      setRecheckLoading(false);
    }
  };

  const handleOpenSystemSettings = async () => {
    try {
      await openCalendarSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open System Settings');
    }
  };

  if (loading) {
    return (
      <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>Loading calendar settings...</span>
    );
  }

  if (error && !permissionStatus) {
    return (
      <div className="flash flash--danger">{error}</div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <h2 style={{ fontSize: "var(--font-heading2-size)", fontWeight: 600, margin: 0 }}>Calendar Integration</h2>
        </div>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0 }}>
          Connect your system calendars to see events on the Today page
        </p>
      </div>

      {/* Permission Status */}
      {permissionStatus === 'notdetermined' && (
        <div style={{ marginBottom: '12px' }}>
          <div className="flash flash--warning" style={{ marginBottom: 8 }}>
            Calendar access not yet authorized
          </div>
          <p style={{ fontSize: 14, marginBottom: 8 }}>
            Orcas needs permission to access your calendars to show events on the Today page.
          </p>
          <button className="settings-btn settings-btn--primary" onClick={handleRequestPermission}>
            Request Calendar Access
          </button>
        </div>
      )}

      {permissionStatus === 'denied' && (
        <div style={{ marginBottom: '12px' }}>
          <div className="flash flash--danger" style={{ marginBottom: 8 }}>
            Calendar access denied. Please enable calendar access in System Settings.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="settings-btn settings-btn--primary" onClick={handleOpenSystemSettings}>
              Open System Settings
            </button>
            <button className="settings-btn" onClick={handleRecheckPermission} disabled={recheckLoading}>
              {recheckLoading ? 'Checking...' : 'Recheck Permission'}
            </button>
          </div>
        </div>
      )}

      {permissionStatus === 'restricted' && (
        <div style={{ marginBottom: '12px' }}>
          <div className="flash flash--warning" style={{ marginBottom: 8 }}>
            Calendar access is restricted by system policies.
          </div>
          <button className="settings-btn" onClick={handleRecheckPermission} disabled={recheckLoading}>
            {recheckLoading ? 'Checking...' : 'Recheck Permission'}
          </button>
        </div>
      )}

      {/* Calendar Selection */}
      {permissionStatus === 'authorized' && (
        <div>
          <span style={{ fontSize: 14, fontWeight: 600, display: "block", marginBottom: 8 }}>
            Select Calendars
          </span>

          {calendars.length === 0 ? (
            <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>No calendars found</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {calendars.map((calendar) => (
                <div
                  key={calendar.id}
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--bgColor-muted)',
                    borderRadius: '6px',
                    border: '1px solid var(--borderColor-default)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedCalendarIds.has(calendar.id)}
                    onChange={() => handleCalendarToggle(calendar.id)}
                    aria-label={calendar.title}
                  />
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: calendar.color,
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => handleCalendarToggle(calendar.id)}
                  >
                    <span style={{ fontWeight: 600, display: "block" }}>
                      {calendar.title}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                      {calendar.source}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '12px' }}>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              {selectedCalendarIds.size} calendar{selectedCalendarIds.size !== 1 ? 's' : ''} selected
            </span>
          </div>

          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--borderColor-default)' }}>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>
              If calendar events aren't showing up, try rechecking the permission or resetting it in System Settings.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="settings-btn settings-btn--small" onClick={handleRecheckPermission} disabled={recheckLoading}>
                {recheckLoading ? 'Checking...' : 'Recheck Permission'}
              </button>
              <button className="settings-btn settings-btn--small" onClick={handleOpenSystemSettings}>
                Open System Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Platform Note */}
      {!isMacOS && (
        <div style={{ marginTop: '16px' }}>
          <div className="flash flash--warning">
            Calendar integration is currently only available on macOS.
          </div>
        </div>
      )}
    </div>
  );
}
