import { DeviceStatus } from '../types';

const LABEL: Record<DeviceStatus, string> = {
  normal: 'Normal',
  warning: 'Warning',
  critical: 'Critical',
  offline: 'Offline',
};

const ICON: Record<DeviceStatus, string> = {
  normal: '●',
  warning: '▲',
  critical: '■',
  offline: '○',
};

/** Status is shown with text and a shape, not colour alone, so it works for colour-blind users. */
export function StatusBadge({ status }: { status: DeviceStatus }) {
  return (
    <span className={`badge badge--${status}`}>
      <span aria-hidden="true">{ICON[status]}</span> {LABEL[status]}
    </span>
  );
}
