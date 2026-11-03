import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeviceCard } from '../components/DeviceCard';
import { DeviceDetail, validateSetpoint } from '../components/DeviceDetail';
import { FilterBar } from '../components/FilterBar';
import { StatusBadge } from '../components/StatusBadge';
import { AlertsPanel } from '../components/AlertsPanel';
import { timeAgo } from '../utils/format';
import { alert, meter, thermostat } from './fixtures';

describe('StatusBadge', () => {
  it('shows status as text, not just colour', () => {
    render(<StatusBadge status="critical" />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });
});

describe('DeviceCard', () => {
  it('shows the reading and opens details on click', async () => {
    const onSelect = vi.fn();
    render(<ul><DeviceCard device={thermostat} onSelect={onSelect} /></ul>);

    expect(screen.getByText('22.4 °C')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /lobby thermostat/i }));
    expect(onSelect).toHaveBeenCalledWith('t-101');
  });

  it('is reachable and usable with the keyboard', async () => {
    const onSelect = vi.fn();
    render(<ul><DeviceCard device={thermostat} onSelect={onSelect} /></ul>);

    await userEvent.tab();
    expect(screen.getByRole('button', { name: /lobby thermostat/i })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledOnce();
  });
});

describe('FilterBar', () => {
  it('reports filter changes and can clear them', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <FilterBar filters={{ building: '', status: '', q: '' }} buildings={['Tower A', 'Tower B']} onChange={onChange} />,
    );

    await userEvent.selectOptions(screen.getByLabelText('Building'), 'Tower B');
    expect(onChange).toHaveBeenLastCalledWith({ building: 'Tower B', status: '', q: '' });

    rerender(
      <FilterBar filters={{ building: 'Tower B', status: '', q: '' }} buildings={['Tower A', 'Tower B']} onChange={onChange} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onChange).toHaveBeenLastCalledWith({ building: '', status: '', q: '' });
  });
});

describe('validateSetpoint', () => {
  it.each([
    ['', 'Enter a setpoint'],
    ['abc', 'Setpoint must be a number'],
    ['40', 'Setpoint must be between 16 and 30 °C'],
    ['21.5', null],
  ])('validates %j', (input, expected) => {
    expect(validateSetpoint(input)).toBe(expected);
  });
});

describe('DeviceDetail', () => {
  it('blocks an out-of-range setpoint without calling the API', async () => {
    const onSave = vi.fn();
    render(<DeviceDetail device={thermostat} onClose={vi.fn()} onSaveSetpoint={onSave} />);

    const input = screen.getByLabelText(/target temperature/i);
    await userEvent.clear(input);
    await userEvent.type(input, '45');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('alert')).toHaveTextContent('between 16 and 30');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves a valid setpoint and confirms it', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<DeviceDetail device={thermostat} onClose={vi.fn()} onSaveSetpoint={onSave} />);

    const input = screen.getByLabelText(/target temperature/i);
    await userEvent.clear(input);
    await userEvent.type(input, '23.5');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith('t-101', 23.5);
    expect(await screen.findByText('Setpoint updated to 23.5 °C')).toBeInTheDocument();
  });

  it('shows the server error when saving fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Device is offline'));
    render(<DeviceDetail device={thermostat} onClose={vi.fn()} onSaveSetpoint={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Device is offline');
  });

  it('focuses the heading on open, hides the setpoint form for meters, and closes on Escape', async () => {
    const onClose = vi.fn();
    render(<DeviceDetail device={meter} onClose={onClose} onSaveSetpoint={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'HVAC Plant Meter' })).toHaveFocus();
    expect(screen.queryByLabelText(/target temperature/i)).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('AlertsPanel', () => {
  it('acknowledges an alert', async () => {
    const onAck = vi.fn().mockResolvedValue(undefined);
    render(<AlertsPanel alerts={[alert]} error={null} onAcknowledge={onAck} onSelectDevice={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /acknowledge alert for hvac plant meter/i }));
    expect(onAck).toHaveBeenCalledWith('alert-1');
  });

  it('shows an empty state', () => {
    render(<AlertsPanel alerts={[]} error={null} onAcknowledge={vi.fn()} onSelectDevice={vi.fn()} />);
    expect(screen.getByText(/all clear/i)).toBeInTheDocument();
  });
});

describe('timeAgo', () => {
  it('formats relative times', () => {
    const now = Date.parse('2026-01-01T12:00:00Z');
    expect(timeAgo('2026-01-01T11:59:58Z', now)).toBe('just now');
    expect(timeAgo('2026-01-01T11:59:30Z', now)).toBe('30s ago');
    expect(timeAgo('2026-01-01T11:55:00Z', now)).toBe('5m ago');
  });
});
