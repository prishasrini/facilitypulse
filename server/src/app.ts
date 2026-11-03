import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { SETPOINT_MAX, SETPOINT_MIN, Store } from './store';
import { DeviceStatus } from './types';

const STATUSES: DeviceStatus[] = ['normal', 'warning', 'critical', 'offline'];

/** Reads an optional string query param, ignoring arrays and empty values. */
function queryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

export function createApp(store: Store) {
  const app = express();

  // Only the local dev frontend may call the API from a browser.
  app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
  // Small body limit — the API never needs large payloads.
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/buildings', (_req, res) => {
    res.json(store.listBuildings());
  });

  app.get('/api/devices', (req, res) => {
    const status = queryString(req.query.status);
    if (status && !STATUSES.includes(status as DeviceStatus)) {
      return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
    }
    const devices = store.listDevices({
      building: queryString(req.query.building),
      status: status as DeviceStatus | undefined,
      q: queryString(req.query.q),
    });
    res.json(devices);
  });

  app.get('/api/devices/:id', (req, res) => {
    const device = store.getDevice(req.params.id);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json(device);
  });

  app.patch('/api/devices/:id/setpoint', (req, res) => {
    const device = store.getDevice(req.params.id);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    if (device.type !== 'thermostat') {
      return res.status(400).json({ error: 'Only thermostats have a setpoint' });
    }
    if (device.status === 'offline') {
      return res.status(409).json({ error: 'Device is offline' });
    }

    const setpoint = req.body?.setpoint;
    if (typeof setpoint !== 'number' || !Number.isFinite(setpoint)) {
      return res.status(400).json({ error: 'setpoint must be a number' });
    }
    if (setpoint < SETPOINT_MIN || setpoint > SETPOINT_MAX) {
      return res.status(400).json({ error: `setpoint must be between ${SETPOINT_MIN} and ${SETPOINT_MAX} °C` });
    }

    res.json(store.updateSetpoint(device, setpoint));
  });

  app.get('/api/alerts', (req, res) => {
    const onlyOpen = req.query.open === 'true';
    res.json(store.listAlerts(onlyOpen));
  });

  app.post('/api/alerts/:id/acknowledge', (req, res) => {
    const alert = store.acknowledgeAlert(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json(alert);
  });

  // Unknown routes
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Last-resort error handler: log the detail, never leak it to the client.
  app.use((err: Error & { type?: string }, _req: Request, res: Response, _next: NextFunction) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body must be valid JSON' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
