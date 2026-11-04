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
import { coachContext, confirmedGoal, monday, newConversation } from './domain';
import { sendCoach } from './api';
import { GUIDE_DEFINITIONS } from './guide-engine.cjs';
import { GoalSuggestion, PlanSuggestion, GuideId } from './types';
import { color, styles as s } from './theme';
import { Button, Card, ErrorText, Field } from './ui';
import { ReflectionPanel } from './screens';

const penguinImage = require('../assets/coach-penguin.png');

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

  async function send(text: string, retryId?: string) {
    if (!text.trim() || busy || preview) return;
    setBusy(true);
    setError('');

    const conversationId = active.id;
    const messageId = retryId || uuid();
    const requestId = state.coachRequest?.id;
    const context = coachContext(state, participantId, state.coachRequest?.source || 'Compassion Hub');

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
      return { ...st, goals: st.goals.map(g => g.id === targetGoalId ? {
        ...g, goal: text, revisions: [...(g.revisions || []), { previous: g.goal, next: text, changedAt: now, source: 'coach' as const }],
      } : g) };
    });
    track(proposal.operation === 'create' ? 'goal_created_from_chat' : 'goal_updated_from_chat', { source: 'confirmed_coach_proposal' });
    const savedOperation = proposal.operation;
    setProposal(null);
    setError('');
    // Offer a natural next step without initiating another AI request or saving a plan.
    if (savedOperation === 'create') setActionPlanInvite({ goalId: id, goal: text });
    update(st => ({ ...st, conversations: st.conversations.map(c => c.id === active.id ? { ...c, messages: [...c.messages, { id: uuid(), role: 'assistant' as const, text: savedOperation === 'create' ? 'Your goal is saved in Goals! Would you like to make a flexible action plan for it? I can suggest some starting ideas based on your goal.' : 'I updated your goal in Goals and added this change to its timeline.', createdAt: new Date().toISOString() }] } : c) }));
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
    setHistoryOpen(false);
    setProposal(null);
    setPlanProposal(null);
    setActionPlanInvite(null);
  }

  function openChat(id: string) {
    if (busy) return;
    update(st => ({ ...st, coachRequest: undefined, activeConversationId: id }));
    setResource(null);
    setError('');
    setInput('');
    setHistoryOpen(false);
    setProposal(null);
    setPlanProposal(null);
    setActionPlanInvite(null);
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

            {goal && <Text style={s.small}>Current goal: {goal.goal}</Text>}

            {!active.messages.length && <Card><Text style={s.body}>{preview ? 'This preview has no live AI connection. You can explore the guides and save a plan on this device.' : 'What would you like support with today? You can ask about a guide, your plan, or something that has been difficult.'}</Text></Card>}

            {active.messages.map(m => <View key={m.id} style={[s.message, m.role === 'user' && s.userMessage]}>
              <Text style={s.small}>{m.role === 'user' ? 'You' : state.profile.penguinName}</Text>
              <Text selectable style={s.body}>{m.text}</Text>
              {m.role === 'user' && !m.failed && <Button secondary disabled={busy} onPress={() => openProposal({ operation: 'create', goal: m.text })}>Save this as a goal</Button>}
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
              <Text style={s.body}>Would you like some action-plan ideas for “{actionPlanInvite.goal}”?</Text>
              <Button disabled={busy || preview} onPress={() => {
                const saved = actionPlanInvite;
                setActionPlanInvite(null);
                void send(`Yes, help me create an action plan for my saved goal: "${saved.goal}" (goal ID: ${saved.goalId}). Please suggest 2 or 3 realistic starting options based on this goal and what you already know about my preferences, and ask me which fits. Don't assume my schedule or ability.`);
              }}>Yes, suggest some ideas</Button>
              <Button secondary disabled={busy} onPress={() => { setActionPlanInvite(null); }}>Maybe later</Button>
            </View>}
            {planProposal && <View style={{ backgroundColor: '#F3F6F8', borderRadius: 20, padding: 18, gap: 9, borderWidth: 1, borderColor: color.line }}>
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

            {resource && <Card>
              <Text style={s.heading}>{GUIDE_DEFINITIONS.find(g => g.id === resource)!.title}</Text>
              <Button onPress={() => onGuide(resource, 'learn')}>Learn the guide first</Button>
              <Button secondary onPress={() => onGuide(resource, 'use')}>Use the guide now</Button>
            </Card>}

            <ErrorText>{error}</ErrorText>
            {!!active.quickReplies.length && <View style={{ gap: 8 }}>
              <Text style={s.small}>Choose a suggestion, or type your own answer below.</Text>
              {active.quickReplies.map(option => <Pressable key={option} accessibilityRole="button" disabled={busy || preview} onPress={() => void send(option)} style={{ backgroundColor: color.white, borderRadius: 15, borderWidth: 1, borderColor: color.line, paddingHorizontal: 16, paddingVertical: 14, opacity: busy || preview ? 0.5 : 1 }}><Text style={s.body}>{option}</Text></Pressable>)}
            </View>}
          </ScrollView>

          <View style={{ padding: 16, backgroundColor: color.white, gap: 10, borderTopWidth: 1, borderTopColor: color.line }}>
            <Field label={`Message ${state.profile.penguinName}`} value={input} onChangeText={setInput} multiline editable={!busy && !preview} maxLength={3000} placeholder={preview ? 'Live coaching is unavailable in preview' : 'Message your penguin or type another idea…'} />
            <Button busy={busy} disabled={preview || !input.trim()} onPress={() => void send(input)}>Send message</Button>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
