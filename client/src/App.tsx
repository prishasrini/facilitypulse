import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api/client';
import { AlertsPanel } from './components/AlertsPanel';
import { DeviceCard } from './components/DeviceCard';
import { DeviceDetail } from './components/DeviceDetail';
import { FilterBar } from './components/FilterBar';
import { SummaryBar } from './components/SummaryBar';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { usePolling } from './hooks/usePolling';
import { DeviceFilters } from './types';

const POLL_MS = 5000;

export default function App() {
  const [filters, setFilters] = useState<DeviceFilters>({ building: '', status: '', q: '' });
  const [buildings, setBuildings] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  // Wait until the user stops typing before searching.
  const debouncedQuery = useDebouncedValue(filters.q, 300);

  const fetchDevices = useCallback(
    () => api.getDevices({ building: filters.building, status: filters.status, q: debouncedQuery }),
    [filters.building, filters.status, debouncedQuery],
  );
  const devices = usePolling(fetchDevices, POLL_MS);

  // The summary always shows the whole estate, not just the filtered view.
  const fetchAllDevices = useCallback(() => api.getDevices(), []);
  const allDevices = usePolling(fetchAllDevices, POLL_MS);

  const fetchAlerts = useCallback(() => api.getOpenAlerts(), []);
  const alerts = usePolling(fetchAlerts, POLL_MS);

  useEffect(() => {
    api.getBuildings().then(setBuildings).catch(() => setBuildings([]));
  }, []);

  const selectDevice = useCallback((id: string) => {
    lastFocused.current = document.activeElement as HTMLElement | null;
    setSelectedId(id);
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedId(null);
    // Return focus to whatever opened the panel.
    lastFocused.current?.focus();
  }, []);

  async function saveSetpoint(deviceId: string, setpoint: number) {
    await api.updateSetpoint(deviceId, setpoint);
    await Promise.all([devices.refresh(), allDevices.refresh(), alerts.refresh()]);
  }

  async function acknowledge(alertId: string) {
    await api.acknowledgeAlert(alertId);
    await alerts.refresh();
  }

  // Look the selected device up from the full list so the detail panel stays live.
  const selectedDevice = allDevices.data?.find((d) => d.id === selectedId) ?? null;
  const deviceList = devices.data ?? [];

  return (
    <div className="app">
      <a href="#devices" className="skip-link">
        Skip to devices
      </a>

      <header className="topbar">
        <div>
          <h1>FacilityPulse</h1>
          <p className="muted">Live building sensor monitoring</p>
        </div>
        <p className={`live ${devices.error ? 'live--down' : ''}`}>
          <span aria-hidden="true" className="live__dot" />
          {devices.error ? 'Connection lost' : `Live · refreshes every ${POLL_MS / 1000}s`}
        </p>
      </header>

      {allDevices.data && <SummaryBar devices={allDevices.data} />}

      <div className="layout">
        <main id="devices" className="devices">
          <FilterBar filters={filters} buildings={buildings} onChange={setFilters} />

          <div aria-live="polite" className="status-line">
            {devices.loading && !devices.data && <p className="muted">Loading devices…</p>}
            {devices.error && (
              <p className="error">
                {devices.error}{' '}
                <button type="button" className="link" onClick={() => devices.refresh()}>
                  Retry
                </button>
              </p>
            )}
            {devices.data && (
              <p className="muted small">
                Showing {deviceList.length} device{deviceList.length === 1 ? '' : 's'}
              </p>
            )}
          </div>

          {devices.data && deviceList.length === 0 && (
            <p className="empty">No devices match these filters.</p>
          )}

          <ul className="grid" aria-label="Devices">
            {deviceList.map((device) => (
              <DeviceCard key={device.id} device={device} onSelect={selectDevice} />
            ))}
          </ul>
        </main>

        <AlertsPanel
          alerts={alerts.data ?? []}
          error={alerts.error}
          onAcknowledge={acknowledge}
          onSelectDevice={selectDevice}
        />
      </div>

      {selectedDevice && (
        // key forces a fresh form state when a different device is opened
        <DeviceDetail
          key={selectedDevice.id}
          device={selectedDevice}
          onClose={closeDetail}
          onSaveSetpoint={saveSetpoint}
        />
      )}
    </div>
  );
}
