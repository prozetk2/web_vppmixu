/**
 * Jest Setup File
 * 
 * This file runs before all tests to configure the test environment
 */

// Load test environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.test file
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Verify we're in test environment
if (process.env.NODE_ENV !== 'test') {
  console.warn('⚠️  WARNING: NODE_ENV is not set to "test"');
  console.warn('⚠️  Setting NODE_ENV=test to prevent accidental database modifications');
  process.env.NODE_ENV = 'test';
}

// Verify test database is being used
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('_test')) {
  console.error('❌ ERROR: Test database URL must contain "_test"');
  console.error('❌ Current DATABASE_URL:', process.env.DATABASE_URL);
  console.error('❌ Tests will NOT run to protect your production database!');
  process.exit(1);
}

// Set test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(), // Suppress console.log
  debug: jest.fn(), // Suppress console.debug
  info: jest.fn(), // Suppress console.info
  // Keep error and warn for debugging
  error: console.error,
  warn: console.warn,
};

// Global test utilities
global.testUtils = {
  // Add any global test utilities here
};

// Cleanup after all tests
afterAll(async () => {
  // Close any open connections
  // Add cleanup logic here if needed
});

console.info('✅ Test environment configured successfully');
console.info('📦 Using test database:', process.env.DATABASE_URL?.split('@')[1] || 'mock');
