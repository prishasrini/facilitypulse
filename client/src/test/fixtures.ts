import { Alert, Device } from '../types';

export const thermostat: Device = {
  id: 't-101',
  name: 'Lobby Thermostat',
  type: 'thermostat',
  building: 'Tower A',
  floor: 1,
  status: 'normal',
  value: 22.4,
  unit: '°C',
  setpoint: 22,
  history: [22, 22.2, 22.4],
  updatedAt: new Date().toISOString(),
};

export const meter: Device = {
  id: 'em-002',
  name: 'HVAC Plant Meter',
  type: 'energy_meter',
  building: 'Tower B',
  floor: 0,
  status: 'critical',
  value: 158,
  unit: 'kW',
  setpoint: null,
  history: [150, 155, 158],
  updatedAt: new Date().toISOString(),
};

export const alert: Alert = {
  id: 'alert-1',
  deviceId: 'em-002',
  deviceName: 'HVAC Plant Meter',
  severity: 'critical',
  message: 'Power draw at 158 kW exceeds normal load',
  createdAt: new Date().toISOString(),
  acknowledged: false,
};

/** Minimal fake Response for mocking fetch. */
export function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}
