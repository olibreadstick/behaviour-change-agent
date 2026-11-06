import type { AppState, CoachContext, CoachResponse, CommunityPost, GuideEvent, GuideResponse, UsageEvent } from './types';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
// Disable legacy n8n guide-suggestions calls while local Gemini coaching is selected.
export const GEMINI_COACH_URL = (process.env.EXPO_PUBLIC_GEMINI_COACH_URL || '').replace(/\/$/, '');
export const COACH_URL = GEMINI_COACH_URL ? '' : (process.env.EXPO_PUBLIC_N8N_COACH_URL || '');
export const configured = Boolean(API_URL);
export async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, headers: { 'Content-Type': 'application/json', ...init.headers } });
    const raw = await response.text();
    let data: any;
    try { data = raw ? JSON.parse(raw) : null; } catch { throw new Error('The service returned an unexpected response. Please try again.'); }
    if (!response.ok) throw new Error(data?.error || `The service could not complete this request (${response.status}).`);
    return data as T;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw new Error('The service took too long to respond. Please try again.');
    throw e;
  } finally { clearTimeout(timeout); }
}
export function authenticate(username: string, password: string, signup: boolean) {
  if (!configured) throw new Error('The app’s services have not been configured yet.');
  return request<{ participantId: string }>(`${API_URL}/api/auth/participant/${signup ? 'signup' : 'login'}`, {
    method: 'POST', body: JSON.stringify({ username, password }) });
}
export type RemoteRecord = { key: string; payload: string; updatedAt: string };
export const loadRemote = (id: string) => request<RemoteRecord[]>(`${API_URL}/api/cloud/participants/${encodeURIComponent(id)}`);
export async function loadLegacyProfile(id: string): Promise<{ displayName?: string } | null> {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_URL}/api/participant-profiles/${encodeURIComponent(id)}`, { signal: controller.signal });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Your previous profile could not be loaded.');
    return await response.json();
  } finally { clearTimeout(timeout); }
}
export async function saveRemote(id: string, state: AppState) {
  const records = [{ key: `behaviour_change_mobile_${id}`, payload: JSON.stringify({ ...state, pendingEvents: [], dirty: false }) }];
  // Mobile owns its namespace; do not overwrite legacy website records from a potentially stale device.
  for (const record of records) await request(`${API_URL}/api/cloud/participants/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(record) });
}
export const postEvent = (event: UsageEvent) => request(`${API_URL}/api/cloud/usage`, { method: 'POST', body: JSON.stringify(event) });
export async function sendCoach(sessionId: string, chatInput: string, appContext: CoachContext): Promise<CoachResponse> {
  const endpoint = GEMINI_COACH_URL || COACH_URL;
  if (!endpoint) throw new Error('Live coaching has not been configured.');
  const result = await request<CoachResponse>(endpoint, { method: 'POST', body: JSON.stringify({ action: 'sendMessage', sessionId, chatInput, app_context: appContext }) });
  if (!result || typeof result.chat_response !== 'string' || !result.chat_response.trim()) throw new Error('The coach returned an empty response. Please try again.');
  return result;
}
export const sendGuide = (sessionId: string, event: GuideEvent, context: CoachContext) => request<GuideResponse>(COACH_URL, {
  method: 'POST', body: JSON.stringify({ action: 'guide', sessionId, guide_event: event, app_context: context }) });
export async function loadCommunity(): Promise<CommunityPost[]> {
  const records = await request<Array<{ id: string; payload: string }>>(`${API_URL}/api/cloud/community`);
  return records.flatMap(r => { try { const p = JSON.parse(r.payload); const concept = p.concept || p.topics?.[0] || p.category || 'Community tip'; return typeof p.text === 'string' ? [{ ...p, id: r.id, concept }] : []; } catch { return []; } });
}
export const sharePost = (post: CommunityPost) => request(`${API_URL}/api/cloud/community/${encodeURIComponent(post.id)}`, { method: 'PUT', body: JSON.stringify({ payload: JSON.stringify({ ...post, topics: [post.concept], helpfulBy: [] }) }) });
