import { createApp } from './app';
import { createStore } from './store';

const PORT = Number(process.env.PORT ?? 4000);
const TICK_MS = 3000;

const store = createStore();
const app = createApp(store);

// Simulate live sensor readings arriving every few seconds.
setInterval(() => store.tick(), TICK_MS);

app.listen(PORT, () => {
  console.log(`FacilityPulse API running on http://localhost:${PORT}`);
});
