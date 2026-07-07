import '@testing-library/jest-dom';

// Recharts' ResponsiveContainer relies on ResizeObserver, absent in jsdom.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);
