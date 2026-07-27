const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveApiUrl } = require('./apiConfig');

test('uses the local backend for web development when no API URL is configured', () => {
  assert.equal(
    resolveApiUrl({ configuredUrl: '', platform: 'web', windowOrigin: 'http://localhost:8081' }),
    'http://localhost:3001'
  );
});

test('prefers an explicit API URL override when provided', () => {
  assert.equal(
    resolveApiUrl({ configuredUrl: 'https://api.example.com', platform: 'web', windowOrigin: 'http://localhost:8081' }),
    'https://api.example.com'
  );
});

test('uses a native host-derived URL when running on a mobile device', () => {
  assert.equal(
    resolveApiUrl({ configuredUrl: '', platform: 'ios', expoHost: '192.168.1.10:8081' }),
    'http://192.168.1.10:3001'
  );
});
