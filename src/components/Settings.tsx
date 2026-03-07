import { useState, useEffect, useRef, useCallback } from "react";
import { getSetting, setSetting, testConnection } from "../api";
import { PROVIDERS, Provider } from "../providers";
import CalendarSettings from "./CalendarSettings";

function Settings() {
  const [selectedProvider, setSelectedProvider] = useState<Provider>('anthropic');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    loadSettings();
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);

      const provider = await getSetting("api_provider");
      if (provider && (provider === 'anthropic' || provider === 'litellm')) {
        setSelectedProvider(provider as Provider);
      }

      const loadedSettings: Record<string, string> = {};
      for (const provider of PROVIDERS) {
        for (const field of provider.settingsFields) {
          try {
            const value = await getSetting(field.key);
            if (value) {
              loadedSettings[field.key] = value;
            }
          } catch {
            // Setting doesn't exist yet
          }
        }
      }

      setSettings(loadedSettings);
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveField = useCallback(async (key: string, value: string) => {
    const field = PROVIDERS.flatMap(p => p.settingsFields).find(f => f.key === key);
    if (!field) return;

    if (field.required && !value.trim()) {
      setFieldErrors(prev => ({ ...prev, [key]: `${field.label} is required` }));
      return;
    }

    if (field.validate && value.trim()) {
      const validationError = field.validate(value);
      if (validationError) {
        setFieldErrors(prev => ({ ...prev, [key]: validationError }));
        return;
      }
    }

    setFieldErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    try {
      setSaveStatus('saving');
      if (value.trim()) {
        await setSetting(key, value.trim());
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));

    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }

    debounceTimers.current[key] = setTimeout(() => {
      saveField(key, value);
    }, 800);
  };

  const handleProviderChange = async (value: string) => {
    const provider = value as Provider;
    setSelectedProvider(provider);
    setFieldErrors({});
    setTestStatus('idle');
    setTestMessage('');

    try {
      setSaveStatus('saving');
      await setSetting("api_provider", provider);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('');
    try {
      const msg = await testConnection();
      setTestStatus('success');
      setTestMessage(msg);
    } catch (error) {
      setTestStatus('error');
      setTestMessage(typeof error === 'string' ? error : 'Connection failed');
    }
  };

  const currentProvider = PROVIDERS.find(p => p.id === selectedProvider);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', width: '100%', flexDirection: 'column' }}>
      <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>Loading...</span>
        ) : (
          <>
            {/* Provider Selection */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <h2 style={{ fontSize: "var(--font-heading2-size)", fontWeight: 600, margin: 0 }}>API Provider</h2>
                {saveStatus === 'saving' && (
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Saving...</span>
                )}
                {saveStatus === 'saved' && (
                  <span style={{ fontSize: 12, color: "var(--color-green)" }}>Saved</span>
                )}
                {saveStatus === 'error' && (
                  <span style={{ fontSize: 12, color: "var(--color-red)" }}>Save failed</span>
                )}
              </div>
              <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: '12px' }}>
                Choose how you want to access models
              </p>

              <div role="radiogroup">
                {PROVIDERS.map((provider) => (
                  <div key={provider.id} style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="provider"
                        value={provider.id}
                        checked={selectedProvider === provider.id}
                        onChange={(e) => handleProviderChange(e.target.value)}
                      />
                      <span style={{ fontWeight: 600 }}>{provider.name}</span>
                    </label>
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginLeft: 24, display: "block" }}>
                      {provider.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Provider-Specific Settings */}
            {currentProvider && (
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: "var(--font-heading2-size)", fontWeight: 600, marginBottom: 8 }}>
                  {currentProvider.name} Configuration
                </h2>

                {currentProvider.settingsFields.map((field) => (
                  <div key={field.key} style={{ marginBottom: '12px' }}>
                    <label
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        marginBottom: 8,
                        display: "block",
                      }}
                    >
                      {field.label}
                      {field.required && (
                        <span style={{ color: "var(--color-red)", marginLeft: 4 }}>*</span>
                      )}
                    </label>

                    <input
                      type={field.type === 'password' ? 'password' : 'text'}
                      className={`settings-input${fieldErrors[field.key] ? ' settings-input--error' : ''}`}
                      value={settings[field.key] || ''}
                      onChange={(e) => updateSetting(field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />

                    {fieldErrors[field.key] && (
                      <span style={{ fontSize: 12, color: "var(--color-red)", marginTop: 4, display: "block" }}>
                        {fieldErrors[field.key]}
                      </span>
                    )}

                    {field.helpText && !fieldErrors[field.key] && (
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4, display: "block" }}>
                        {field.helpText}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Test Connection */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  className="settings-btn"
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing'}
                >
                  {testStatus === 'testing' ? 'Testing…' : 'Test Connection'}
                </button>
                {testStatus === 'success' && (
                  <span style={{ fontSize: 14, color: 'var(--color-green)' }}>
                    ✓ {testMessage}
                  </span>
                )}
                {testStatus === 'error' && (
                  <span style={{ fontSize: 14, color: 'var(--color-red)' }}>
                    ✗ {testMessage}
                  </span>
                )}
              </div>
            </div>

            {/* Calendar Settings Section */}
            <div
              style={{
                marginBottom: '24px',
                paddingTop: '24px',
                borderTop: '1px solid var(--color-gray-4)',
              }}
            >
              <CalendarSettings />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Settings;
