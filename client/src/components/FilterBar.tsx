import { DeviceFilters, DeviceStatus } from '../types';

interface FilterBarProps {
  filters: DeviceFilters;
  buildings: string[];
  onChange: (filters: DeviceFilters) => void;
}

const STATUS_OPTIONS: { value: DeviceStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'normal', label: 'Normal' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
  { value: 'offline', label: 'Offline' },
];

export function FilterBar({ filters, buildings, onChange }: FilterBarProps) {
  const update = <K extends keyof DeviceFilters>(key: K, value: DeviceFilters[K]) =>
    onChange({ ...filters, [key]: value });

  const hasFilters = filters.building || filters.status || filters.q;

  return (
    <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
      <div className="field field--grow">
        <label htmlFor="search">Search devices</label>
        <input
          id="search"
          type="search"
          placeholder="Name or ID, e.g. lobby"
          value={filters.q}
          onChange={(e) => update('q', e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="building">Building</label>
        <select id="building" value={filters.building} onChange={(e) => update('building', e.target.value)}>
          <option value="">All buildings</option>
          {buildings.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="status">Status</label>
        <select
          id="status"
          value={filters.status}
          onChange={(e) => update('status', e.target.value as DeviceStatus | '')}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button type="button" className="btn btn--ghost" onClick={() => onChange({ building: '', status: '', q: '' })}>
          Clear filters
        </button>
      )}
    </form>
  );
}
