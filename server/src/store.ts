import { Alert, Device, DeviceFilters, DeviceStatus } from './types';

const HISTORY_LENGTH = 20;
export const SETPOINT_MIN = 16;
export const SETPOINT_MAX = 30;

type SeedDevice = Omit<Device, 'status' | 'history' | 'updatedAt'> & { offline?: boolean };

const SEED_DEVICES: SeedDevice[] = [
  { id: 't-101', name: 'Lobby Thermostat', type: 'thermostat', building: 'Tower A', floor: 1, value: 22.4, unit: '°C', setpoint: 22 },
  { id: 't-205', name: 'Conference Room 2B', type: 'thermostat', building: 'Tower A', floor: 2, value: 25.3, unit: '°C', setpoint: 22 },
  { id: 't-310', name: 'Server Room Cooling', type: 'thermostat', building: 'Tower B', floor: 3, value: 18.2, unit: '°C', setpoint: 18 },
  { id: 't-412', name: 'Training Room Thermostat', type: 'thermostat', building: 'Tower B', floor: 4, value: 21, unit: '°C', setpoint: 21, offline: true },
  { id: 'aq-102', name: 'Cafeteria Air Quality', type: 'air_quality', building: 'Tower A', floor: 1, value: 940, unit: 'ppm CO₂', setpoint: null },
  { id: 'aq-301', name: 'Open Office Air Quality', type: 'air_quality', building: 'Tower B', floor: 3, value: 620, unit: 'ppm CO₂', setpoint: null },
  { id: 'em-001', name: 'Main Distribution Meter', type: 'energy_meter', building: 'Tower A', floor: 0, value: 96, unit: 'kW', setpoint: null },
  { id: 'em-002', name: 'HVAC Plant Meter', type: 'energy_meter', building: 'Tower B', floor: 0, value: 158, unit: 'kW', setpoint: null },
];

const SEED_JITTER: Record<Device['type'], number> = { thermostat: 0.4, air_quality: 30, energy_meter: 5 };

const SEVERITY_RANK: Record<DeviceStatus, number> = { offline: -1, normal: 0, warning: 1, critical: 2 };

/** Decides a device's health from its latest reading. Thresholds are per device type. */
export function computeStatus(device: Pick<Device, 'type' | 'value' | 'setpoint' | 'status'>): DeviceStatus {
  if (device.status === 'offline') return 'offline';

  switch (device.type) {
    case 'thermostat': {
      const drift = Math.abs(device.value - (device.setpoint ?? device.value));
      if (drift <= 2) return 'normal';
      return drift <= 4 ? 'warning' : 'critical';
    }
    case 'air_quality':
      if (device.value < 800) return 'normal';
      return device.value < 1200 ? 'warning' : 'critical';
    case 'energy_meter':
      if (device.value < 120) return 'normal';
      return device.value < 150 ? 'warning' : 'critical';
  }
}

function alertMessage(device: Device): string {
  switch (device.type) {
    case 'thermostat':
      return `Temperature ${device.value}${device.unit} is off setpoint ${device.setpoint}${device.unit}`;
    case 'air_quality':
      return `CO₂ level at ${device.value} ppm — ventilation needed`;
    case 'energy_meter':
      return `Power draw at ${device.value} kW exceeds normal load`;
  }
}

const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * In-memory data store. `rng` is injectable so tests can make the simulation deterministic.
 * In a real system this would be a database plus a feed from the building controllers.
 */
export function createStore(rng: () => number = Math.random) {
  const now = () => new Date().toISOString();
  let alertCounter = 0;
  const alerts: Alert[] = [];

  const devices: Device[] = SEED_DEVICES.map(({ offline, ...seed }) => {
    const device: Device = {
      ...seed,
      status: offline ? 'offline' : 'normal',
      // A gentle wave so the trend line looks realistic from the first page load.
      history: Array.from({ length: HISTORY_LENGTH }, (_, i) =>
        i === HISTORY_LENGTH - 1 ? seed.value : round(seed.value + Math.sin(i / 2) * SEED_JITTER[seed.type], 1),
      ),
      updatedAt: now(),
    };
    device.status = computeStatus(device);
    return device;
  });

  function raiseAlert(device: Device) {
    if (device.status !== 'warning' && device.status !== 'critical') return;
    alertCounter += 1;
    alerts.unshift({
      id: `alert-${alertCounter}`,
      deviceId: device.id,
      deviceName: device.name,
      severity: device.status,
      message: alertMessage(device),
      createdAt: now(),
      acknowledged: false,
    });
  }

  // Devices that start in a bad state get an alert straight away.
  devices.forEach(raiseAlert);

  function nextReading(device: Device): number {
    const noise = rng() - 0.5; // between -0.5 and 0.5
    switch (device.type) {
      case 'thermostat': {
        // Drifts slowly back towards its setpoint, like a real HVAC loop.
        const target = device.setpoint ?? device.value;
        return round(device.value + (target - device.value) * 0.15 + noise * 1.2, 1);
      }
      case 'air_quality':
        return Math.round(clamp(device.value + noise * 80, 400, 2000));
      case 'energy_meter':
        return round(clamp(device.value + noise * 12, 20, 200), 1);
    }
  }

  return {
    listDevices(filters: DeviceFilters = {}): Device[] {
      const q = filters.q?.trim().toLowerCase();
      return devices.filter(
        (d) =>
          (!filters.building || d.building === filters.building) &&
          (!filters.status || d.status === filters.status) &&
          (!q || d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q)),
      );
    },

    getDevice(id: string): Device | undefined {
      return devices.find((d) => d.id === id);
    },

    listBuildings(): string[] {
      return [...new Set(devices.map((d) => d.building))].sort();
    },

    /** Caller is responsible for validating the device type and range first. */
    updateSetpoint(device: Device, setpoint: number): Device {
      const previous = device.status;
      device.setpoint = setpoint;
      device.status = computeStatus(device);
      device.updatedAt = now();
      if (SEVERITY_RANK[device.status] > SEVERITY_RANK[previous]) raiseAlert(device);
      return device;
    },

    listAlerts(onlyOpen = false): Alert[] {
      return onlyOpen ? alerts.filter((a) => !a.acknowledged) : alerts;
    },

    acknowledgeAlert(id: string): Alert | undefined {
      const alert = alerts.find((a) => a.id === id);
      if (alert) alert.acknowledged = true;
      return alert;
    },

    /** Advances the simulation by one step: new reading, history, status, alerts. */
    tick(): void {
      for (const device of devices) {
        if (device.status === 'offline') continue;
        const previous = device.status;
        device.value = nextReading(device);
        device.history = [...device.history, device.value].slice(-HISTORY_LENGTH);
        device.status = computeStatus(device);
        device.updatedAt = now();
        if (SEVERITY_RANK[device.status] > SEVERITY_RANK[previous]) raiseAlert(device);
      }
    },
  };
}

export type Store = ReturnType<typeof createStore>;
