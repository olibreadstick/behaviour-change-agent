import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { GUIDE_DEFINITIONS, guideResponse } from '../src/guide-engine.cjs';
import { awardHomework, coachContext, completeActivity, completeGoal, decodeState, emptyState, energyEarned, mergeRestoredState, migrateLegacy, saveGuideDraft, validActivity } from '../src/domain';
import type { GuideEvent, GuideView } from '../src/types';
import { legacyProfile } from '../src/website';

test('website chat history retains conversation IDs, n8n sessions, and active selection', () => {
  const chat = { conversations: [{ id: 'old-1', sessionId: 'n8n-1', title: 'A difficult week', messages: [{ role: 'user', text: 'I need a smaller step' }, { role: 'assistant', text: 'Let’s make a plan.' }], quickReplies: ['Try a short walk'] },
    { id: 'old-2', sessionId: 'n8n-2', title: 'My goal', messages: [], quickReplies: [] }], activeConversationId: 'old-2' };
  const records = [{ key: 'behaviour_change_chat_p1', payload: JSON.stringify(chat) }];
  const migrated = migrateLegacy(emptyState('new'), records, 'p1');
  assert.equal(migrated.activeConversationId, 'old-2'); assert.equal(migrated.conversations[0].sessionId, 'n8n-1');
  assert.equal(migrated.conversations[0].messages[0].text, 'I need a smaller step'); assert.ok(migrated.conversations[0].messages[0].id);
  assert.equal(migrateLegacy(migrated, records, 'p1').conversations.length, 2);
});
test('single-conversation website history and previous display names migrate without overwriting preferences', () => {
  const records = [{ key: 'behaviour_change_chat_p1', payload: JSON.stringify({ messages: [{ role: 'assistant', text: 'Welcome back' }] }) },
    { key: 'behaviour_change_session_p1', payload: 'existing-n8n-session' }];
  const migrated = legacyProfile(migrateLegacy(emptyState('new'), records, 'p1'), { displayName: 'Alex' });
  assert.equal(migrated.conversations[0].sessionId, 'existing-n8n-session'); assert.equal(migrated.profile.displayName, 'Alex');
  assert.equal(legacyProfile(migrated, { displayName: 'Old name' }).profile.displayName, 'Alex');
  assert.equal(migrated.profile.onboarded, false);
});
test('migrating a single empty legacy chat twice keeps a valid conversation', () => {
  const records = [{ key: 'behaviour_change_chat_p1', payload: JSON.stringify({ conversations: [{ id: 'old', sessionId: 'n8n', messages: [], quickReplies: [] }], activeConversationId: 'old' }) }];
  const once = migrateLegacy(emptyState('new'), records, 'p1');
  const twice = migrateLegacy(once, records, 'p1');
  assert.equal(twice.conversations.length, 1); assert.equal(twice.activeConversationId, 'old'); assert.ok(decodeState(twice));
});

test('wrong quiz answers keep the current step and provide a hint', () => {
  const r = guideResponse({ guide_id: 'goal_setting', mode: 'learn', kind: 'answer', step: 1, answer: 'Learning goal' });
  assert.equal(r.guide?.step, 1); assert.equal(r.guide?.completed, false); assert.ok(r.guide?.feedback);
});
test('all three lesson journeys reach completion using the restored examples', () => {
  for (const g of GUIDE_DEFINITIONS) {
    let r = guideResponse({ guide_id: g.id, mode: 'learn', kind: 'open', step: 0 });
    for (const step of g.lessons) {
      r = guideResponse({ guide_id: g.id, mode: 'learn', kind: 'answer', step: r.guide!.step, answer: step.correct || step.options![0] });
    }
    assert.equal(r.guide?.completed, true); assert.equal(r.guide?.progress, g.lessons.length);
  }
});
test('action planning requires a confirmed goal rather than an unfinished draft', () => {
  const r = guideResponse({ guide_id: 'action_planning_problem_solving', mode: 'use', kind: 'open', step: 0 }, { confirmed_goal: null });
  assert.equal(r.guide_redirect, 'goal_setting');
});
test('a saved goal flows into the plan and coach context', () => {
  let s = emptyState('conversation');
  const guide: GuideView = { guide_id: 'goal_setting', mode: 'use', step: 4, completed: true, title: '', body: '', question: '', options: [], feedback: '', progress: 5, total_steps: 5,
    draft: { goal: 'Learn which activities fit my schedule', goal_type: 'Learning goal', meaning: 'Feel comfortable starting', confidence: 'Some confidence', feasibility: 'Begin with a small step' } };
  s = saveGuideDraft(s, guide, 'goal-1');
  const plan = { ...guide, guide_id: 'action_planning_problem_solving' as const, draft: { what: 'Review the activity options', when: 'After class', where: 'At home', how: 'For ten minutes', barrier: 'Class runs late', alternative: 'Review tomorrow', cue: 'My calendar' } };
  s = saveGuideDraft(s, plan, 'plan-1');
  const c = coachContext(s, 'participant-1', 'Calendar');
  assert.equal(c.confirmed_goal?.id, 'goal-1'); assert.equal(c.action_plans[0].goalId, 'goal-1'); assert.equal(c.confirmed_goal?.goalType, 'Learning goal');
  assert.throws(() => saveGuideDraft(s, { ...guide, completed: false }, 'no-save'));
});
test('legacy goal and activity imports preserve identifiers without duplicates', () => {
  const records = [{ key: 'behaviour_change_weekly_goal_p1', payload: JSON.stringify({ id: 'old-goal', goal: 'Take a short walk', completed: false }) },
    { key: 'behaviour_change_activities_p1', payload: JSON.stringify([{ id: 'old-activity', title: 'Walk', date: '2026-10-01', time: '18:00', durationMinutes: 10, status: 'planned' }]) }];
  const once = migrateLegacy(emptyState('c'), records, 'p1'); const twice = migrateLegacy(once, records, 'p1');
  assert.equal(twice.goals.length, 1); assert.equal(twice.activities.length, 1); assert.equal(twice.goals[0].confirmed, true);
});
test('a reconnect retains cloud records while keeping edits from this device', () => {
  const remote = emptyState('remote'); remote.reflections.push({ id: 'remote-note', text: 'A quiet time helped', createdAt: '2026-09-30' });
  const local = emptyState('local'); local.reflections.push({ id: 'local-note', text: 'I tried another cue', createdAt: '2026-10-01' });
  const merged = mergeRestoredState(local, remote);
  assert.equal(merged.reflections.length, 2); assert.equal(merged.activeConversationId, 'local'); assert.equal(merged.dirty, true);
});
test('calendar rejects invalid dates and times instead of rolling dates forward', () => {
  assert.equal(validActivity('Walk', '2026-02-30', '18:00', '10'), false);
  assert.equal(validActivity('Walk', '2026-10-01', '25:00', '10'), false);
  assert.equal(validActivity('Walk', '2026-10-01', '18:00', '0'), false);
  assert.equal(validActivity('Walk', '2026-10-01', '18:00', '10'), true);
});
test('invalid cached data is rejected', () => { assert.equal(decodeState({ version: 1 }), null); assert.ok(decodeState(emptyState('c'))); });

const workflow = JSON.parse(readFileSync(new URL('../../workflows/behaviour-change-mobile.json', import.meta.url), 'utf8'));
const node = (name: string) => workflow.nodes.find((n: any) => n.name === name);
function execute(name: string, data: any, contexts: Record<string, any> = {}) {
  const code = node(name).parameters.jsCode;
  return new vm.Script(`(function(){ ${code}\n})()`).runInNewContext({ $json: data, $: (n: string) => ({ first: () => ({ json: contexts[n] }) }) });
}
test('the n8n guide node returns the same step as the phone app', () => {
  const e: GuideEvent = { guide_id: 'goal_setting', mode: 'learn', kind: 'answer', step: 1, answer: 'Performance goal' };
  const r = execute('Deliver Guide Step', {}, { 'Prepare Website Context': { sessionId: 's', guide_event: e, app_context: {}, session_state: {} } });
  assert.equal(r[0].json.guide.step, guideResponse(e).guide?.step);
  assert.equal(r[0].json.guide.feedback, guideResponse(e).guide?.feedback);
});
test('request normalization preserves the confirmed goal and rejects empty requests', () => {
  const s = emptyState('c');
  const r = execute('Normalize Coach Request', { body: { sessionId: ' s ', chatInput: ' help ', app_context: coachContext(s, 'p', 'Calendar') } });
  assert.equal(r[0].json.chatInput, 'help'); assert.equal(r[0].json.app_context.source_screen, 'Calendar');
  assert.equal(execute('Normalize Coach Request', { body: { sessionId: 's' } })[0].json.invalid, true);
});
test('learning and practice homework both earn energy without crediting an unfinished draft', () => {
  let s = emptyState('c');
  s = awardHomework(s, 'guide_learning', 'goal_setting', 'Goal-setting lesson');
  assert.equal(energyEarned(s), 20);
  assert.equal(energyEarned(awardHomework(s, 'guide_learning', 'goal_setting', 'Replay')), 20);
  const guide: GuideView = { guide_id: 'goal_setting', mode: 'use', step: 4, completed: true, title: '', body: '', question: '', options: [], feedback: '', progress: 5, total_steps: 5, attemptId: 'attempt-1', draft: { goal: 'Learn an activity I enjoy' } };
  assert.throws(() => saveGuideDraft(s, { ...guide, completed: false }, 'g'));
  s = saveGuideDraft(s, guide, 'g'); assert.equal(energyEarned(s), 40);
  assert.equal(energyEarned(saveGuideDraft(s, guide, 'same-attempt')), 40);
});
test('real-world activity completion earns energy once across reopening and syncing', () => {
  const original = emptyState('c'); original.activities.push({ id: 'walk', title: 'Walk', date: '2026-10-02', time: '18:00', durationMinutes: 10, status: 'planned' });
  let s = completeActivity(original, 'walk'); assert.equal(energyEarned(s), 15);
  s = completeActivity(s, 'walk'); assert.equal(s.activities[0].status, 'planned'); assert.equal(energyEarned(s), 15);
  s = completeActivity(s, 'walk'); assert.equal(energyEarned(s), 15);
  assert.equal(energyEarned(mergeRestoredState(s, completeActivity(original, 'walk'))), 15);
});
test('old snapshots acquire personalization and energy defaults without losing progress', () => {
  const old: any = emptyState('c'); delete old.profile; delete old.homeworkAwards;
  old.reflections.push({ id: 'r', text: 'Keep this', createdAt: '2026-10-02' });
  const migrated = decodeState(old)!; assert.equal(migrated.profile.penguinName, 'Pip'); assert.equal(migrated.profile.onboarded, false);
  assert.equal(energyEarned(migrated), 0); assert.equal(migrated.reflections[0].text, 'Keep this');
});
test('goal celebration preserves the goal and coach requests carry the selected item and profile', () => {
  let s = emptyState('c'); s.profile = { displayName: 'Alex', pronouns: 'they/them', penguinName: 'Pebble', onboarded: true };
  s.goals.push({ id: 'g', goal: 'Learn a new activity', confirmed: true, completed: false, weekStart: '2026-09-28', createdAt: '2026-10-02' });
  s = completeGoal(s, 'g'); assert.match(s.buddyFeedback!.message, /Good job, Alex/); assert.equal(s.goals[0].goal, 'Learn a new activity');
  s.coachRequest = { id: 'request', source: 'Calendar', kind: 'goal_completed', goalId: 'g', subject: s.goals[0].goal, prompt: 'Reflect on this goal' };
  const c = coachContext(s, 'p', 'Calendar'); assert.equal(c.confirmed_goal, null); assert.equal(c.requested_help?.goalId, 'g'); assert.equal(c.participant_preferences.pronouns, 'they/them');
  const normalized = execute('Normalize Coach Request', { body: { sessionId: 's', chatInput: 'Help', app_context: c } })[0].json.app_context;
  assert.equal(normalized.requested_help.kind, 'goal_completed'); assert.equal(normalized.participant_preferences.penguinName, 'Pebble');
});
test('restoring remote progress retains an existing profile and unique homework awards', () => {
  const local = emptyState('new'); let remote = emptyState('old'); remote.profile = { displayName: 'Sam', pronouns: '', penguinName: 'Snow', onboarded: true };
  remote = awardHomework(remote, 'reflection', 'r', 'Reflection');
  const restored = mergeRestoredState(local, remote); assert.equal(restored.profile.penguinName, 'Snow'); assert.equal(energyEarned(restored), 5);
});
test('n8n imports remain inactive, references exist, and first requests reach their actual content', () => {
  assert.equal(workflow.active, false);
  for (const n of workflow.nodes) assert.equal(n.credentials, undefined);
  const names = new Set(workflow.nodes.map((n: any) => n.name));
  for (const connection of Object.values(workflow.connections) as any[]) for (const branches of Object.values(connection) as any[]) for (const branch of branches) for (const edge of branch) assert.ok(names.has(edge.node), edge.node);
  assert.equal(workflow.connections['Create Session State'].main[0][0].node, 'Prepare Website Context');
  assert.equal(workflow.connections['Guide Requested?'].main[1][0].node, 'Opening Greeting?');
});
