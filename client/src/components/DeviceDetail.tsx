import { FormEvent, useEffect, useRef, useState } from 'react';
import { Device } from '../types';
import { DEVICE_TYPE_LABEL, formatFloor, formatReading, timeAgo } from '../utils/format';
import { Sparkline } from './Sparkline';
import { StatusBadge } from './StatusBadge';

export const SETPOINT_MIN = 16;
export const SETPOINT_MAX = 30;

interface DeviceDetailProps {
  device: Device;
  onClose: () => void;
  onSaveSetpoint: (deviceId: string, setpoint: number) => Promise<void>;
}

/** Client-side check mirrors the server rules so users get instant feedback. The server still validates. */
export function validateSetpoint(raw: string): string | null {
  if (raw.trim() === '') return 'Enter a setpoint';
  const value = Number(raw);
  if (!Number.isFinite(value)) return 'Setpoint must be a number';
  if (value < SETPOINT_MIN || value > SETPOINT_MAX) {
    return `Setpoint must be between ${SETPOINT_MIN} and ${SETPOINT_MAX} °C`;
  }
  return null;
}

export function DeviceDetail({ device, onClose, onSaveSetpoint }: DeviceDetailProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [draft, setDraft] = useState(device.setpoint?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Move focus into the panel when it opens; Escape closes it.
  useEffect(() => {
    headingRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    const validationError = validateSetpoint(draft);
    setError(validationError);
    if (validationError) return;

    setSaving(true);
    try {
      await onSaveSetpoint(device.id, Number(draft));
      setMessage(`Setpoint updated to ${Number(draft)} °C`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update setpoint');
    } finally {
      setSaving(false);
    }
  }

  const offline = device.status === 'offline';
  const canEditSetpoint = device.type === 'thermostat' && !offline;

  return (
    <div className="overlay" onClick={onClose}>
      <aside
        className="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-heading"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="panel__header">
          <div>
            <p className="card__type">{DEVICE_TYPE_LABEL[device.type]} · {device.id}</p>
            <h2 id="detail-heading" ref={headingRef} tabIndex={-1}>
              {device.name}
            </h2>
            <p className="muted">
              {device.building} · {formatFloor(device.floor)}
            </p>
          </div>
          <button type="button" className="btn btn--ghost" onClick={onClose} aria-label="Close details">
            ✕
          </button>
        </header>

        <div className="panel__stats">
          <div>
            <p className="muted">Current reading</p>
            <p className="panel__reading">{offline ? 'No signal' : formatReading(device.value, device.unit)}</p>
          </div>
          <StatusBadge status={device.status} />
        </div>

        {!offline && (
          <div className="panel__chart">
            <Sparkline values={device.history} label={`${device.name} trend`} width={320} height={80} />
            <p className="muted small">Last {device.history.length} readings · updated {timeAgo(device.updatedAt)}</p>
          </div>
        )}

        {canEditSetpoint && (
          <form className="setpoint" onSubmit={handleSubmit} noValidate>
            <label htmlFor="setpoint">Target temperature (°C)</label>
            <div className="setpoint__row">
              <input
                id="setpoint"
                type="number"
                inputMode="decimal"
                step="0.5"
                min={SETPOINT_MIN}
                max={SETPOINT_MAX}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby="setpoint-hint setpoint-feedback"
              />
              <button type="submit" className="btn" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
            <p id="setpoint-hint" className="muted small">
              Allowed range {SETPOINT_MIN}–{SETPOINT_MAX} °C
            </p>
            <div id="setpoint-feedback" aria-live="polite">
              {error && <p className="error" role="alert">{error}</p>}
              {message && <p className="success">{message}</p>}
            </div>
          </form>
        )}

        {offline && (
          <p className="error">This device isn't reporting. Check its network connection on site.</p>
        )}
      </aside>
    </div>
  );
}
