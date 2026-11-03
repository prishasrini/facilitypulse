import { Device, DeviceStatus } from '../types';

const ORDER: DeviceStatus[] = ['normal', 'warning', 'critical', 'offline'];
const LABEL: Record<DeviceStatus, string> = {
  normal: 'Normal',
  warning: 'Warning',
  critical: 'Critical',
  offline: 'Offline',
};

export function SummaryBar({ devices }: { devices: Device[] }) {
  const counts = ORDER.map((status) => ({
    status,
    count: devices.filter((d) => d.status === status).length,
  }));

  return (
    <dl className="summary" aria-label="Device status summary">
      {counts.map(({ status, count }) => (
        <div key={status} className={`summary__item summary__item--${status}`}>
          <dt>{LABEL[status]}</dt>
          <dd>{count}</dd>
        </div>
      ))}
    </dl>
  );
}
