import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock axios
vi.mock('axios');

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock window.alert
global.alert = vi.fn();

// Mock window.confirm
global.confirm = vi.fn(() => true);

console.log('✅ Frontend test environment setup complete');
