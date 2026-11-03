import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { computeStatus, createStore, Store } from '../src/store';

// rng of 0.5 means zero noise, so the simulation is fully predictable in tests.
let store: Store;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  store = createStore(() => 0.5);
  app = createApp(store);
});

describe('GET /api/devices', () => {
  it('returns every device', async () => {
    const res = await request(app).get('/api/devices');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(8);
  });

  it('filters by building, status and search text', async () => {
    const byBuilding = await request(app).get('/api/devices').query({ building: 'Tower B' });
    expect(byBuilding.body.every((d: { building: string }) => d.building === 'Tower B')).toBe(true);

    const offline = await request(app).get('/api/devices').query({ status: 'offline' });
    expect(offline.body.map((d: { id: string }) => d.id)).toEqual(['t-412']);

    const search = await request(app).get('/api/devices').query({ q: 'lobby' });
    expect(search.body.map((d: { id: string }) => d.id)).toEqual(['t-101']);
  });

  it('rejects an unknown status filter', async () => {
    const res = await request(app).get('/api/devices').query({ status: 'broken' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for a missing device', async () => {
    const res = await request(app).get('/api/devices/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Device not found');
  });
});

describe('PATCH /api/devices/:id/setpoint', () => {
  it('updates the setpoint and recalculates status', async () => {
    // Conference Room 2B is at 25.3 °C with setpoint 22 → warning.
    expect(store.getDevice('t-205')?.status).toBe('warning');

    const res = await request(app).patch('/api/devices/t-205/setpoint').send({ setpoint: 25 });
    expect(res.status).toBe(200);
    expect(res.body.setpoint).toBe(25);
    expect(res.body.status).toBe('normal');
  });

  it.each([
    [{ setpoint: 'hot' }, 'setpoint must be a number'],
    [{ setpoint: 40 }, 'setpoint must be between 16 and 30 °C'],
    [{}, 'setpoint must be a number'],
  ])('rejects invalid body %j', async (body, message) => {
    const res = await request(app).patch('/api/devices/t-101/setpoint').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(message);
  });

  it('rejects non-thermostats and offline devices', async () => {
    const meter = await request(app).patch('/api/devices/em-001/setpoint').send({ setpoint: 20 });
    expect(meter.status).toBe(400);

    const offline = await request(app).patch('/api/devices/t-412/setpoint').send({ setpoint: 20 });
    expect(offline.status).toBe(409);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .patch('/api/devices/t-101/setpoint')
      .set('Content-Type', 'application/json')
      .send('{bad json');
    expect(res.status).toBe(400);
  });
});

describe('alerts', () => {
  it('creates alerts for devices that start unhealthy', async () => {
    const res = await request(app).get('/api/alerts').query({ open: 'true' });
    const deviceIds = res.body.map((a: { deviceId: string }) => a.deviceId).sort();
    expect(deviceIds).toEqual(['aq-102', 'em-002', 't-205']);
  });

  it('acknowledges an alert so it leaves the open list', async () => {
    const [first] = (await request(app).get('/api/alerts').query({ open: 'true' })).body;

    const ack = await request(app).post(`/api/alerts/${first.id}/acknowledge`);
    expect(ack.status).toBe(200);
    expect(ack.body.acknowledged).toBe(true);

    const open = await request(app).get('/api/alerts').query({ open: 'true' });
    expect(open.body.find((a: { id: string }) => a.id === first.id)).toBeUndefined();
  });

  it('returns 404 when acknowledging a missing alert', async () => {
    const res = await request(app).post('/api/alerts/alert-999/acknowledge');
    expect(res.status).toBe(404);
  });
});

describe('simulation', () => {
  it('keeps history at a fixed length and skips offline devices', () => {
    const offlineBefore = store.getDevice('t-412')!.updatedAt;
    for (let i = 0; i < 30; i++) store.tick();

    expect(store.getDevice('t-101')!.history).toHaveLength(20);
    expect(store.getDevice('t-412')!.updatedAt).toBe(offlineBefore);
  });

  it('computes status thresholds per device type', () => {
    const base = { status: 'normal' as const, setpoint: null };
    expect(computeStatus({ ...base, type: 'air_quality', value: 700 })).toBe('normal');
    expect(computeStatus({ ...base, type: 'air_quality', value: 1000 })).toBe('warning');
    expect(computeStatus({ ...base, type: 'air_quality', value: 1300 })).toBe('critical');
    expect(computeStatus({ ...base, type: 'thermostat', value: 27, setpoint: 22 })).toBe('critical');
  });
});
