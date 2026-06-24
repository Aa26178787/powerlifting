import '@testing-library/jest-dom'

// Node 26 ships an experimental global `localStorage` that throws unless
// `--localstorage-file` is passed, and it shadows jsdom's own implementation,
// leaving zustand's persist middleware with a broken storage. Install a
// complete in-memory Storage so persisted-store tests behave deterministically
// in every environment. It is a real implementation (not a no-op): `clear()`
// and `removeItem()` actually mutate, so per-test isolation holds. Harmless for
// node-environment engine tests, which never touch localStorage.
class MemoryStorage {
  #map = new Map()
  get length() { return this.#map.size }
  key(i) { return [...this.#map.keys()][i] ?? null }
  getItem(k) { return this.#map.has(k) ? this.#map.get(k) : null }
  setItem(k, v) { this.#map.set(String(k), String(v)) }
  removeItem(k) { this.#map.delete(k) }
  clear() { this.#map.clear() }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
  writable: true,
})
