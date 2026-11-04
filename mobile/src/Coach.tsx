import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { coachContext, confirmedGoal, newConversation } from './domain';
import { sendCoach } from './api';
import { GUIDE_DEFINITIONS } from './guide-engine.cjs';
import { GuideId } from './types';
import { color, styles as s } from './theme';
import { Button, Card, ErrorText, Field } from './ui';
import { ReflectionPanel } from './screens';

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

  function newChat() {
    if (busy) return;
    const c = newConversation(uuid());
    update(st => ({ ...st, coachRequest: undefined, conversations: [...st.conversations, c], activeConversationId: c.id }));
    setResource(null);
    setError('');
    setInput('');
    setHistoryOpen(false);
  }

  function openChat(id: string) {
    if (busy) return;
    update(st => ({ ...st, coachRequest: undefined, activeConversationId: id }));
    setResource(null);
    setError('');
    setInput('');
    setHistoryOpen(false);
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
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
            <Text style={s.eyebrow}>Your AI coach</Text>
            <Text style={s.heading}>Talk with {state.profile.penguinName}</Text>
            <Text style={s.body}>Bring a question, a setback, or something you’re proud of. We can find your next step together.</Text>

            {!showDesktopHistory && (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Button secondary disabled={busy} onPress={() => setHistoryOpen(true)}>Chats ({state.conversations.length})</Button></View>
                <View style={{ flex: 1 }}><Button secondary disabled={busy} onPress={newChat}>+ New conversation</Button></View>
              </View>
            )}

            {showDesktopHistory && (
              <Card>
                <Text style={s.eyebrow}>Current conversation</Text>
                <Text style={s.heading}>{active.title}</Text>
                <Text style={s.small}>Select another conversation from the sidebar whenever you want to continue an older chat.</Text>
              </Card>
            )}

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
              {m.failed && <Button secondary disabled={busy} onPress={() => void send(m.text, m.id)}>Retry this message</Button>}
            </View>)}

            {busy && <ActivityIndicator color={color.blue} accessibilityLabel="The coach is responding" />}

            {resource && <Card>
              <Text style={s.heading}>{GUIDE_DEFINITIONS.find(g => g.id === resource)!.title}</Text>
              <Button onPress={() => onGuide(resource, 'learn')}>Learn the guide first</Button>
              <Button secondary onPress={() => onGuide(resource, 'use')}>Use the guide now</Button>
            </Card>}

            <ErrorText>{error}</ErrorText>
            {active.quickReplies.map(option => <Button key={option} secondary disabled={busy || preview} onPress={() => void send(option)}>{option}</Button>)}
          </ScrollView>

          <View style={{ padding: 16, backgroundColor: color.white, gap: 10, borderTopWidth: 1, borderTopColor: color.line }}>
            <Field label={`Message ${state.profile.penguinName}`} value={input} onChangeText={setInput} multiline editable={!busy && !preview} maxLength={3000} placeholder={preview ? 'Live coaching is unavailable in preview' : 'What’s on your mind?'} />
            <Button busy={busy} disabled={preview || !input.trim()} onPress={() => void send(input)}>Send message</Button>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
