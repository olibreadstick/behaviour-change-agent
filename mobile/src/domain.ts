import type { Activity, AppState, BuddyProfile, CoachContext, Conversation, Goal, GuideView, HomeworkKind, Plan, Tab } from './types';

export const defaultProfile = (): BuddyProfile => ({ displayName: '', pronouns: '', penguinName: 'Pip', onboarded: false });
export const energyEarned = (state: AppState) => state.homeworkAwards.reduce((sum, award) => sum + award.energy, 0);
const energyFor: Record<HomeworkKind, number> = { guide_learning: 20, guide_practice: 20, activity: 15, reflection: 5 };
export function awardHomework(state: AppState, kind: HomeworkKind, sourceId: string, label: string): AppState {
  const id = `${kind}:${sourceId}`;
  if (state.homeworkAwards.some(a => a.id === id)) return state;
  const createdAt = new Date().toISOString();
  return { ...state, homeworkAwards: [...state.homeworkAwards, { id, kind, label, energy: energyFor[kind], createdAt }],
    buddyFeedback: { message: `${state.profile.penguinName} gained ${energyFor[kind]} energy! ${kind === 'reflection' ? 'Thank you for noticing what you need.' : 'Your effort counts.'}`, createdAt } };
}
export function completeActivity(state: AppState, activityId: string): AppState {
  const activity = state.activities.find(a => a.id === activityId);
  if (!activity) throw new Error('This activity is unavailable.');
  const completed = activity.status === 'planned';
  const next = { ...state, activities: state.activities.map(a => a.id === activityId ? { ...a, status: completed ? 'completed' as const : 'planned' as const } : a) };
  return completed ? awardHomework(next, 'activity', activityId, activity.title) : next;
}
export function completeGoal(state: AppState, goalId: string): AppState {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) throw new Error('This goal is unavailable.');
  const completed = !goal.completed;
  return { ...state, goals: state.goals.map(g => g.id === goalId ? { ...g, completed, completedAt: completed ? new Date().toISOString() : undefined } : g),
    buddyFeedback: { message: completed ? `Good job${state.profile.displayName ? ', ' + state.profile.displayName : ''}! You completed your goal. Take a moment to notice what helped.` : 'You can revisit a goal and adjust it at your own pace.', createdAt: new Date().toISOString() } };
}

export const monday = (date = new Date()) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return localDate(d);
};
export const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const newConversation = (id: string): Conversation => ({ id, sessionId: `mobile-${id}`, title: 'New conversation', messages: [], quickReplies: [] });
export function emptyState(id: string): AppState {
  return { version: 1, revision: 0, profile: defaultProfile(), homeworkAwards: [], goals: [], plans: [], activities: [], reflections: [], completedLessons: [],
    conversations: [newConversation(id)], activeConversationId: id, pendingEvents: [], dirty: false, updatedAt: new Date().toISOString() };
}
export function confirmedGoal(state: AppState): Goal | null { return state.goals.find(g => g.confirmed && !g.completed) || null; }
export function coachContext(state: AppState, participantId: string, screen: Tab): CoachContext {
  const conversation = state.conversations.find(c => c.id === state.activeConversationId);
  const selected = <T extends { id: string }>(items: T[], id: string | undefined, limit: number) => id && items.some(x => x.id === id) ? [...items.filter(x => x.id === id), ...items.filter(x => x.id !== id)].slice(0, limit) : items.slice(0, limit);
  return { participant_id: participantId, source_screen: screen, participant_preferences: state.profile,
    penguin: { name: state.profile.penguinName, energy_earned: energyEarned(state), homework_completed: state.homeworkAwards.length },
    requested_help: state.coachRequest || null, confirmed_goal: confirmedGoal(state),
    goals: selected(state.goals, state.coachRequest?.goalId, 10), action_plans: selected(state.plans, state.coachRequest?.planId, 10), activities: selected(state.activities.slice().reverse(), state.coachRequest?.activityId, 30),
    monitoring_plan: state.monitoring || null, recent_reflections: state.reflections.slice(-5),
    completed_lessons: state.completedLessons, guide_progress: state.guide || null,
    conversation_history: (conversation?.messages || []).filter(m => !m.failed).slice(-12).map(({ role, text }) => ({ role, text })) };
}
export function saveGuideDraft(state: AppState, guide: GuideView, id: string): AppState {
  if (guide.mode !== 'use' || !guide.completed) throw new Error('Complete the guide before saving.');
  const d = guide.draft;
  if (guide.guide_id === 'goal_setting') {
    if (!d.goal?.trim()) throw new Error('Enter your goal before saving.');
    const goal: Goal = { id, goal: d.goal.trim(), goalType: d.goal_type, meaning: d.meaning, confidence: d.confidence,
      feasibility: d.feasibility, confirmed: true, completed: false, weekStart: monday(), createdAt: new Date().toISOString() };
    return awardHomework({ ...state, goals: [goal, ...state.goals], guide: undefined }, 'guide_practice', guide.attemptId || id, 'Goal-setting exercise');
  }
  if (guide.guide_id === 'action_planning_problem_solving') {
    const goal = confirmedGoal(state);
    if (!goal) throw new Error('Confirm your goal before saving a plan.');
    for (const field of ['what', 'when', 'where', 'how', 'barrier', 'alternative', 'cue']) if (!d[field]?.trim()) throw new Error('Finish each part of your plan.');
    const plan: Plan = { id, goalId: goal.id, what: d.what, when: d.when, where: d.where, how: d.how,
      barrier: d.barrier, alternative: d.alternative, cue: d.cue, createdAt: new Date().toISOString() };
    return awardHomework({ ...state, plans: [plan, ...state.plans], guide: undefined }, 'guide_practice', guide.attemptId || id, 'Action-planning exercise');
  }
  for (const field of ['what', 'how', 'when', 'frequency', 'stage']) if (!d[field]?.trim()) throw new Error('Finish each part of your monitoring plan.');
  return awardHomework({ ...state, monitoring: { what: d.what, how: d.how, when: d.when, frequency: d.frequency, stage: d.stage }, guide: undefined }, 'guide_practice', guide.attemptId || id, 'Self-monitoring exercise');
}
export function validActivity(title: string, date: string, time: string, duration: string): boolean {
  if (!title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return false;
  const [year, month, day] = date.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day && Number(duration) > 0 && Number(duration) <= 1440;
}
export function migrateLegacy(state: AppState, records: Array<{ key: string; payload: string }>, participantId: string): AppState {
  const read = (key: string): unknown => { try { return JSON.parse(records.find(r => r.key === key)?.payload || 'null'); } catch { return null; } };
  const rawGoals = read(`behaviour_change_weekly_goal_${participantId}`);
  const goalList = Array.isArray(rawGoals) ? rawGoals : rawGoals ? [rawGoals] : [];
  const goals: Goal[] = goalList.filter((g: any) => typeof g?.id === 'string' && typeof g?.goal === 'string').map((g: any) => ({ ...g, confirmed: true }));
  const rawActivities = read(`behaviour_change_activities_${participantId}`);
  const activities: Activity[] = Array.isArray(rawActivities) ? rawActivities.filter((a: any) => typeof a?.id === 'string' && typeof a?.title === 'string') : [];
  const rawChat = read(`behaviour_change_chat_${participantId}`) as any;
  const oldSession = records.find(r => r.key === `behaviour_change_session_${participantId}`)?.payload;
  const rawConversations = Array.isArray(rawChat?.conversations) ? rawChat.conversations
    : Array.isArray(rawChat?.messages) ? [{ ...rawChat, id: `legacy-${participantId}`, sessionId: oldSession || `legacy-${participantId}`, title: 'Previous conversation' }] : [];
  const conversations: Conversation[] = rawConversations.filter((c: any) => typeof c?.id === 'string' && typeof c?.sessionId === 'string' && Array.isArray(c.messages)).map((c: any) => ({
    id: c.id, sessionId: c.sessionId, title: typeof c.title === 'string' ? c.title : 'Previous conversation',
    quickReplies: Array.isArray(c.quickReplies) ? c.quickReplies.filter((q: any) => typeof q === 'string') : [],
    messages: c.messages.filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.text === 'string').map((m: any, i: number) => ({
      id: typeof m.id === 'string' ? m.id : `${c.id}-message-${i}`, role: m.role, text: m.text, createdAt: typeof m.createdAt === 'string' ? m.createdAt : c.createdAt || state.updatedAt,
    })),
  }));
  const active = conversations.find(c => c.id === rawChat?.activeConversationId) || conversations[0];
  const unusedConversation = state.conversations.length === 1 && !state.conversations[0].messages.length && !conversations.some(c => c.id === state.conversations[0].id);
  return { ...state, goals: [...state.goals, ...goals.filter(g => !state.goals.some(x => x.id === g.id))],
    activities: [...state.activities, ...activities.filter(a => !state.activities.some(x => x.id === a.id))],
    conversations: [...(active && unusedConversation ? [] : state.conversations), ...conversations.filter(c => !state.conversations.some(x => x.id === c.id))],
    activeConversationId: active && unusedConversation ? active.id : state.activeConversationId };
}
export function decodeState(raw: unknown): AppState | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as AppState;
  if (s.version !== 1 || !Array.isArray(s.goals) || !Array.isArray(s.plans) || !Array.isArray(s.activities) || !Array.isArray(s.reflections)
    || !Array.isArray(s.conversations) || !s.conversations.length || !Array.isArray(s.completedLessons) || !Array.isArray(s.pendingEvents)
    || typeof s.activeConversationId !== 'string' || !Number.isInteger(s.revision)) return null;
  if (!s.goals.every(g => typeof g?.id === 'string' && typeof g?.goal === 'string')
    || !s.conversations.every(c => typeof c?.id === 'string' && typeof c?.sessionId === 'string' && Array.isArray(c?.messages) && Array.isArray(c?.quickReplies))) return null;
  if (s.homeworkAwards && (!Array.isArray(s.homeworkAwards) || !s.homeworkAwards.every(a => typeof a?.id === 'string' && typeof a.label === 'string' && Object.hasOwn(energyFor, a.kind) && a.energy === energyFor[a.kind]))) return null;
  const profile = s.profile;
  return { ...s, profile: profile && typeof profile.penguinName === 'string' && profile.penguinName.trim() ? {
    displayName: typeof profile.displayName === 'string' ? profile.displayName.slice(0, 60) : '',
    pronouns: typeof profile.pronouns === 'string' ? profile.pronouns.slice(0, 60) : '', penguinName: profile.penguinName.slice(0, 30), onboarded: profile.onboarded === true,
  } : defaultProfile(), homeworkAwards: s.homeworkAwards || [] };
}
export function mergeRestoredState(local: AppState, remote: AppState): AppState {
  const merge = <T extends { id: string }>(a: T[], b: T[]) => [...a, ...b.filter(x => !a.some(y => y.id === x.id))];
  return { ...remote, ...local, goals: merge(local.goals, remote.goals), plans: merge(local.plans, remote.plans),
    activities: merge(local.activities, remote.activities), reflections: merge(local.reflections, remote.reflections),
    conversations: merge(local.conversations, remote.conversations), completedLessons: [...new Set([...local.completedLessons, ...remote.completedLessons])],
    profile: local.profile.onboarded ? local.profile : remote.profile, homeworkAwards: merge(local.homeworkAwards, remote.homeworkAwards),
    buddyFeedback: local.buddyFeedback || remote.buddyFeedback, monitoring: local.monitoring || remote.monitoring, dirty: true };
}
