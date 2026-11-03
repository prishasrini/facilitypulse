// Mirrors the API's response shapes (server/src/types.ts).

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
  setpoint: number | null;
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
  building: string;
  status: DeviceStatus | '';
  q: string;
}
