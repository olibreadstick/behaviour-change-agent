export const DEFAULT_API_URL = 'https://behaviour-change-agent-backend.onrender.com';

export function websiteEnvironment(input) {
  const api = input.EXPO_PUBLIC_API_URL || input.VITE_API_URL || DEFAULT_API_URL;
  const coach = input.EXPO_PUBLIC_N8N_COACH_URL || input.VITE_N8N_CHAT_URL || '';
  for (const [name, value] of [['API URL', api], ['coach URL', coach]]) {
    if (!value) continue;
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error(`${name} must be a public HTTP(S) endpoint without credentials.`);
    if (input.VERCEL && (url.protocol !== 'https:' || ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error(`${name} must use a public HTTPS address on Vercel.`);
  }
  if (input.VERCEL && !coach) throw new Error('Set VITE_N8N_CHAT_URL (or EXPO_PUBLIC_N8N_COACH_URL) to the published Penguin Coach webhook in Vercel before deploying.');
  return { ...input, VITE_API_URL: api.replace(/\/$/, ''), EXPO_PUBLIC_API_URL: api.replace(/\/$/, ''), EXPO_PUBLIC_N8N_COACH_URL: coach, EXPO_NO_DOTENV: '1' };
}

// Mirrors the filesystem-first routing used by the deployment for local previews.
export function fallbackDocument(pathname) {
  return pathname === '/admin' || pathname.startsWith('/admin/') ? 'admin/index.html' : 'index.html';
}
