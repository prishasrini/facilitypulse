export type DeviceType = 'thermostat' | 'air_quality' | 'energy_meter';

export type DeviceStatus = 'normal' | 'warning' | 'critical' | 'offline';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  building: string;
  floor: number;
  status: DeviceStatus;
  value: number;
  unit: string;
  /** Target temperature — only thermostats have one, everything else is null. */
  setpoint: number | null;
  /** Most recent readings, oldest first. Used for the sparkline. */
  history: number[];
  updatedAt: string;
}

export interface Alert {
  id: string;
  deviceId: string;
  deviceName: string;
  severity: 'warning' | 'critical';
  message: string;
  createdAt: string;
  acknowledged: boolean;
}

export interface DeviceFilters {
  building?: string;
  status?: DeviceStatus;
  q?: string;
}
