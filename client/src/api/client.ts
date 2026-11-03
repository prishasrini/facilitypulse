import { Alert, Device, DeviceFilters } from '../types';

const BASE_URL = '/api';

/** Error carrying the HTTP status and the server's own message. */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new ApiError('Cannot reach the server. Is the API running?', 0);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(body?.error ?? `Request failed (${response.status})`, response.status);
  }
  return body as T;
}

export const api = {
  getDevices(filters: Partial<DeviceFilters> = {}): Promise<Device[]> {
    const params = new URLSearchParams();
    // Only send filters that are actually set.
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const query = params.toString();
    return request<Device[]>(`/devices${query ? `?${query}` : ''}`);
  },

  getBuildings(): Promise<string[]> {
    return request<string[]>('/buildings');
  },

  getOpenAlerts(): Promise<Alert[]> {
    return request<Alert[]>('/alerts?open=true');
  },

  updateSetpoint(deviceId: string, setpoint: number): Promise<Device> {
    return request<Device>(`/devices/${encodeURIComponent(deviceId)}/setpoint`, {
      method: 'PATCH',
      body: JSON.stringify({ setpoint }),
    });
  },

  acknowledgeAlert(alertId: string): Promise<Alert> {
    return request<Alert>(`/alerts/${encodeURIComponent(alertId)}/acknowledge`, { method: 'POST' });
  },
};
