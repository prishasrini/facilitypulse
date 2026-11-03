import { useState } from 'react';
import { Alert } from '../types';
import { timeAgo } from '../utils/format';

interface AlertsPanelProps {
  alerts: Alert[];
  error: string | null;
  onAcknowledge: (id: string) => Promise<void>;
  onSelectDevice: (deviceId: string) => void;
}

export function AlertsPanel({ alerts, error, onAcknowledge, onSelectDevice }: AlertsPanelProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleAcknowledge(id: string) {
    setPendingId(id);
    setActionError(null);
    try {
      await onAcknowledge(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not acknowledge alert');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="alerts" aria-labelledby="alerts-heading">
      <h2 id="alerts-heading">
        Open alerts <span className="count">{alerts.length}</span>
      </h2>

      {/* aria-live announces new errors to screen-reader users without stealing focus. */}
      <div aria-live="polite" className="sr-live">
        {(error || actionError) && <p className="error">{actionError ?? error}</p>}
      </div>

      {alerts.length === 0 ? (
        <p className="muted">All clear — nothing needs attention.</p>
      ) : (
        <ul className="alerts__list">
          {alerts.map((alert) => (
            <li key={alert.id} className={`alert alert--${alert.severity}`}>
              <div className="alert__head">
                <button type="button" className="link" onClick={() => onSelectDevice(alert.deviceId)}>
                  {alert.deviceName}
                </button>
                <span className="alert__time">{timeAgo(alert.createdAt)}</span>
              </div>
              <p className="alert__message">
                <span className="visually-hidden">{alert.severity}: </span>
                {alert.message}
              </p>
              <button
                type="button"
                className="btn btn--small"
                onClick={() => handleAcknowledge(alert.id)}
                disabled={pendingId === alert.id}
                aria-label={`Acknowledge alert for ${alert.deviceName}`}
              >
                {pendingId === alert.id ? 'Acknowledging…' : 'Acknowledge'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
