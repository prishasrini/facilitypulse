import { Device } from '../types';
import { DEVICE_TYPE_LABEL, formatFloor, formatReading } from '../utils/format';
import { Sparkline } from './Sparkline';
import { StatusBadge } from './StatusBadge';

interface DeviceCardProps {
  device: Device;
  onSelect: (id: string) => void;
}

export function DeviceCard({ device, onSelect }: DeviceCardProps) {
  const offline = device.status === 'offline';

  return (
    <li className={`card card--${device.status}`}>
      {/* A real <button> gives keyboard focus, Enter/Space and screen-reader semantics for free. */}
      <button
        type="button"
        className="card__button"
        onClick={() => onSelect(device.id)}
        aria-label={`${device.name}, ${device.status}. Open details`}
      >
        <div className="card__top">
          <span className="card__type">{DEVICE_TYPE_LABEL[device.type]}</span>
          <StatusBadge status={device.status} />
        </div>
        <h3 className="card__name">{device.name}</h3>
        <p className="card__location">
          {device.building} · {formatFloor(device.floor)}
        </p>
        <div className="card__bottom">
          <p className="card__reading">{offline ? '—' : formatReading(device.value, device.unit)}</p>
          {!offline && <Sparkline values={device.history} label={`${device.name} trend`} />}
        </div>
        {device.setpoint !== null && !offline && (
          <p className="card__meta">Setpoint {device.setpoint} °C</p>
        )}
      </button>
    </li>
  );
}
