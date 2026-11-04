import type { AppState } from './types';

export type WebsiteSession = { participantId: string; preview: boolean };
const SESSION_KEY = 'daily_coach_web_session';
const LEGACY_SESSION_KEY = 'support_agent_auth_session';
const read = (storage: Storage, key: string): any => { try { return JSON.parse(storage.getItem(key) || 'null'); } catch { return null; } };

export function readWebsiteSession(): WebsiteSession | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  try {
    const session = read(window.sessionStorage, SESSION_KEY);
    if (typeof session?.participantId === 'string' && session.participantId && session.preview === false) return session;
    const legacy = read(window.sessionStorage, LEGACY_SESSION_KEY);
    return legacy?.role === 'participant' && typeof legacy.userId === 'string' && legacy.userId ? { participantId: legacy.userId, preview: false } : null;
  } catch { return null; }
}
export function saveWebsiteSession(session: WebsiteSession | null) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    if (session && !session.preview) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.sessionStorage.removeItem(SESSION_KEY);
    // Stop the retired website session from restoring a participant after logout.
    if (!session && read(window.sessionStorage, LEGACY_SESSION_KEY)?.role === 'participant') window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } catch { /* Login remains usable when browser storage is unavailable. */ }
}
export function browserLegacyRecords(id: string): Array<{ key: string; payload: string }> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return [];
  const keys = [`behaviour_change_weekly_goal_${id}`, `behaviour_change_activities_${id}`, `behaviour_change_chat_${id}`, `behaviour_change_session_${id}`];
  try { return keys.flatMap(key => { const payload = window.localStorage.getItem(key); return payload === null ? [] : [{ key, payload }]; }); } catch { return []; }
}
export function legacyProfile(state: AppState, profile: { displayName?: string } | null): AppState {
  return !state.profile.onboarded && !state.profile.displayName && typeof profile?.displayName === 'string' ? { ...state, profile: { ...state.profile, displayName: profile.displayName.slice(0, 60) } } : state;
}
