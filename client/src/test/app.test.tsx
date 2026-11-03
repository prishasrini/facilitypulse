import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { api, ApiError } from '../api/client';
import { alert, jsonResponse, meter, thermostat } from './fixtures';

/** Routes mocked fetch calls by URL + method, like a tiny fake backend. */
function mockBackend(overrides: Record<string, () => Response> = {}) {
  let openAlerts = [alert];
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const key = `${method} ${url}`;
    if (overrides[key]) return overrides[key]();

    if (url === '/api/buildings') return jsonResponse(['Tower A', 'Tower B']);
    if (url === '/api/alerts?open=true') return jsonResponse(openAlerts);
    if (method === 'POST' && url === '/api/alerts/alert-1/acknowledge') {
      openAlerts = [];
      return jsonResponse({ ...alert, acknowledged: true });
    }
    if (url.startsWith('/api/devices')) return jsonResponse([thermostat, meter]);
    return jsonResponse({ error: 'Not found' }, 404);
  });
}

describe('App (integration)', () => {
  it('loads devices, summary and alerts from the API', async () => {
    mockBackend();
    render(<App />);

    const grid = await screen.findByRole('list', { name: 'Devices' });
    expect(await within(grid).findByText('Lobby Thermostat')).toBeInTheDocument();
    expect(within(grid).getByText('HVAC Plant Meter')).toBeInTheDocument();
    expect(screen.getByText('Showing 2 devices')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /open alerts/i })).toHaveTextContent('1');
  });

  it('acknowledges an alert and removes it from the list', async () => {
    const fetchMock = mockBackend();
    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: /acknowledge alert/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/alerts/alert-1/acknowledge',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(await screen.findByText(/all clear/i)).toBeInTheDocument();
  });

  it('opens the detail panel and returns focus to the card on close', async () => {
    mockBackend();
    render(<App />);

    const card = await screen.findByRole('button', { name: /lobby thermostat, normal/i });
    await userEvent.click(card);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Close details' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(card).toHaveFocus();
  });

  it('shows a friendly error when the server is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    render(<App />);

    expect(await screen.findAllByText(/cannot reach the server/i)).not.toHaveLength(0);
    expect(screen.getByText('Connection lost')).toBeInTheDocument();
  });
});

describe('api client', () => {
  it('only sends filters that are set', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([]));
    await api.getDevices({ building: 'Tower A', status: '', q: '' });
    expect(fetchMock).toHaveBeenCalledWith('/api/devices?building=Tower+A', expect.anything());
  });

  it('throws ApiError with the server message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ error: 'Device is offline' }, 409));
    const promise = api.updateSetpoint('t-412', 20);
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ message: 'Device is offline', status: 409 });
  });
});
