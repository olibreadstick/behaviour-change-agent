import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, uuid } from './store';
import { awardHomework, coachContext, saveGuideDraft } from './domain';
import { GUIDE_DEFINITIONS, guideResponse } from './guide-engine.cjs';
import { sendCoach } from './api';
import { AskCoach, GuideEvent, GuideId } from './types';
import { color, styles as s } from './theme';
import { Button, Card, ErrorText, Field } from './ui';
import { PenguinHeader } from './Penguin';
export function Guide({ participantId, preview, onClose, onGuide, onCoach }: { participantId: string; preview: boolean; onClose: () => void; onGuide: (id: GuideId, mode: 'learn' | 'use') => void; onCoach: AskCoach }) {
  const { state, update, track } = useAppStore(); const [input, setInput] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const guide = state.guide;
  const locked = useRef(false); const operation = useRef(0); const [goalFeedback, setGoalFeedback] = useState('');
  useEffect(() => { operation.current += 1; setGoalFeedback(''); setBusy(false); locked.current = false; }, [guide?.attemptId]);
  useEffect(() => { setInput(''); setError(''); }, [guide?.guide_id, guide?.mode, guide?.step]);
  async function answer(text: string) {
    if (!guide || locked.current) return;
    locked.current = true;
    const token = ++operation.current;
    setBusy(true); setError('');
    const event: GuideEvent = { guide_id: guide.guide_id, mode: guide.mode, kind: 'answer', step: guide.step, draft: guide.draft, answer: text };
    try {
      const context = coachContext(state, participantId, 'Learn'); 
      const result = guideResponse(
  event,
  context
);
      if (token !== operation.current) return;
      if (result.guide_redirect) { onGuide(result.guide_redirect, 'use'); return; }
      if (!result.guide) throw new Error('Connect the mobile guide workflow to continue this guide.');
      update(st => { const next = { ...st, guide: { ...result.guide!, attemptId: guide.attemptId }, completedLessons: result.guide!.completed && result.guide!.mode === 'learn' ? [...new Set([...st.completedLessons, result.guide!.guide_id])] : st.completedLessons }; return result.guide!.completed && result.guide!.mode === 'learn' ? awardHomework(next, 'guide_learning', guide.guide_id, GUIDE_DEFINITIONS.find(g => g.id === guide.guide_id)!.title) : next; });
      if (result.guide.completed) track('workshop_completed', { guide: guide.guide_id, workshopId: guide.guide_id, mode: guide.mode });
      setInput('');
    } catch (e) { if (token === operation.current) setError(e instanceof Error ? e.message : 'Unable to continue the guide.'); } finally { if (token === operation.current) { locked.current = false; setBusy(false); } }
  }
  async function reviewGoal() {
    if (!guide || locked.current || preview) return;
    locked.current = true; setBusy(true); setError('');
    const token = ++operation.current;
    const c = state.conversations.find(x => x.id === state.activeConversationId)!;
    const messageId = uuid(); const prompt = 'Please give supportive feedback on my proposed goal in the guide draft. What works well, and what could be clearer or more feasible? Do not save or change it for me.';
    const context = { ...coachContext(state, participantId, 'Learn'), requested_help: { id: uuid(), source: 'Learn' as const, kind: 'goal_review' as const, subject: guide.draft.goal, prompt } };
    update(st => ({ ...st, conversations: st.conversations.map(x => x.id === c.id ? { ...x, title: x.messages.length ? x.title : 'Feedback on my goal', messages: [...x.messages, { id: messageId, role: 'user', text: `${prompt}\nProposed goal: ${guide.draft.goal}`, createdAt: new Date().toISOString() }] } : x) }));
    try { const result = await sendCoach(c.sessionId, prompt, context); if (token === operation.current) setGoalFeedback(result.chat_response);
      update(st => ({ ...st, conversations: st.conversations.map(x => x.id === c.id ? { ...x, messages: [...x.messages, { id: uuid(), role: 'assistant', text: result.chat_response, createdAt: new Date().toISOString() }] } : x) })); track('coach_interaction', { conversationId: c.id, source: 'goal_review' });
    } catch (e) { if (token === operation.current) setError(e instanceof Error ? e.message : 'Unable to get goal feedback.'); update(st => ({ ...st, conversations: st.conversations.map(x => x.id === c.id ? { ...x, messages: x.messages.map(m => m.id === messageId ? { ...m, failed: true } : m) } : x) })); }
    finally { if (token === operation.current) { locked.current = false; setBusy(false); } }
  }
  function save() { if (!guide || locked.current) return; locked.current = true; try { update(st => saveGuideDraft(st, guide, uuid())); track(guide.guide_id === 'goal_setting' ? 'goal_set' : 'guide_plan_saved', { guide: guide.guide_id }); onClose(); } catch (e) { locked.current = false; setError(e instanceof Error ? e.message : 'Unable to save.'); } }
  const ask = () => onCoach({ kind: 'guide_help', subject: guide?.question || guide?.title, prompt: `Help me with the current ${guide?.mode === 'learn' ? 'learning' : 'practice'} step in ${guide ? GUIDE_DEFINITIONS.find(g => g.id === guide.guide_id)!.title : 'my guide'}.` });
  return <SafeAreaView style={s.modal}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <PenguinHeader onCoach={ask} onClose={onClose} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      {guide ? <><View accessible accessibilityLabel={`${guide.progress} of ${guide.total_steps} guide steps completed`} style={s.progressTrack}><View style={[s.progressFill, { width: `${guide.progress / guide.total_steps * 100}%` }]} /></View>
        <Text style={s.small}>{guide.mode === 'learn' ? 'Learn the guide first' : 'Use the guide now'} · {Math.min(guide.step + 1, guide.total_steps)} of {guide.total_steps}</Text>
        {!!guide.feedback && <Card><Text accessibilityLiveRegion="polite" style={s.body}>{guide.feedback}</Text></Card>}
        <Text style={s.title}>{guide.title}</Text><Text style={s.body}>{guide.body}</Text>
        {!guide.completed && <><Text style={s.heading}>{guide.question}</Text>{guide.options.length ? guide.options.map(option => <Button key={option} secondary disabled={busy} onPress={() => void answer(option)}>{option}</Button>) : <><Field label="Your response" value={input} onChangeText={setInput} multiline maxLength={3000} /><Button busy={busy} disabled={!input.trim()} onPress={() => void answer(input)}>Continue</Button></>}</>}
        {guide.completed && guide.mode === 'learn' && <><Text style={s.body}>{state.profile.penguinName} celebrates your learning!</Text><Button onPress={() => onGuide(guide.guide_id, 'use')}>Use the guide now</Button><Button secondary onPress={onClose}>Return to my learning path</Button></>}
        {guide.completed && guide.mode === 'use' && <><Card><Text style={s.heading}>Review your draft</Text>{Object.entries(guide.draft).map(([key, value]) => <View key={key}><Text style={s.label}>{key.replace(/_/g, ' ')}</Text><Text style={s.body}>{value}</Text></View>)}</Card>
          {guide.guide_id === 'goal_setting' && <Card><Text style={s.heading}>Feedback from {state.profile.penguinName}</Text>{goalFeedback && <Text selectable style={s.body}>{goalFeedback}</Text>}<Button secondary busy={busy} disabled={preview} onPress={() => void reviewGoal()}>Review my goal with my penguin</Button>{preview && <Text style={s.small}>Live AI feedback is available when you sign in to a connected account.</Text>}<Text style={s.small}>Feedback is a suggestion. You choose what to revise or save.</Text></Card>}
          <Button disabled={busy} onPress={save}>{guide.guide_id === 'goal_setting' ? 'Confirm and save my goal' : 'Submit and save my plan'}</Button><Button secondary disabled={busy} onPress={() => onGuide(guide.guide_id, 'use')}>Revise this draft</Button></>}
        {!guide.completed && guide.mode === 'learn' && <Button secondary disabled={busy} onPress={() => onGuide(guide.guide_id, 'use')}>Skip to using the guide</Button>}
        <ErrorText>{error}</ErrorText><Button secondary disabled={busy} onPress={ask}>Ask my penguin about this step</Button>
      </> : <><Text style={s.body}>Your guide has been saved.</Text><Button onPress={onClose}>Done</Button></>}
    </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
