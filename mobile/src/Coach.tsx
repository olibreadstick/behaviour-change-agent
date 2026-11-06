import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AccessibilityInfo,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import Ionicons from '@expo/vector-icons/Ionicons';
import { ReflectionPanel } from './screens';
import { PenguinAvatar } from './Penguin';

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

// Pip's working animation uses the existing selected body/bow PNG and the same
// glasses overlay as every other PenguinAvatar. It is purely presentational:
// the busy state below tracks the real pending AI request.
function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReduced(value);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => setReduced(value));
    // On web, react-native-web's accessibility event support varies by version.
    const media = Platform.OS === 'web' && typeof (globalThis as any).matchMedia === 'function'
      ? (globalThis as any).matchMedia('(prefers-reduced-motion: reduce)') : null;
    const mediaChanged = (event: any) => setReduced(Boolean(event.matches));
    if (media) {
      setReduced(Boolean(media.matches));
      media.addEventListener?.('change', mediaChanged);
    }
    return () => {
      mounted = false;
      subscription?.remove?.();
      media?.removeEventListener?.('change', mediaChanged);
    };
  }, []);
  return reduced;
}

function PipIdleAvatar({ profile }: { profile: Parameters<typeof PenguinAvatar>[0]['profile'] }) {
  const reducedMotion = useReducedMotion();
  const bob = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (reducedMotion) { bob.setValue(0); return; }
    const cycle = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: -9, duration: 900, useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]));
    cycle.start();
    return () => cycle.stop();
  }, [reducedMotion, bob]);
  // Use complete, pre-rendered idle animation on web so the body, bow,
  // and face move together rather than as separate layers. Respect system
  // reduced-motion preferences and keep native Expo's original fallback.
  if (Platform.OS === 'web' && !reducedMotion) {
    const colours = ['blue', 'pink', 'purple', 'green', 'red', 'yellow', 'orange'];
    const body = colours.includes(profile.penguinColour || '') ? profile.penguinColour : 'blue';
    const bow = colours.includes(profile.bowColour || '') ? profile.bowColour : 'red';
    return (
      <Image
        source={{ uri: `/penguins/idle/penguin-${body}-bow-${bow}.gif` }}
        resizeMode="contain"
        style={{ width: 76, height: 76 }}
        accessibilityLabel="Pip resting"
      />
    );
  }
  return <Animated.View style={{ transform: [{ translateY: bob }] }}>
    <PenguinAvatar profile={profile} size={58} />
  </Animated.View>;
}

// Keep the two complete animations in the same position and crossfade between
// them when a real coach request begins/finishes. There is no response GIF.
function PipCompanion({ busy, name, profile, status }: {
  busy: boolean;
  name: string;
  profile: Parameters<typeof PenguinAvatar>[0]['profile'];
  status: string;
}) {
  const progress = React.useRef(new Animated.Value(busy ? 1 : 0)).current;
  const [showWorking, setShowWorking] = React.useState(busy);
  const reducedMotion = useReducedMotion();
  React.useEffect(() => {
    if (busy) setShowWorking(true);
    if (reducedMotion) {
      progress.setValue(busy ? 1 : 0);
      if (!busy) setShowWorking(false);
      return;
    }
    const transition = Animated.timing(progress, {
      toValue: busy ? 1 : 0,
      duration: busy ? 180 : 380,
      useNativeDriver: true,
    });
    transition.start(({ finished }) => {
      if (finished && !busy) setShowWorking(false);
    });
    return () => transition.stop();
  }, [busy, progress, reducedMotion]);
  return (
    <View style={{ width: 142, height: 118, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={{
        position: 'absolute', top: 12, alignSelf: 'center',
        opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
      }}>
        <PipIdleAvatar profile={profile} />
      </Animated.View>
      {showWorking && (
        <Animated.View pointerEvents="none" style={{
          position: 'absolute', top: 0, alignSelf: 'center', opacity: progress,
        }}>
          <PipWorking name={name} profile={profile} status={status} compact />
        </Animated.View>
      )}
    </View>
  );
}

// Present only a truthful description of the pending conversation request.
// A save/update is never claimed until the app confirms completion.
function pipWorkingStatus(message: string, requestKind?: string): string {
  const t = message.toLowerCase();
  if (/self[- ]monitor|check[ -]?in|track(?:ing)?|log(?:ging)?\b/.test(t) || requestKind === 'monitoring') return 'Reviewing your check-in';
  if (/positive self[- ]talk|self[- ]praise|refram|self[- ]kindness/.test(t)) return 'Exploring self-talk';
  if (/\b(?:reduce|decrease|lower|less|fewer|change|revise|adjust|modify)\b/.test(t) && /\b(?:goal|times?|days?|weekly|week)\b/.test(t)) return 'Exploring goal changes';
  if (/action plan|planning|plan my|plan for|schedule|when to|what time/.test(t) || requestKind === 'plan_support') return 'Planning your activity';
  if (/\bgoal\b|\bgoals\b/.test(t) || requestKind === 'goal_support') return 'Reviewing your goal';
  if (/reflection|reflect|how it went|progress/.test(t) || requestKind === 'reflection') return 'Reflecting with you';
  return 'Preparing your reply';
}

function PipWorking({ name, profile, status, compact = false }: {
  name: string; profile: Parameters<typeof PenguinAvatar>[0]['profile']; status: string; compact?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const float = React.useRef(new Animated.Value(0)).current;
  const tap = React.useRef(new Animated.Value(0)).current;
  const scale = compact ? 70 : 110;
  React.useEffect(() => {
    if (reducedMotion) { float.setValue(0); tap.setValue(0); return; }
    const animation = Animated.parallel([
      Animated.loop(Animated.sequence([
        Animated.timing(float, { toValue: -3, duration: 430, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 430, useNativeDriver: true }),
      ])),
      Animated.loop(Animated.sequence([
        Animated.timing(tap, { toValue: -2, duration: 180, useNativeDriver: true }),
        Animated.timing(tap, { toValue: 0, duration: 180, useNativeDriver: true }),
      ])),
    ]);
    animation.start();
    return () => animation.stop();
  }, [reducedMotion, float, tap]);
  // On Expo Web, show the complete pre-rendered GIF. No overlapping laptop or
  // bow layers: the whole mascot moves as one illustrated animation.
  // Reduced-motion devices and native Expo retain the existing static fallback.
  if (Platform.OS === 'web' && !reducedMotion) {
    const colours = ['blue', 'pink', 'purple', 'green', 'red', 'yellow', 'orange'];
    const body = colours.includes(profile.penguinColour || '') ? profile.penguinColour : 'blue';
    const bow = colours.includes(profile.bowColour || '') ? profile.bowColour : 'red';
    return (
      <View accessible accessibilityRole="text" accessibilityLabel={`${name}: ${status}`}
        style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: compact ? 0 : 6 }}>
        <Image
          source={{ uri: `/penguins/animated/penguin-${body}-bow-${bow}.gif` }}
          style={{ width: scale + 14, height: scale + 10 }}
          resizeMode="contain"
          accessibilityLabel={`${name} typing at a laptop`}
        />
        <View style={{ borderRadius: 16, borderColor: color.line, borderWidth: 1,
          backgroundColor: color.white, paddingHorizontal: compact ? 10 : 16,
          paddingVertical: compact ? 4 : 9, marginTop: 4, maxWidth: 220 }}>
          <Text style={[s.small, { textAlign: 'center', color: color.ink, fontSize: compact ? 11 : undefined }]}>{status}</Text>
        </View>
      </View>
    );
  }
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={`${name}: ${status}`}
      style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: compact ? 0 : 6 }}>
      <View style={{ width: scale + 14, height: scale + 10, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Animated.View style={{ transform: [{ translateY: float }] }}>
          <PenguinAvatar profile={profile} size={scale} />
        </Animated.View>
        {/* Small laptop at the lower front: a flat, unobtrusive overlay. */}
        <Animated.View pointerEvents="none" style={{ position: 'absolute', bottom: 3,
          transform: [{ translateY: tap }], alignItems: 'center' }}>
          <View style={{ width: scale * .57, height: scale * .34,
            borderRadius: 5, borderWidth: 2, borderColor: '#17324B',
            backgroundColor: '#DCECF4', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#368AAE' }}/>
          </View>
          <View style={{ width: scale * .68, height: 4, borderRadius: 4,
            backgroundColor: '#17324B', marginTop: -1 }}/>
        </Animated.View>
      </View>
      <View style={{ borderRadius: 16, borderColor: color.line, borderWidth: 1,
        backgroundColor: color.white, paddingHorizontal: compact ? 10 : 16,
        paddingVertical: compact ? 4 : 9, marginTop: 4, maxWidth: 220 }}>
        <Text style={[s.small, { textAlign: 'center', color: color.ink, fontSize: compact ? 11 : undefined }]}>{status}</Text>
      </View>
    </View>
  );
}

function PenguinTypingBubble({ name, profile }: {
  name: string; profile: Parameters<typeof PenguinAvatar>[0]['profile'];
}) {
  const reducedMotion = useReducedMotion();
  const dots = React.useRef([new Animated.Value(0.25), new Animated.Value(0.25), new Animated.Value(0.25)]).current;
  React.useEffect(() => {
    if (reducedMotion) {
      dots.forEach(dot => dot.setValue(0.7));
      return;
    }
    // The original typing indicator: three separate dots light up one after another.
    const cycle = Animated.loop(Animated.stagger(180, dots.map(dot => Animated.sequence([
      Animated.timing(dot, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(dot, { toValue: 0.25, duration: 370, useNativeDriver: true }),
    ]))));
    cycle.start();
    return () => cycle.stop();
  }, [dots, reducedMotion]);
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={`${name} is typing`} style={[s.message, {
      alignSelf: 'flex-start', minWidth: 92, paddingVertical: 16, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'center', gap: 8,
    }]}>
      {dots.map((opacity, index) => (
        <Animated.View key={index} style={{ width: 9, height: 9, borderRadius: 5,
          backgroundColor: color.blue, opacity }} />
      ))}
    </View>
  );
}

// Preserve a selected suggested answer within its original Pip message.
// Unchosen answers stay visible, but become inactive and subdued like Muse.
type ReplySnapshot = { options: string[]; selected: string };
function ChoiceRows({ options, selected, disabled, onChoose }: {
  options: string[]; selected?: string; disabled?: boolean; onChoose?: (option: string) => void;
}) {
  return <View style={{ gap: 8, marginTop: 12 }}>
    {options.map((option, index) => {
      const isSelected = selected === option;
      const isInactive = !!selected && !isSelected;
      return <Pressable key={`${option}-${index}`} accessibilityRole="button"
        accessibilityState={{ selected: isSelected, disabled: !!disabled || !!selected }}
        accessibilityLabel={isSelected ? `${option}, selected` : option}
        disabled={!!disabled || !!selected}
        onPress={() => onChoose?.(option)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12,
          backgroundColor: isSelected ? '#F8FCFE' : color.white,
          borderRadius: 15, borderWidth: isSelected ? 1.5 : 1,
          borderStyle: isInactive ? 'dashed' : 'solid',
          borderColor: isSelected ? color.blue : color.line,
          paddingHorizontal: 16, paddingVertical: 14,
          opacity: isInactive ? 0.44 : disabled && !selected ? 0.55 : 1,
        }}>
        <Text style={[s.body, { flex: 1, color: isInactive ? '#7B8C98' : color.ink }]}>{option}</Text>
        {isSelected && <Ionicons name="checkmark-circle" size={24} color={color.blue} />}
      </Pressable>;
    })}
  </View>;
}


export function Coach({ participantId, preview, onGuide }: { participantId: string; preview: boolean; onGuide: (id: GuideId, mode: 'learn' | 'use') => void }) {
  const { state, update, track } = useAppStore();
  const { width } = useWindowDimensions();
  const showDesktopHistory = Platform.OS === 'web' && width >= 820;

  const [input, setInput] = useState('');
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [speechNotice, setSpeechNotice] = useState('');
  const speechRef = useRef<any>(null);
  // Browser speech synthesis is built in and requires no recordings or external service.
  // It is unavailable on native Expo until a native text-to-speech package is added.
  function toggleReadAloud(id: string, message: string) {
    if (Platform.OS !== 'web' || typeof (globalThis as any).speechSynthesis === 'undefined' || typeof (globalThis as any).SpeechSynthesisUtterance === 'undefined') {
      setSpeechNotice('Read aloud is available in supported web browsers. Native text-to-speech is not configured yet.');
      return;
    }
    const synth = (globalThis as any).speechSynthesis;
    synth.cancel();
    if (speakingMessageId === id) { setSpeakingMessageId(null); speechRef.current = null; return; }
    const utterance = new (globalThis as any).SpeechSynthesisUtterance(message);
    utterance.lang = 'en-CA';
    // Prefer an installed natural/enhanced English voice when available.
    const voices = synth.getVoices?.() || [];
    const preferred = voices.filter((v: any) => /^en[-_]/i.test(v.lang || ''))
      .sort((a: any, b: any) => {
        const rank = (v: any) => /premium|enhanced|natural|neural|samantha|ava|jenny/i.test(v.name) ? 2 : /google|microsoft|apple/i.test(v.name) ? 1 : 0;
        return rank(b) - rank(a);
      })[0];
    if (preferred) { utterance.voice = preferred; utterance.lang = preferred.lang; }
    // Use a single gentle default; participant voice-selection settings have been removed.
    utterance.rate = 0.96;
    utterance.pitch = 1.02;
    utterance.onend = () => { setSpeakingMessageId(current => current === id ? null : current); };
    utterance.onerror = () => { setSpeakingMessageId(null); setSpeechNotice('Unable to play this message aloud.'); };
    speechRef.current = utterance;
    setSpeakingMessageId(id);
    setSpeechNotice('');
    synth.speak(utterance);
  }
  useEffect(() => () => {
    if (Platform.OS === 'web') (globalThis as any).speechSynthesis?.cancel?.();
  }, []);
  const [listening, setListening] = useState(false);
  const [dictationNotice, setDictationNotice] = useState('');
  const recognitionRef = useRef<any>(null);
  useEffect(() => () => { try { recognitionRef.current?.abort?.(); } catch {} }, []);
  const toggleDictation = () => {
    if (listening) { recognitionRef.current?.stop?.(); setListening(false); return; }
    if (Platform.OS !== 'web') { setDictationNotice('Use the microphone on your phone keyboard to dictate.'); return; }
    const SpeechRecognition = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setDictationNotice('Voice dictation is not available in this browser. Try Chrome or use your keyboard microphone.'); return; }
    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'en-CA'; recognition.interimResults = false; recognition.continuous = false;
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results as any).map((r: any) => r[0]?.transcript || '').join(' ').trim();
        if (transcript) setInput(previous => [previous.trim(), transcript].filter(Boolean).join(' '));
        setDictationNotice('');
      };
      recognition.onerror = (event: any) => { setDictationNotice(event.error === 'not-allowed' ? 'Allow microphone access in your browser settings.' : 'Dictation stopped. You can type your message instead.'); setListening(false); };
      recognition.onend = () => setListening(false);
      recognition.start(); setListening(true); setDictationNotice('');
    } catch { setListening(false); setDictationNotice('Could not start dictation. Check microphone permissions.'); }
  };
  // Self-monitoring uses the same conversational surface as Action Planning.
  // Goal selection is explicit to avoid incorrectly attributing a check-in to the first goal.
  type MonitorStep = 'choose_goal' | 'what' | 'how' | 'when' | 'frequency' | 'confirm';
  const [monitorFlow, setMonitorFlow] = useState<{ step: MonitorStep; goalId: string; draft: { what: string; how: string; when: string; frequency: string } } | null>(null);
  const [checkIn, setCheckIn] = useState<{ goalId: string; note: string } | null>(null);

  const [replySnapshots, setReplySnapshots] = useState<Record<string, ReplySnapshot>>({});
  const rememberReply = (messageId: string, options: string[], selected: string) => {
    setReplySnapshots(previous => ({ ...previous,
      [messageId]: { options: [...options], selected },
    }));
  };
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
  const [workingStatus, setWorkingStatus] = useState('Preparing your reply');
  const [error, setError] = useState('');
  const [resource, setResource] = useState<GuideId | null>(null);
  const [showReflections, setShowReflections] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const conversationScroll = useRef<ScrollView>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const nearBottomRef = useRef(true);
  const onConversationScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const away = contentSize.height - layoutMeasurement.height - contentOffset.y > 160;
    nearBottomRef.current = !away;
    setShowJumpToLatest(away);
  };
  const jumpToLatest = () => { conversationScroll.current?.scrollToEnd({ animated: true }); nearBottomRef.current = true; setShowJumpToLatest(false); };
  const [proposal, setProposal] = useState<GoalSuggestion | null>(null);
  const [draftGoal, setDraftGoal] = useState('');
  const [targetGoalId, setTargetGoalId] = useState('');
  const [planProposal, setPlanProposal] = useState<PlanSuggestion | null>(null);
  const [planDraft, setPlanDraft] = useState({ what: '', when: '', where: '', how: '', barrier: '', alternative: '', cue: '' });
  const [planGoalId, setPlanGoalId] = useState('');
  const [planId, setPlanId] = useState('');
  const [actionPlanInvite, setActionPlanInvite] = useState<{ goalId: string; goal: string } | null>(null);

  const active = state.conversations.find(c => c.id === state.activeConversationId)!;
  const lastAssistantId = [...active.messages].reverse().find(m => m.role === 'assistant')?.id;
  const goal = confirmedGoal(state);

  useEffect(() => {
    const request = state.coachRequest;
    if (!request) return;
    if (/self.monitoring|track my progress/i.test(request.prompt)) {
      startMonitoring(request.goalId);
      update(st => ({ ...st, coachRequest: undefined }));
    } else {
      setInput(request.prompt);
    }
  }, [state.coachRequest?.id]);

  function monitorAsk(question: string) { appendGuideMessage('assistant', question); }
  function startMonitoring(goalId?: string) {
    const goals = state.goals.filter(g => g.confirmed && !g.completed);
    setInput(''); setChatGuide(null); setCheckIn(null);
    const selected = goals.find(g => g.id === goalId) || (goals.length === 1 ? goals[0] : undefined);
    setMonitorFlow({ step: selected ? 'what' : 'choose_goal', goalId: selected?.id || '', draft: { what: '', how: '', when: '', frequency: '' } });
    if (!goals.length) monitorAsk('Create a goal first so we can link your monitoring plan to it.');
    else if (!selected) monitorAsk('Which goal would you like to monitor?');
    else monitorAsk(`Let's make a self-monitoring plan for “${selected.goal}”. What would be useful to track?`);
  }
  function monitorAnswer(answer: string) {
    if (!monitorFlow || !answer.trim()) return;
    const value = answer.trim();
    const goals = state.goals.filter(g => g.confirmed && !g.completed);
    if (monitorFlow.step === 'choose_goal') {
      const goal = goals.find(g => g.id === value || g.goal === value);
      if (!goal) { setError('Please choose a saved goal.'); return; }
      setMonitorFlow({ ...monitorFlow, goalId: goal.id, step: 'what' });
      appendGuideMessage('user', goal.goal);
      monitorAsk(`For “${goal.goal}”, what would be useful to track?`);
      setInput(''); return;
    }
    if (monitorFlow.step === 'confirm') return;
    const draft = { ...monitorFlow.draft, [monitorFlow.step]: value };
    const next: Record<string, MonitorStep> = { what: 'how', how: 'when', when: 'frequency', frequency: 'confirm' };
    const nextStep = next[monitorFlow.step];
    setMonitorFlow({ ...monitorFlow, step: nextStep, draft });
    appendGuideMessage('user', value);
    const prompts: Record<string,string> = {
      how: 'Where would you like to record it?',
      when: 'When would you record it?',
      frequency: 'How often would you like to review your check-ins?',
    };
    monitorAsk(nextStep === 'confirm' ? 'Your self-monitoring plan is ready. Would you like to save it to your goal?' : prompts[nextStep]);
    setInput('');
  }
  function saveMonitoringPlan() {
    if (!monitorFlow?.goalId || monitorFlow.step !== 'confirm') return;
    const { goalId, draft } = monitorFlow;
    update(st => ({ ...st, monitoringPlans: [...(st.monitoringPlans || []), { ...draft, id: uuid(), goalId, stage: 'Taking action', createdAt: new Date().toISOString() }] }));
    appendGuideMessage('assistant', 'Your self-monitoring plan is saved in this goal’s timeline. You can record a check-in here whenever you like.');
    setMonitorFlow(null);
    track('monitoring_plan_saved', { goalId });
  }
  function saveMonitoringCheckIn() {
    if (!checkIn?.goalId) return;
    const { goalId, note } = checkIn;
    const latest = [...(state.monitoringPlans || [])].reverse().find(p => p.goalId === goalId);
    update(st => ({ ...st, monitoringCheckIns: [...(st.monitoringCheckIns || []), { id: uuid(), goalId, planId: latest?.id, note, date: new Date().toISOString().slice(0,10), createdAt: new Date().toISOString() }] }));
    appendGuideMessage('assistant', 'Your check-in has been added to the goal’s activity timeline. 💙');
    setCheckIn(null);
    track('monitoring_check_in_saved', { goalId });
  }

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
    // Restore the in-app reminder preference for future notification support.
    // This only records their choice; it does not schedule a notification yet.
    ...(chatGuide.step === 6 && !guideAiChoices.some(option => /^in[ -]app$/i.test(option.trim())) ? ['In app'] : []),
  ] : [];

  async function send(text: string, retryId?: string, planHelp?: { goalId: string; goal: string }) {
    if (!text.trim() || busy || preview) return;
    if (!monitorFlow && /\b(?:create|make|set up|start|build)\b/i.test(text) && /self[- ]monitoring plan/i.test(text)) {
      appendGuideMessage('user', text);
      startMonitoring(state.coachRequest?.goalId);
      setInput(''); return;
    }
    if (monitorFlow) { monitorAnswer(text); return; }
    if (checkIn) { setError('Choose the goal for this check-in, then confirm or cancel.'); return; }
    // An explicit check-in request is stored only after the participant selects its goal
    // and confirms; chat alone must never silently log an activity.
    if (/\b(?:i(?: am|['’]m)? recording|log(?:ging)?|record(?:ed)?|track(?:ing)?)\b/i.test(text) && /\b(?:today|yesterday|danc|walk|activity|session|exercise)\b/i.test(text)) {
      const savedGoals = state.goals.filter(g => g.confirmed && !g.completed);
      appendGuideMessage('user', text);
      const requestedGoal = state.coachRequest?.goalId;
      const selected = savedGoals.find(g => g.id === requestedGoal) || (savedGoals.length === 1 ? savedGoals[0] : undefined);
      setCheckIn({ goalId: selected?.id || '', note: text.trim() });
      appendGuideMessage('assistant', selected ? `Would you like to record that check-in under “${selected.goal}”?` : 'Which goal should this check-in be recorded under?');
      setInput(''); return;
    }
    if (chatGuide) { answerChatGuide(text); return; }
    if (planHelp) { appendGuideMessage('user', text); startChatGuide(planHelp.goalId); return; }
    setWorkingStatus(pipWorkingStatus(text, state.coachRequest?.kind));
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
              <PipCompanion busy={busy} name={state.profile.penguinName} profile={state.profile} status={workingStatus} />
              <Text style={[s.heading, { fontSize: 17 }]} numberOfLines={1}>{state.profile.penguinName}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Start a new conversation" disabled={busy} onPress={newChat} style={{ minWidth: 91, minHeight: 38, paddingHorizontal: 12, borderWidth: 1.5, borderColor: color.blue, borderRadius: 12, justifyContent: 'center', alignItems: 'center', opacity: busy ? 0.5 : 1 }}>
              <Text style={[s.small, { color: color.blue, fontWeight: '600' }]}>New chat</Text>
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>
          <ScrollView ref={conversationScroll} onScroll={onConversationScroll} scrollEventThrottle={80} onContentSizeChange={() => { if (nearBottomRef.current) conversationScroll.current?.scrollToEnd({ animated: false }); }} style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>

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
              {m.role === 'assistant' && (
                <Pressable accessibilityRole="button" accessibilityLabel={speakingMessageId === m.id ? 'Stop reading message aloud' : 'Read message aloud'} onPress={() => toggleReadAloud(m.id, m.text)} style={{ alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 8, marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name={speakingMessageId === m.id ? 'stop-circle-outline' : 'volume-high-outline'} size={21} color={color.blue} />
                  <Text style={[s.small, { color: color.blue }]}>{speakingMessageId === m.id ? 'Stop' : 'Listen'}</Text>
                </Pressable>
              )}
              {m.failed && <Button secondary disabled={busy} onPress={() => void send(m.text, m.id)}>Retry this message</Button>}
            {m.role === 'assistant' && !!replySnapshots[m.id] && <ChoiceRows
              options={replySnapshots[m.id].options} selected={replySnapshots[m.id].selected} />}
            {m.role === 'assistant' && m.id === lastAssistantId && !replySnapshots[m.id] && monitorFlow && <View style={{ marginTop: 12 }}>
              {monitorFlow.step !== 'confirm' && <ChoiceRows options={monitorFlow.step === 'choose_goal'
                ? state.goals.filter(g => g.confirmed && !g.completed).map(g => g.goal)
                : ({
                    what: ['Whether I did my activity', 'How long I was active', 'How I felt afterward'],
                    how: ['In app', 'In a notebook', 'In my phone notes', 'In a paper activity log'],
                    when: ['Right after the activity', 'At the end of the day', 'The next morning'],
                    frequency: ['Once a week', 'After each activity', 'Every two weeks'],
                  } as Record<string, string[]>)[monitorFlow.step] || []}
                onChoose={option => {
                  const options = monitorFlow.step === 'choose_goal'
                    ? state.goals.filter(g => g.confirmed && !g.completed).map(g => g.goal)
                    : ({
                        what: ['Whether I did my activity', 'How long I was active', 'How I felt afterward'],
                        how: ['In app', 'In a notebook', 'In my phone notes', 'In a paper activity log'],
                        when: ['Right after the activity', 'At the end of the day', 'The next morning'],
                        frequency: ['Once a week', 'After each activity', 'Every two weeks'],
                      } as Record<string, string[]>)[monitorFlow.step] || [];
                  rememberReply(m.id, options, option);
                  monitorAnswer(option);
                }} />}
              {monitorFlow.step === 'confirm' && <View style={{ gap: 8 }}>
                <Text style={s.heading}>Self-monitoring plan</Text>
                <Text style={s.body}>Goal: {state.goals.find(g => g.id === monitorFlow.goalId)?.goal}</Text>
                <Text style={s.body}>Track: {monitorFlow.draft.what}</Text>
                <Text style={s.body}>Record: {monitorFlow.draft.how}</Text>
                <Text style={s.body}>When: {monitorFlow.draft.when}</Text>
                <Text style={s.body}>Review: {monitorFlow.draft.frequency}</Text>
                <Button onPress={saveMonitoringPlan}>Yes, save my monitoring plan</Button>
              </View>}
              <Text style={[s.small, { marginTop: 9 }]}>You can also type a different answer below.</Text>
            </View>}
            {m.role === 'assistant' && m.id === lastAssistantId && !replySnapshots[m.id] && !!chatGuide && !chatGuide.completed && <View style={{ marginTop: 12 }}>
              {enterOwnDays && <Text style={s.small}>Enter your own days, e.g. Monday, Thursday, Friday.</Text>}
              {guideChoicesBusy && <Text style={s.small}>Finding ideas for your goal…</Text>}
              <ChoiceRows options={guideChoices} onChoose={option => {
                if (option === 'Choose my own time and days' || option === 'Choose my own duration' || /^(I have my own|Somewhere else|My own backup)/.test(option)) {
                  setInput(''); setEnterOwnDays(option === 'Choose my own time and days'); return;
                }
                rememberReply(m.id, guideChoices, option);
                answerChatGuide(option);
              }} />
              <View style={{ marginTop: 8 }}><Button secondary onPress={() => { setChatGuide(null); setChatGuideGoalId(''); setInput(''); }}>Pause action planning</Button></View>
            </View>}
            {m.role === 'assistant' && m.id === lastAssistantId && !replySnapshots[m.id] && !chatGuide && !!active.quickReplies.length && <View style={{ marginTop: 12 }}>
              {enterOwnDays && <Text style={s.small}>Type the days that work for you (for example, Monday, Thursday, Friday), then tap Send message.</Text>}
              <ChoiceRows options={active.quickReplies} disabled={busy || preview} onChoose={option => {
                if (/^(choose my own days|my own days|select my own days|other days)$/i.test(option.trim())) {
                  setEnterOwnDays(true); setInput(''); return;
                }
                if (/^(my own idea|something else|another idea|other)$/i.test(option.trim())) {
                  setEnterOwnDays(false); setInput(''); return;
                }
                rememberReply(m.id, active.quickReplies, option);
                void send(option);
              }} />
            </View>}
            </View>)}


            {checkIn && <View style={{ gap: 8, padding: 12, backgroundColor: color.white, borderRadius: 18, borderWidth: 1, borderColor: color.line }}>
              {!checkIn.goalId && state.goals.filter(g => g.confirmed && !g.completed).map(g => <Button key={g.id} secondary onPress={() => setCheckIn(prev => prev && { ...prev, goalId: g.id })}>{g.goal}</Button>)}
              {!!checkIn.goalId && <>
                <Text style={s.body}>Record under: {state.goals.find(g => g.id === checkIn.goalId)?.goal}</Text>
                <Text style={s.small}>{checkIn.note}</Text>
                <Button onPress={saveMonitoringCheckIn}>Yes, record this check-in</Button>
                <Button secondary onPress={() => setCheckIn({ ...checkIn, goalId: '' })}>Choose another goal</Button>
              </>}
            </View>}

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
            </View>}
            {planProposal && !chatGuide && <View style={{ backgroundColor: '#F3F6F8', borderRadius: 20, padding: 18, gap: 9, borderWidth: 1, borderColor: color.line }}>
              <Text style={s.eyebrow}>{planProposal.operation === 'create' ? 'Your proposed action plan' : 'Proposed plan update'}</Text>
              <Text style={s.small}>For: {state.goals.find(g => g.id === planGoalId)?.goal || 'Select a goal below'}</Text>
              {(['what','when','where','how','barrier','alternative','cue'] as const).filter(field => !!planDraft[field]).map(field => <View key={field} style={{ gap: 2 }}><Text style={[s.small, { fontWeight: '600' }]}>{{what:'What',when:'When',where:'Where',how:'How',barrier:'Possible barrier',alternative:'If that happens',cue:'Reminder'}[field]}</Text><Text style={s.body}>{planDraft[field]}</Text></View>)}
              {!planGoalId && <View style={{ gap: 7 }}><Text style={s.small}>Which saved goal does this plan support?</Text>{state.goals.filter(g => g.confirmed && !g.completed).map(g => <Button secondary key={g.id} onPress={() => setPlanGoalId(g.id)}>{g.goal}</Button>)}</View>}
              {planProposal.operation === 'update' && !planId && <Text style={s.small}>I couldn't identify which saved plan to update. Please clarify it with the coach.</Text>}
              <Button disabled={busy || !planGoalId || !planDraft.what.trim() || (planProposal.operation === 'update' && !planId)} onPress={confirmPlanProposal}>{planProposal.operation === 'create' ? 'Yes, save this plan' : 'Yes, update my plan'}</Button>
              <Button secondary disabled={busy} onPress={() => { setPlanProposal(null); setInput('I want to change a detail in the action plan before we save it.'); }}>Change a detail</Button>
            </View>}

            {busy && <PenguinTypingBubble name={state.profile.penguinName} profile={state.profile} />}

            {resource && !chatGuide && <Card>
              <Text style={s.heading}>{GUIDE_DEFINITIONS.find(g => g.id === resource)!.title}</Text>
              <Button onPress={() => onGuide(resource, 'learn')}>Learn the guide first</Button>
              <Button secondary onPress={() => onGuide(resource, 'use')}>Use the guide now</Button>
            </Card>}

            <ErrorText>{error}</ErrorText>
            {!!speechNotice && <Text style={s.small}>{speechNotice}</Text>}


          </ScrollView>
          {showJumpToLatest && <Pressable accessibilityRole="button" accessibilityLabel="Jump to latest message" onPress={jumpToLatest} style={{ position: 'absolute', right: 20, bottom: 16, width: 46, height: 46, borderRadius: 23, backgroundColor: color.blue, alignItems: 'center', justifyContent: 'center', elevation: 3 }}><Ionicons name="chevron-down" size={27} color={color.white} /></Pressable>}
          </View>

          <View style={{ padding: 16, backgroundColor: color.white, gap: 10, borderTopWidth: 1, borderTopColor: color.line }}>
            <Field label={`Message ${state.profile.penguinName}`} value={input} onChangeText={setInput} multiline editable={!busy && !preview && !checkIn && monitorFlow?.step !== 'confirm' && monitorFlow?.step !== 'choose_goal'} maxLength={3000} placeholder={preview ? 'Live coaching is unavailable in preview' : chatGuideChoosingDuration ? 'e.g. 15 minutes' : enterOwnDays ? 'e.g. Monday, Thursday, Friday' : 'Message your penguin or type another idea…'} />
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Pressable accessibilityRole="button" accessibilityLabel={listening ? 'Stop dictation' : 'Dictate message'} onPress={toggleDictation} disabled={busy || preview} style={{ padding: 12, borderRadius: 24, borderWidth: 1, borderColor: listening ? color.blue : color.line, backgroundColor: color.white }}>
                <Ionicons name={listening ? 'stop-circle-outline' : 'mic-outline'} size={25} color={listening ? color.blue : color.ink} />
              </Pressable>
              <View style={{ flex: 1 }}><Button busy={busy} disabled={preview || !input.trim() || !!checkIn || monitorFlow?.step === 'confirm' || monitorFlow?.step === 'choose_goal'} onPress={() => void send(input)}>Send message</Button></View>
            </View>
            {!!dictationNotice && <Text accessibilityRole="text" style={s.small}>{dictationNotice}</Text>}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
