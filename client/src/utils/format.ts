import { DeviceType } from '../types';

export const DEVICE_TYPE_LABEL: Record<DeviceType, string> = {
  thermostat: 'Thermostat',
  air_quality: 'Air quality',
  energy_meter: 'Energy meter',
};

export function formatFloor(floor: number): string {
  return floor === 0 ? 'Basement' : `Floor ${floor}`;
}

export function formatReading(value: number, unit: string): string {
  return `${value} ${unit}`;
}

/** "just now", "12s ago", "3m ago" — relative to `now` so it can be tested. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}
