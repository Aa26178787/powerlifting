import '@testing-library/jest-dom'

// Ensure localStorage is available in Node environment for zustand persist
if (typeof global.localStorage === 'undefined') {
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  }
}
