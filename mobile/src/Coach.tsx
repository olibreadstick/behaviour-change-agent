import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useAppStore, uuid } from './store';
import { coachContext, confirmedGoal, monday, newConversation, saveGuideDraft } from './domain';
import { sendCoach, request, COACH_URL } from './api';
import { GUIDE_DEFINITIONS, guideResponse } from './guide-engine.cjs';
import { GoalSuggestion, PlanSuggestion, GuideId, GuideView } from './types';
import { color, styles as s } from './theme';
import { Button, Card, ErrorText, Field } from './ui';
import { ReflectionPanel } from './screens';

const penguinImage = require('../assets/coach-penguin.png');

// Day suggestions must match the frequency in the participant's confirmed goal.
// Only suggest a schedule when the frequency is explicit; otherwise ask for their own days.
function goalDaysPerWeek(goalText: string): number | null {
  const text = goalText.toLowerCase();
  const wordNumbers: Record<string, number> = { once: 1, twice: 2, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
  const number = '(once|twice|one|two|three|four|five|six|seven|[1-7])';
  const patterns = [
    new RegExp(String.raw`\b${number}\s*(?:times?|days?|sessions?|walks?)\s*(?:a|per|each|every)?\s*week\b`, 'i'),
    new RegExp(String.raw`\b${number}\s*(?:times?|days?|sessions?|walks?)\s*(?:a|per|each|every)\s*week\b`, 'i'),
    new RegExp(String.raw`\b${number}\s*(?:weekly|per week)\b`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return wordNumbers[match[1]] || Number(match[1]) || null;
  }
  return null;
}

const DAY_PATTERNS: Record<number, string[]> = {
  1: ['Monday', 'Saturday'],
  2: ['Tuesday, Saturday', 'Monday, Thursday'],
  3: ['Monday, Wednesday, Friday', 'Tuesday, Thursday, Saturday'],
  4: ['Monday, Tuesday, Thursday, Saturday', 'Monday, Wednesday, Friday, Sunday'],
  5: ['Monday, Tuesday, Wednesday, Thursday, Friday', 'Monday, Tuesday, Thursday, Saturday, Sunday'],
  6: ['Monday, Tuesday, Wednesday, Thursday, Friday, Saturday', 'Monday, Tuesday, Wednesday, Friday, Saturday, Sunday'],
  7: ['Every day'],
};

// A familiar chat typing indicator. Visual feedback only: it never creates a message.
function PenguinTypingBubble({ name }: { name: string }) {
  const dots = React.useRef([new Animated.Value(0.3), new Animated.Value(0.3), new Animated.Value(0.3)]).current;
  React.useEffect(() => {
    const animation = Animated.loop(Animated.stagger(160, dots.map(dot => Animated.sequence([
      Animated.timing(dot, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(dot, { toValue: 0.3, duration: 280, useNativeDriver: true }),
    ]))));
    animation.start();
    return () => animation.stop();
  }, [dots]);
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={`${name} is typing`} style={[s.message, { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 90 }]}>
      {dots.map((dot, index) => <Animated.View key={index} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color.muted, opacity: dot }} />)}
    </View>
  );
}


export function Coach({ participantId, preview, onGuide }: { participantId: string; preview: boolean; onGuide: (id: GuideId, mode: 'learn' | 'use') => void }) {
  const { state, update, track } = useAppStore();
  const { width } = useWindowDimensions();
  const showDesktopHistory = Platform.OS === 'web' && width >= 820;

  const [input, setInput] = useState('');
  const [messageReactions, setMessageReactions] = useState<Record<string, string>>({});
  const [guideAiChoices, setGuideAiChoices] = useState<string[]>([]);
  const [guideChoicesBusy, setGuideChoicesBusy] = useState(false);
  const guideOptionsRequest = React.useRef(0);
  const [enterOwnDays, setEnterOwnDays] = useState(false);
  const [chatGuide, setChatGuide] = useState<GuideView | null>(null);
  const [chatGuideGoalId, setChatGuideGoalId] = useState('');
  const [chatGuideTime, setChatGuideTime] = useState('');
  const [chatGuideChoosingDays, setChatGuideChoosingDays] = useState(false);
  const [chatGuideChoosingDuration, setChatGuideChoosingDuration] = useState(false);
  const [chatGuideHow, setChatGuideHow] = useState('');
  const [chatGuideDuration, setChatGuideDuration] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resource, setResource] = useState<GuideId | null>(null);
  const [showReflections, setShowReflections] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [proposal, setProposal] = useState<GoalSuggestion | null>(null);
  const [draftGoal, setDraftGoal] = useState('');
  const [targetGoalId, setTargetGoalId] = useState('');
  const [planProposal, setPlanProposal] = useState<PlanSuggestion | null>(null);
  const [planDraft, setPlanDraft] = useState({ what: '', when: '', where: '', how: '', barrier: '', alternative: '', cue: '' });
  const [planGoalId, setPlanGoalId] = useState('');
  const [planId, setPlanId] = useState('');
  const [actionPlanInvite, setActionPlanInvite] = useState<{ goalId: string; goal: string } | null>(null);

  const active = state.conversations.find(c => c.id === state.activeConversationId)!;
  const goal = confirmedGoal(state);

  useEffect(() => {
    if (state.coachRequest) setInput(state.coachRequest.prompt);
  }, [state.coachRequest?.id]);

  // Run the existing Action Planning & Problem Solving GUIDE inside the chat.
  // This is intentionally not an LLM-only approximation of the guide.
  function appendGuideMessage(role: 'user' | 'assistant', text: string) {
    update(st => ({ ...st, conversations: st.conversations.map(c => c.id === st.activeConversationId ? {
      ...c, messages: [...c.messages, { id: uuid(), role, text, createdAt: new Date().toISOString() }],
      quickReplies: [],
    } : c) }));
  }

  // Use the current n8n webhook to generate contextual choices for each fixed guide step.
  // The guide remains the authority for progression and saving; AI choices are only suggestions.
  async function fetchGuideOptions(goalId: string, stage: string, draft: Record<string, string> = {}) {
    const selected = state.goals.find(g => g.id === goalId && g.confirmed);
    if (!selected || !COACH_URL) return;
    const requestNumber = ++guideOptionsRequest.current;
    setGuideAiChoices([]);
    setGuideChoicesBusy(true);
    try {
      const response = await request<{ quick_reply_options?: string[] }>(COACH_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'guideSuggestions', sessionId: `guide_suggestions_${participantId}`,
          chatInput: 'Generate contextual guide choices',
          app_context: coachContext(state, participantId, 'Compassion Hub'),
          guide_suggestion: { goal: selected.goal, stage, draft },
        }),
      });
      const options = Array.isArray(response.quick_reply_options) ? response.quick_reply_options : [];
      if (requestNumber === guideOptionsRequest.current) setGuideAiChoices(options.filter(x => typeof x === 'string' && x.trim().length > 0).slice(0, 3));
    } catch {
      // Never block the participant from typing their own answer if the AI is unavailable.
      if (requestNumber === guideOptionsRequest.current) setGuideAiChoices([]);
    } finally { if (requestNumber === guideOptionsRequest.current) setGuideChoicesBusy(false); }
  }

  function startChatGuide(targetId?: string) {
    const chosen = state.goals.find(g => g.id === targetId && g.confirmed) || confirmedGoal(state);
    if (!chosen) {
      setError('Save a goal first, then we can make an action plan together.');
      return;
    }
    try {
      // The confirmed goal already answers WHAT. Begin with WHEN, not a repeated
      // question asking the participant to describe the same activity again.
      const result = guideResponse({
        guide_id: 'action_planning_problem_solving', mode: 'use', kind: 'open',
        step: 1, draft: { what: chosen.goal },
      }, { confirmed_goal: chosen });
      if (!result.guide) throw new Error('Unable to open the action-planning guide.');
      setChatGuide({ ...result.guide, attemptId: uuid() });
      setGuideAiChoices([]);
      setChatGuideGoalId(chosen.id);
      setChatGuideTime('');
      setChatGuideChoosingDays(false);
      setChatGuideChoosingDuration(false);
      setChatGuideHow('');
      setChatGuideDuration('');
      setActionPlanInvite(null);
      setResource(null);
      appendGuideMessage('assistant', 'For your goal, what time of day would work best?');
      void fetchGuideOptions(chosen.id, 'time_of_day', { what: chosen.goal });
      track('guide_started_in_chat', { guide: 'action_planning_problem_solving' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to open the guide.');
    }
  }

  function answerChatGuide(answer: string) {
    if (!chatGuide || !answer.trim()) return;
    const value = answer.trim();
    if (chatGuide.completed) return;
    // The guide's WHEN field needs both a preferred time and chosen days.
    // Keep asking within the chat until both are resolved; never skip the rest of the guide.
    if (chatGuide.step === 1 && !chatGuideChoosingDays) {
      setChatGuideTime(value);
      setChatGuideChoosingDays(true);
      appendGuideMessage('user', value);
      appendGuideMessage('assistant', 'Which days would work best?');
      void fetchGuideOptions(chatGuideGoalId, 'days_of_week', { ...chatGuide.draft, time_of_day: value });
      setInput('');
      return;
    }
    if (chatGuide.step === 1 && chatGuideChoosingDays && /^Choose my own days$/i.test(value)) {
      setEnterOwnDays(true);
      setInput('');
      return;
    }
    // The guide's HOW field is split into two short chat questions: method,
    // then session duration. Both are saved together in the existing plan schema.
    if (chatGuide.step === 3 && !chatGuideChoosingDuration) {
      setChatGuideHow(value);
      setChatGuideChoosingDuration(true);
      appendGuideMessage('user', value);
      appendGuideMessage('assistant', 'How long would you like each session to last?');
      void fetchGuideOptions(chatGuideGoalId, 'duration', { ...chatGuide.draft, how: value });
      setInput('');
      return;
    }
    const durationAnswer = chatGuide.step === 3 && chatGuideChoosingDuration;
    if (durationAnswer) setChatGuideDuration(value);
    try {
      const chosen = state.goals.find(g => g.id === chatGuideGoalId && g.confirmed);
      if (!chosen) throw new Error('This goal is no longer available.');
      const fullAnswer = chatGuide.step === 1 && chatGuideChoosingDays ? `${value}, ${chatGuideTime.toLowerCase()}` : durationAnswer ? `${chatGuideHow} (Duration: ${value})` : value;
      const result = guideResponse({ guide_id: chatGuide.guide_id, mode: chatGuide.mode, kind: 'answer',
        step: chatGuide.step, draft: chatGuide.draft, answer: fullAnswer }, { confirmed_goal: chosen });
      if (!result.guide) throw new Error('Unable to continue the guide.');
      appendGuideMessage('user', value);
      setChatGuide({ ...result.guide, attemptId: chatGuide.attemptId });
      setGuideAiChoices([]);
      setChatGuideChoosingDays(false);
      setChatGuideChoosingDuration(false);
      setChatGuideTime('');
      setEnterOwnDays(false);
      setInput('');
      if (result.guide.completed) {
        appendGuideMessage('assistant', 'Your action plan is ready. Check the summary below, then choose whether to save it.');
      } else {
        const prompts: Record<number, string> = {
          2: 'Where would you like to do this?',
          3: 'How would you like to get started?',
          4: 'What might make this plan difficult?',
          5: 'What could you do if that happens?',
          6: 'What could remind you to follow your plan?',
        };
        appendGuideMessage('assistant', prompts[result.guide.step] || result.guide.question);
        const stageNames: Record<number, string> = {2:'location',3:'how',4:'barrier',5:'alternative',6:'reminder'};
        void fetchGuideOptions(chatGuideGoalId, stageNames[result.guide.step] || 'next', result.guide.draft);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to continue the guide.'); }
  }

  function saveChatGuide() {
    if (!chatGuide?.completed || !chatGuideGoalId) return;
    try {
      update(st => {
        const selected = st.goals.find(g => g.id === chatGuideGoalId && g.confirmed);
        if (!selected) throw new Error('The selected goal was not found.');
        // The existing guide saver uses confirmedGoal (first item), so prioritize
        // our explicitly chosen goal only for the save operation.
        const ordered = { ...st, goals: [selected, ...st.goals.filter(g => g.id !== selected.id)] };
        const saved = saveGuideDraft(ordered, chatGuide, uuid());
        return { ...saved, goals: st.goals };
      });
      track('guide_plan_saved', { guide: 'action_planning_problem_solving', source: 'chat' });
      appendGuideMessage('assistant', 'Your action plan is saved under your goal. You can see it in Goals and adjust it with me whenever you need.');
      setChatGuide(null);
      setChatGuideGoalId('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save your plan.'); }
  }

  // Suggestions come from n8n, not a fixed list. The participant can always type an alternative.
  const guideChoices = chatGuide && !chatGuide.completed ? [
    ...guideAiChoices,
    ...(chatGuide.step === 1 && chatGuideChoosingDays ? ['Choose my own days'] : []),
    ...(chatGuide.step === 3 && chatGuideChoosingDuration ? ['Choose my own duration'] : []),
  ] : [];

  async function send(text: string, retryId?: string, planHelp?: { goalId: string; goal: string }) {
    if (!text.trim() || busy || preview) return;
    if (chatGuide) { answerChatGuide(text); return; }
    if (planHelp) { appendGuideMessage('user', text); startChatGuide(planHelp.goalId); return; }
    setBusy(true);
    setError('');
    setEnterOwnDays(false);

    const conversationId = active.id;
    const messageId = retryId || uuid();
    const requestId = state.coachRequest?.id;
    const context = coachContext(state, participantId, state.coachRequest?.source || 'Compassion Hub');
    // The selected goal is sent as structured context, NOT exposed in the chat bubble.
    if (planHelp) {
      context.requested_help = {
        id: uuid(), source: 'Compassion Hub', kind: 'plan_support',
        prompt: 'Help me make an action plan for this confirmed goal, beginning with one simple choice.',
        subject: planHelp.goal, goalId: planHelp.goalId,
      };
      const chosen = state.goals.find(g => g.id === planHelp.goalId && g.confirmed);
      if (chosen) {
        context.goals = [chosen, ...context.goals.filter(g => g.id !== chosen.id)].slice(0, 10);
        context.confirmed_goal = chosen;
      }
    }

    if (!retryId) {
      update(st => ({
        ...st,
        conversations: st.conversations.map(c => c.id === conversationId ? {
          ...c,
          title: c.messages.length ? c.title : text.slice(0, 45),
          quickReplies: [],
          messages: [...c.messages, { id: messageId, role: 'user', text: text.trim(), createdAt: new Date().toISOString() }],
        } : c),
      }));
    }

    try {
      const result = await sendCoach(active.sessionId, text.trim(), context);
      update(st => ({
        ...st,
        coachRequest: st.coachRequest?.id === requestId ? undefined : st.coachRequest,
        conversations: st.conversations.map(c => c.id === conversationId ? {
          ...c,
          quickReplies: result.quick_reply_options || [],
          messages: [
            ...c.messages.map(m => m.id === messageId ? { ...m, failed: false } : m),
            { id: uuid(), role: 'assistant', text: result.chat_response, createdAt: new Date().toISOString() },
          ],
        } : c),
      }));
      setResource(result.workshop_resource && GUIDE_DEFINITIONS.some(g => g.id === result.workshop_resource) ? result.workshop_resource as GuideId : null);
      if (result.goal_suggestion && (result.goal_suggestion.operation === 'create' || result.goal_suggestion.operation === 'update') && typeof result.goal_suggestion.goal === 'string' && result.goal_suggestion.goal.trim()) {
        openProposal(result.goal_suggestion);
      }
      if (result.plan_suggestion && ['create', 'update'].includes(result.plan_suggestion.operation) && typeof result.plan_suggestion.what === 'string' && result.plan_suggestion.what.trim()) {
        openPlanProposal(result.plan_suggestion);
      }
      const reaction = (result as typeof result & { reaction_emoji?: string }).reaction_emoji;
      if (typeof reaction === 'string' && ['💛', '🫶', '💙', '🌱'].includes(reaction)) {
        setMessageReactions(prev => ({ ...prev, [messageId]: reaction }));
      }
      setInput('');
      track('coach_interaction', { conversationId });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to reach the coach.');
      update(st => ({
        ...st,
        conversations: st.conversations.map(c => c.id === conversationId ? {
          ...c,
          messages: c.messages.map(m => m.id === messageId ? { ...m, failed: true } : m),
        } : c),
      }));
    } finally {
      setBusy(false);
    }
  }

  // Proposed changes are only committed after an explicit participant confirmation.
  // This also supports older n8n workflows that return only chat_response.
  function openProposal(next: GoalSuggestion) {
    setProposal(next);
    setDraftGoal(next.goal.slice(0, 500));
    setTargetGoalId(next.goal_id && state.goals.some(g => g.id === next.goal_id && g.confirmed) ? next.goal_id : '');
  }

  // Align a linked action plan with an explicitly confirmed weekly-frequency change.
  // Preserve existing preferences, duration and barrier strategies. For a reduction,
  // keep the first N chosen days rather than inventing different days.
  function syncPlanFrequency(when: string, previousGoal: string, nextGoal: string): string | null {
    const frequency = (goal: string): number | null => {
      const match = goal.match(/\b(\d+|one|two|three|four|five|six|seven)\s*(?:times?|days?|sessions?|walks?)\s*(?:a|per|each)\s*week\b/i);
      const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
      if (!match) return null;
      const value = words[match[1].toLowerCase()] ?? Number(match[1]);
      return Number.isInteger(value) && value >= 1 && value <= 7 ? value : null;
    };
    const before = frequency(previousGoal);
    const after = frequency(nextGoal);
    if (!before || !after || before === after) return null;
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const found = [...when.matchAll(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi)].map(m => weekdays.find(d => d.toLowerCase() === m[1].toLowerCase())!);
    const distinct = [...new Set(found)];
    if (after < before && distinct.length >= after) {
      const kept = distinct.slice(0, after);
      // Keep the original time-of-day and other free-text context after the day list.
      const remainder = when.replace(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi, '').replace(/[,\s]+/g, ' ').replace(/^(?:and\s*)+/i, '').trim();
      return `${kept.join(', ')}${remainder ? `, ${remainder}` : ''}`;
    }
    // If the saved days cannot safely be reduced, or the frequency increases,
    // retain the participant's day preferences and record the frequency explicitly.
    return `${after} ${after === 1 ? 'session' : 'sessions'} per week${when ? `; preferred schedule: ${when}` : ''}`;
  }

  function confirmProposal() {
    const text = draftGoal.trim();
    if (!proposal || !text || text.length > 500) return;
    if (proposal.operation === 'update' && !state.goals.some(g => g.id === targetGoalId && g.confirmed)) {
      setError('Please select the goal you want to update.');
      return;
    }
    const now = new Date().toISOString();
    const id = uuid();
    update(st => {
      if (proposal.operation === 'create') {
        return { ...st, goals: [{ id, goal: text, weekStart: monday(), completed: false, confirmed: true, createdAt: now, revisions: [] }, ...st.goals] };
      }
      const previousGoal = st.goals.find(g => g.id === targetGoalId);
      if (!previousGoal) return st;
      return {
        ...st,
        goals: st.goals.map(g => g.id === targetGoalId ? {
          ...g, goal: text, revisions: [...(g.revisions || []), { previous: g.goal, next: text, changedAt: now, source: 'coach' as const }],
        } : g),
        plans: st.plans.map(plan => {
          if (plan.goalId !== targetGoalId) return plan;
          const revisedWhen = syncPlanFrequency(plan.when, previousGoal.goal, text);
          if (!revisedWhen || revisedWhen === plan.when) return plan;
          const revisedWhat = plan.what === previousGoal.goal ? text : plan.what;
          return {
            ...plan,
            what: revisedWhat,
            when: revisedWhen,
            revisions: [...(plan.revisions || []), {
              previous: JSON.stringify({ what: plan.what, when: plan.when, where: plan.where, how: plan.how, barrier: plan.barrier, alternative: plan.alternative, cue: plan.cue }),
              next: JSON.stringify({ what: revisedWhat, when: revisedWhen, where: plan.where, how: plan.how, barrier: plan.barrier, alternative: plan.alternative, cue: plan.cue }),
              changedAt: new Date(Date.parse(now) + 1).toISOString(), source: 'coach' as const,
            }],
          };
        }),
      };
    });
    track(proposal.operation === 'create' ? 'goal_created_from_chat' : 'goal_updated_from_chat', { source: 'confirmed_coach_proposal' });
    const savedOperation = proposal.operation;
    setProposal(null);
    setError('');
    // Offer a natural next step without initiating another AI request or saving a plan.
    if (savedOperation === 'create') setActionPlanInvite({ goalId: id, goal: text });
    update(st => ({ ...st, conversations: st.conversations.map(c => c.id === active.id ? { ...c, quickReplies: [], messages: [...c.messages, { id: uuid(), role: 'assistant' as const, text: savedOperation === 'create' ? 'Your goal is saved in Goals! Would you like to make a flexible action plan for it? I can suggest some starting ideas based on your goal.' : 'Your goal and its linked action plan are updated in Goals. Both changes are recorded in the timeline.', createdAt: new Date().toISOString() }] } : c) }));
  }

  function openPlanProposal(next: PlanSuggestion) {
    const fields = ['what', 'when', 'where', 'how', 'barrier', 'alternative', 'cue'] as const;
    const safe: typeof planDraft = { what: '', when: '', where: '', how: '', barrier: '', alternative: '', cue: '' };
    for (const field of fields) safe[field] = typeof next[field] === 'string' ? next[field]!.slice(0, 500) : '';
    const existing = next.plan_id ? state.plans.find(p => p.id === next.plan_id) : undefined;
    if (existing) for (const field of fields) if (!safe[field]) safe[field] = existing[field];
    setPlanProposal(next);
    setPlanDraft(safe);
    setPlanId(existing?.id || '');
    setPlanGoalId(existing?.goalId || (next.goal_id && state.goals.some(g => g.id === next.goal_id) ? next.goal_id : state.goals.find(g => g.confirmed && !g.completed)?.id || ''));
  }

  function confirmPlanProposal() {
    if (!planProposal || !planGoalId || !state.goals.some(g => g.id === planGoalId && g.confirmed)) {
      setError('Select a saved goal for this action plan.'); return;
    }
    if (planProposal.operation === 'update' && !state.plans.some(p => p.id === planId && p.goalId === planGoalId)) {
      setError('Select a plan associated with this goal.'); return;
    }
    const now = new Date().toISOString();
    const data = Object.fromEntries(Object.entries(planDraft).map(([key, val]) => [key, val.trim()])) as typeof planDraft;
    if (!data.what) { setError('Please describe what you will do.'); return; }
    update(st => {
      if (planProposal.operation === 'create') {
        return { ...st, plans: [{ id: uuid(), goalId: planGoalId, ...data, createdAt: now }, ...st.plans] };
      }
      return { ...st, plans: st.plans.map(p => p.id === planId && p.goalId === planGoalId ? {
        ...p, ...data, revisions: [...(p.revisions || []), {
          previous: JSON.stringify({ what: p.what, when: p.when, where: p.where, how: p.how, barrier: p.barrier, alternative: p.alternative, cue: p.cue }),
          next: JSON.stringify(data), changedAt: now, source: 'coach' as const,
        }],
      } : p) };
    });
    track(planProposal.operation === 'create' ? 'plan_created_from_chat' : 'plan_updated_from_chat', { source: 'confirmed_coach_proposal' });
    setPlanProposal(null);
    setError('');
    update(st => ({ ...st, conversations: st.conversations.map(c => c.id === active.id ? { ...c, messages: [...c.messages, { id: uuid(), role: 'assistant' as const, text: planProposal.operation === 'create' ? 'Your action plan is saved under its goal. You can change it with me anytime.' : 'Your action plan has been updated, and the change is in your goal timeline.', createdAt: new Date().toISOString() }] } : c) }));
  }

  function newChat() {
    if (busy) return;
    const c = newConversation(uuid());
    update(st => ({ ...st, coachRequest: undefined, conversations: [...st.conversations, c], activeConversationId: c.id }));
    setResource(null);
    setError('');
    setInput('');
    setEnterOwnDays(false);
    setHistoryOpen(false);
    setProposal(null);
    setPlanProposal(null);
    setActionPlanInvite(null);
    setChatGuide(null);
    setChatGuideGoalId('');
  }

  function openChat(id: string) {
    if (busy) return;
    update(st => ({ ...st, coachRequest: undefined, activeConversationId: id }));
    setResource(null);
    setError('');
    setInput('');
    setEnterOwnDays(false);
    setHistoryOpen(false);
    setProposal(null);
    setPlanProposal(null);
    setActionPlanInvite(null);
    setChatGuide(null);
    setChatGuideGoalId('');
  }

  const conversations = [...state.conversations].reverse();

  const historyList = (
    <View style={{ flex: 1 }}>
      <View style={{ marginBottom: 16 }}>
        <Text style={s.eyebrow}>Your AI coach</Text>
        <Text style={s.heading}>Conversations</Text>
        <Text style={s.small}>Return to a previous chat or start a new one.</Text>
      </View>

      <Button disabled={busy} onPress={newChat}>+ New conversation</Button>

      <Text style={[s.eyebrow, { marginTop: 18, marginBottom: 8 }]}>Past conversations</Text>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {conversations.map(c => {
          const selected = c.id === state.activeConversationId;
          const lastMessage = c.messages[c.messages.length - 1]?.text || '';
          return (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: busy }}
              disabled={busy}
              onPress={() => openChat(c.id)}
              style={{
                padding: 14,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: selected ? color.blue : color.line,
                backgroundColor: selected ? '#EAF7FB' : color.white,
                opacity: busy ? 0.65 : 1,
              }}
            >
              <Text numberOfLines={1} style={[s.body, { fontWeight: '700' }]}>{c.title || 'New conversation'}</Text>
              {!!lastMessage && <Text numberOfLines={2} style={[s.small, { marginTop: 4 }]}>{lastMessage}</Text>}
              {selected && <Text style={[s.small, { marginTop: 6, color: color.blue, fontWeight: '700' }]}>Current chat</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {!showDesktopHistory && (
        <Modal visible={historyOpen} transparent animationType="fade" onRequestClose={() => setHistoryOpen(false)}>
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <View style={{ width: '86%', maxWidth: 360, backgroundColor: color.white, paddingTop: 28, paddingHorizontal: 18, paddingBottom: 18, borderRightWidth: 1, borderRightColor: color.line }}>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 }}>
                <Pressable accessibilityRole="button" accessibilityLabel="Close conversations" onPress={() => setHistoryOpen(false)} style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F7F8' }}>
                  <Text style={[s.heading, { lineHeight: 30 }]}>×</Text>
                </Pressable>
              </View>
              {historyList}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close conversations" onPress={() => setHistoryOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.28)' }} />
          </View>
        </Modal>
      )}

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {showDesktopHistory && (
          <View style={{ width: 280, padding: 18, borderRightWidth: 1, borderRightColor: color.line, backgroundColor: color.white }}>
            {historyList}
          </View>
        )}

        <View style={{ flex: 1, minWidth: 0 }}>
          {/* Persistent companion header: remains visible while the conversation scrolls. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: color.white, borderBottomWidth: 1, borderBottomColor: color.line }}>
            <Pressable accessibilityRole="button" accessibilityLabel="View past conversations" disabled={busy} onPress={() => setHistoryOpen(true)} style={{ minWidth: 70, minHeight: 44, justifyContent: 'center', opacity: busy ? 0.5 : 1 }}>
              {!showDesktopHistory && <Text style={[s.small, { color: color.blue, fontWeight: '600' }]}>Chats</Text>}
            </Pressable>
            <View style={{ alignItems: 'center', gap: 2, flex: 1 }}>
              <Image source={penguinImage} resizeMode="contain" style={{ width: 58, height: 58 }} accessibilityLabel="Your penguin companion" />
              <Text style={[s.heading, { fontSize: 17 }]} numberOfLines={1}>{state.profile.penguinName}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Start a new conversation" disabled={busy} onPress={newChat} style={{ minWidth: 70, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end', opacity: busy ? 0.5 : 1 }}>
              <Text style={[s.small, { color: color.blue, fontWeight: '600' }]}>New chat</Text>
            </Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>

            <Button secondary onPress={() => setShowReflections(!showReflections)}>{showReflections ? 'Close reflections' : 'Write or revisit a reflection'}</Button>
            {showReflections && <ReflectionPanel onCoach={request => {
              if (busy) return;
              update(st => ({ ...st, coachRequest: { id: uuid(), source: 'Compassion Hub', kind: 'reflection', prompt: 'Help me reflect on how things are going.', ...request } }));
              setShowReflections(false);
            }} />}

            {state.coachRequest && <Card>
              <Text style={s.eyebrow}>From {state.coachRequest.source}</Text>
              <Text style={s.body}>{state.coachRequest.subject || 'Your progress and plans travel with you.'}</Text>
              <Text style={s.small}>A starting message is ready below. Edit it however you like, then send.</Text>
              <Button secondary disabled={busy} onPress={() => { update(st => ({ ...st, coachRequest: undefined })); setInput(''); }}>Start with a different question</Button>
            </Card>}


            {!active.messages.length && <Card><Text style={s.body}>{preview ? 'This preview has no live AI connection. You can explore the guides and save a plan on this device.' : 'What would you like support with today? You can ask about a guide, your plan, or something that has been difficult.'}</Text></Card>}

            {active.messages.map(m => <View key={m.id} style={[s.message, m.role === 'user' && s.userMessage, m.role === 'user' && !!messageReactions[m.id] && { marginTop: 14, overflow: 'visible' }]}>
              {m.role === 'user' && !!messageReactions[m.id] && (
                <View
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`${state.profile.penguinName} reacted ${messageReactions[m.id]}`}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: -15,
                    left: 12,
                    zIndex: 2,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: color.line,
                    backgroundColor: '#FFFFFF',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontSize: 18, lineHeight: 23 }}>{messageReactions[m.id]}</Text>
                </View>
              )}
              <Text style={s.small}>{m.role === 'user' ? 'You' : state.profile.penguinName}</Text>
              <Text selectable style={s.body}>{m.text}</Text>
              {m.failed && <Button secondary disabled={busy} onPress={() => void send(m.text, m.id)}>Retry this message</Button>}
            </View>)}

            {/* Muse-style in-chat decisions: one tap is explicit permission to save.
                No separate full-screen editor or second confirmation step. */}
            {proposal && <View style={{ backgroundColor: '#F3F6F8', borderRadius: 20, padding: 18, gap: 10, borderWidth: 1, borderColor: color.line }}>
              <Text style={s.eyebrow}>{proposal.operation === 'update' ? 'Proposed goal change' : 'Your new goal'}</Text>
              {proposal.operation === 'update' && <Text style={s.small}>Current: {state.goals.find(g => g.id === targetGoalId)?.goal || 'Select the goal you mean below'}</Text>}
              <Text style={[s.body, { fontWeight: '600' }]}>{draftGoal}</Text>
              {!!proposal.reason && <Text style={s.small}>{proposal.reason}</Text>}
              {proposal.operation === 'update' && !targetGoalId && <View style={{ gap: 7 }}>
                <Text style={s.small}>Which goal would you like to change?</Text>
                {state.goals.filter(g => g.confirmed && !g.completed).map(g => <Button key={g.id} secondary onPress={() => setTargetGoalId(g.id)}>{g.goal}</Button>)}
              </View>}
              <Button disabled={busy || !draftGoal.trim() || (proposal.operation === 'update' && !targetGoalId)} onPress={confirmProposal}>{proposal.operation === 'create' ? 'Yes, save my goal' : 'Yes, update my goal'}</Button>
              <Button secondary disabled={busy} onPress={() => { setProposal(null); setInput('I would like to adjust the wording before saving. ' + draftGoal); }}>Change something</Button>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => setProposal(null)}><Text style={[s.small, { textAlign: 'center', color: color.muted }]}>Not now</Text></Pressable>
            </View>}
            {actionPlanInvite && !planProposal && <View style={{ backgroundColor: '#F3F6F8', borderRadius: 20, padding: 18, gap: 10, borderWidth: 1, borderColor: color.line }}>
              <Text style={s.eyebrow}>Next step · Action planning</Text>
              <Text style={s.body}>Shall we make an action plan?</Text>
              <Button disabled={busy || preview} onPress={() => {
                const saved = actionPlanInvite;
                setActionPlanInvite(null);
                void send('Yes', undefined, saved);
              }}>Yes</Button>
              <Button secondary disabled={busy} onPress={() => { setActionPlanInvite(null); }}>Maybe later</Button>
            </View>}
            {chatGuide?.completed && <View style={{ backgroundColor: '#F3F6F8', borderRadius: 20, padding: 18, gap: 9, borderWidth: 1, borderColor: color.line }}>
              <Text style={s.heading}>Your action plan</Text>
              <Text style={s.small}>For: {state.goals.find(g => g.id === chatGuideGoalId)?.goal}</Text>
              {(['what', 'when', 'where', 'how', 'barrier', 'alternative', 'cue'] as const).map(field => <View key={field} style={{ gap: 2 }}>
                <Text style={[s.small, { fontWeight: '600' }]}>{({ what: 'What', when: 'When', where: 'Where', how: 'How', barrier: 'Possible barrier', alternative: 'If that happens', cue: 'Reminder' })[field]}</Text>
                <Text style={s.body}>{field === 'how' ? (chatGuide.draft.how || '').replace(/ \(Duration: .*\)$/, '') : chatGuide.draft[field] || 'Not specified'}</Text>
              </View>)}
              <View style={{ gap: 2 }}><Text style={[s.small, { fontWeight: '600' }]}>Duration</Text><Text style={s.body}>{chatGuideDuration || 'Not specified'}</Text></View>
              <Button onPress={saveChatGuide}>Yes, save my action plan</Button>
              <Button secondary onPress={() => { setInput('I want to change something in my action plan.'); setChatGuide(null); }}>Change a detail in chat</Button>
              <Button secondary onPress={() => setChatGuide(null)}>Not now</Button>
            </View>}
            {planProposal && !chatGuide && <View style={{ backgroundColor: '#F3F6F8', borderRadius: 20, padding: 18, gap: 9, borderWidth: 1, borderColor: color.line }}>
              <Text style={s.eyebrow}>{planProposal.operation === 'create' ? 'Your proposed action plan' : 'Proposed plan update'}</Text>
              <Text style={s.small}>For: {state.goals.find(g => g.id === planGoalId)?.goal || 'Select a goal below'}</Text>
              {(['what','when','where','how','barrier','alternative','cue'] as const).filter(field => !!planDraft[field]).map(field => <View key={field} style={{ gap: 2 }}><Text style={[s.small, { fontWeight: '600' }]}>{{what:'What',when:'When',where:'Where',how:'How',barrier:'Possible barrier',alternative:'If that happens',cue:'Reminder'}[field]}</Text><Text style={s.body}>{planDraft[field]}</Text></View>)}
              {!planGoalId && <View style={{ gap: 7 }}><Text style={s.small}>Which saved goal does this plan support?</Text>{state.goals.filter(g => g.confirmed && !g.completed).map(g => <Button secondary key={g.id} onPress={() => setPlanGoalId(g.id)}>{g.goal}</Button>)}</View>}
              {planProposal.operation === 'update' && !planId && <Text style={s.small}>I couldn't identify which saved plan to update. Please clarify it with the coach.</Text>}
              <Button disabled={busy || !planGoalId || !planDraft.what.trim() || (planProposal.operation === 'update' && !planId)} onPress={confirmPlanProposal}>{planProposal.operation === 'create' ? 'Yes, save this plan' : 'Yes, update my plan'}</Button>
              <Button secondary disabled={busy} onPress={() => { setPlanProposal(null); setInput('I want to change a detail in the action plan before we save it.'); }}>Change a detail</Button>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => setPlanProposal(null)}><Text style={[s.small, { textAlign: 'center', color: color.muted }]}>Not now</Text></Pressable>
            </View>}

            {busy && <PenguinTypingBubble name={state.profile.penguinName} />}

            {resource && !chatGuide && <Card>
              <Text style={s.heading}>{GUIDE_DEFINITIONS.find(g => g.id === resource)!.title}</Text>
              <Button onPress={() => onGuide(resource, 'learn')}>Learn the guide first</Button>
              <Button secondary onPress={() => onGuide(resource, 'use')}>Use the guide now</Button>
            </Card>}

            <ErrorText>{error}</ErrorText>
            {!!chatGuide && !chatGuide.completed && <View style={{ gap: 8 }}>
              <Text style={s.small}>Choose a suggestion, or type your own answer below.</Text>
              {enterOwnDays && <Text style={s.small}>Enter your own days, e.g. Monday, Thursday, Friday.</Text>}
              {guideChoicesBusy && <Text style={s.small}>Finding ideas for your goal…</Text>}
              {guideChoices.map(option => <Pressable key={option} accessibilityRole="button" onPress={() => {
                if (option === 'Choose my own time and days' || option === 'Choose my own duration' || /^(I have my own|Somewhere else|My own backup)/.test(option)) { setInput(''); setEnterOwnDays(option === 'Choose my own time and days'); return; }
                answerChatGuide(option);
              }} style={{ backgroundColor: color.white, borderRadius: 15, borderWidth: 1, borderColor: color.line, paddingHorizontal: 16, paddingVertical: 14 }}>
                <Text style={s.body}>{option}</Text>
              </Pressable>)}
              <Button secondary onPress={() => { setChatGuide(null); setChatGuideGoalId(''); setInput(''); }}>Pause action planning</Button>
            </View>}
            {!chatGuide && !!active.quickReplies.length && <View style={{ gap: 8 }}>
              <Text style={s.small}>Choose a suggestion, or type your own answer below.</Text>
              {enterOwnDays && <Text style={s.small}>Type the days that work for you (for example, Monday, Thursday, Friday), then tap Send message.</Text>}
              {active.quickReplies.map(option => <Pressable key={option} accessibilityRole="button" disabled={busy || preview} onPress={() => { if (/^(choose my own days|my own days|select my own days|other days)$/i.test(option.trim())) { setEnterOwnDays(true); setInput(''); return; } if (/^(my own idea|something else|another idea|other)$/i.test(option.trim())) { setEnterOwnDays(false); setInput(''); return; } void send(option); }} style={{ backgroundColor: color.white, borderRadius: 15, borderWidth: 1, borderColor: color.line, paddingHorizontal: 16, paddingVertical: 14, opacity: busy || preview ? 0.5 : 1 }}><Text style={s.body}>{option}</Text></Pressable>)}
            </View>}
          </ScrollView>

          <View style={{ padding: 16, backgroundColor: color.white, gap: 10, borderTopWidth: 1, borderTopColor: color.line }}>
            <Field label={`Message ${state.profile.penguinName}`} value={input} onChangeText={setInput} multiline editable={!busy && !preview} maxLength={3000} placeholder={preview ? 'Live coaching is unavailable in preview' : chatGuideChoosingDuration ? 'e.g. 15 minutes' : enterOwnDays ? 'e.g. Monday, Thursday, Friday' : 'Message your penguin or type another idea…'} />
            <Button busy={busy} disabled={preview || !input.trim()} onPress={() => void send(input)}>Send message</Button>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
