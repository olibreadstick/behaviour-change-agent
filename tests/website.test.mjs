import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_API_URL, fallbackDocument, websiteEnvironment } from '../scripts/website-config.mjs';

test('existing Vercel settings configure participant and admin APIs together', () => {
  const env = websiteEnvironment({ VITE_API_URL: 'https://api.example.test/', VITE_N8N_CHAT_URL: 'https://coach.example.test/webhook/penguin', VERCEL: '1', PRIVATE_TEST_KEY: 'keep-private' });
  assert.equal(env.EXPO_PUBLIC_API_URL, 'https://api.example.test');
  assert.equal(env.VITE_API_URL, env.EXPO_PUBLIC_API_URL);
  assert.equal(env.EXPO_PUBLIC_N8N_COACH_URL, 'https://coach.example.test/webhook/penguin');
  assert.equal(env.EXPO_PUBLIC_PRIVATE_TEST_KEY, undefined);
});
test('explicit Expo endpoints take precedence and login can use the existing API default', () => {
  const env = websiteEnvironment({ EXPO_PUBLIC_API_URL: 'https://new.example.test', EXPO_PUBLIC_N8N_COACH_URL: 'https://new.example.test/coach', VITE_API_URL: 'https://old.example.test' });
  assert.equal(env.VITE_API_URL, 'https://new.example.test');
  assert.equal(websiteEnvironment({}).EXPO_PUBLIC_API_URL, DEFAULT_API_URL);
});
test('a hosted build cannot silently publish with a missing coach or localhost API', () => {
  assert.throws(() => websiteEnvironment({ VERCEL: '1' }), /webhook/);
  assert.throws(() => websiteEnvironment({ VERCEL: '1', VITE_API_URL: 'http://localhost:8080', VITE_N8N_CHAT_URL: 'https://coach.example.test' }), /HTTPS/);
  assert.throws(() => websiteEnvironment({ VITE_N8N_CHAT_URL: 'https://name:password@coach.example.test' }), /credentials/);
});
test('admin refreshes stay on the researcher page and other routes use the participant app', () => {
  assert.equal(fallbackDocument('/admin'), 'admin/index.html');
  assert.equal(fallbackDocument('/admin/transcripts'), 'admin/index.html');
  assert.equal(fallbackDocument('/'), 'index.html');
  assert.equal(fallbackDocument('/calendar'), 'index.html');
  assert.equal(fallbackDocument('/administrator'), 'index.html');
});
