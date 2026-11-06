import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppStore } from './store';
import { color, styles as s } from './theme';
import { Button, Card, Field } from './ui';
import type { BuddyProfile } from './types';
// PNGs are served from mobile/public on Expo Web. Native Expo uses the packaged fallback.
const PENGUIN_WEB_IMAGES: Record<string, string> = {
  blue: '/behaviour-logo.png',
  green: '/penguin-green.png',
  pink: '/penguin-pink.png',
  purple: '/penguin-purple.png',
  red: '/penguin-red.png',
};
const nativePenguinImage = require('../assets/coach-penguin.png');
export const penguinImage = nativePenguinImage;


const COLOURS = [
  { id: 'blue', label: 'Blue', value: '#60A5FA' },
  { id: 'pink', label: 'Pink', value: '#F472B6' },
  { id: 'purple', label: 'Purple', value: '#A78BFA' },
  { id: 'green', label: 'Green', value: '#4ADE80' },
  { id: 'red', label: 'Red', value: '#EF4444' },
  { id: 'yellow', label: 'Yellow', value: '#FACC15' },
  { id: 'orange', label: 'Orange', value: '#FB923C' },
];
export function PenguinAvatar({ profile, size = 54 }: { profile: BuddyProfile; size?: number }) {
  const bodyColour = COLOURS.some(c => c.id === profile.penguinColour) ? profile.penguinColour : 'blue';
  const bowColour = COLOURS.some(c => c.id === profile.bowColour) ? profile.bowColour : 'red';
  // Match the 3D animated Pip used in chat, including the saved bow choice.
  // On native Expo, keep the bundled fallback until GIF assets are bundled natively.
  const image = Platform.OS === 'web'
    ? { uri: `/penguins/idle/penguin-${bodyColour}-bow-${bowColour}.gif` }
    : nativePenguinImage;
  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Image source={image} resizeMode="contain" style={{ width: size, height: size }} accessibilityLabel="Your customized penguin" />
  </View>;
}


export function PenguinHeader({ onCoach, onSettings, onClose }: { onCoach: () => void; onSettings?: () => void; onClose?: () => void }) {
  const { state } = useAppStore();
  return <View style={s.header}>
    <Pressable onPress={onCoach} accessibilityRole="button" accessibilityLabel={`Talk to ${state.profile.penguinName}`} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <PenguinAvatar profile={state.profile} size={48} />
      <View style={{ flex: 1 }}><Text style={s.heading}>{state.profile.penguinName}</Text><Text style={s.small}>Your behaviour change companion</Text></View>
    </Pressable>
    {onSettings && <Pressable onPress={onSettings} accessibilityRole="button" accessibilityLabel="Penguin and profile settings" style={{ padding: 12 }}><Ionicons name="settings-outline" size={24} color={color.ink} /></Pressable>}
    {onClose && <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={{ padding: 12 }}><Ionicons name="close" size={25} color={color.ink} /></Pressable>}
  </View>;
}


// Participant-controlled export: use an explicit allowlist instead of exporting
// the entire app store (which can contain profile details and synchronization IDs).
function buildParticipantExport(state: ReturnType<typeof useAppStore>['state'], includeChats: boolean) {
  const goalRefs = new Map(state.goals.map((goal, index) => [goal.id, `Goal ${index + 1}`]));
  const goalRef = (id: string | undefined) => id ? (goalRefs.get(id) || 'Unlinked goal') : null;
  const goals = state.goals.map((g, index) => ({
    reference: `Goal ${index + 1}`, goal: g.goal, completed: g.completed,
    weekStart: g.weekStart, createdAt: g.createdAt, revisions: g.revisions || [],
  }));
  const actionPlans = state.plans.map((p, index) => ({
    reference: `Plan ${index + 1}`, goal: goalRef(p.goalId), what: p.what,
    when: p.when, where: p.where, how: p.how, barrier: p.barrier,
    alternative: p.alternative, cue: p.cue, createdAt: p.createdAt,
    revisions: p.revisions || [],
  }));
  const monitoringPlans = (state.monitoringPlans || []).map((p, index) => ({
    reference: `Monitoring plan ${index + 1}`, goal: goalRef(p.goalId),
    what: p.what, how: p.how, when: p.when, frequency: p.frequency,
    stage: p.stage, createdAt: p.createdAt,
  }));
  const monitoringCheckIns = (state.monitoringCheckIns || []).map(c => ({
    goal: goalRef(c.goalId), note: c.note, date: c.date, createdAt: c.createdAt,
  }));
  const activities = state.activities.map(a => ({
    goal: goalRef(a.goalId), title: a.title, date: a.date, time: a.time,
    durationMinutes: a.durationMinutes, status: a.status,
  }));
  const reflections = state.reflections.map(r => ({ text: r.text, createdAt: r.createdAt }));
  // Exclude conversation IDs, session IDs, participant IDs and system context.
  const conversations = includeChats ? state.conversations.map((c, index) => ({
    reference: `Conversation ${index + 1}`,
    messages: c.messages.map(m => ({ role: m.role, text: m.text, createdAt: m.createdAt })),
  })) : undefined;
  return {
    formatVersion: 1, exportedAt: new Date().toISOString(),
    note: 'Personal progress export. Free-text fields may contain identifying details.',
    goals, actionPlans, monitoringPlans, monitoringCheckIns,
    activities, reflections,
    learning: { completedLessons: state.completedLessons },
    ...(state.monitoring ? { legacyMonitoringPlan: {
      what: state.monitoring.what, how: state.monitoring.how,
      when: state.monitoring.when, frequency: state.monitoring.frequency,
    } } : {}),
    ...(conversations ? { conversations } : {}),
  };
}

function downloadParticipantFile(filename: string, text: string, mime: string) {
  if (Platform.OS !== 'web') throw new Error('Downloads are currently available on the web version.');
  const browser = globalThis as any;
  if (!browser.document || !browser.Blob || !browser.URL?.createObjectURL) {
    throw new Error('Your browser does not support this download.');
  }
  const url = browser.URL.createObjectURL(new browser.Blob([text], { type: mime }));
  const link = browser.document.createElement('a');
  link.href = url;
  link.download = filename;
  browser.document.body.appendChild(link);
  try { link.click(); } finally {
    browser.document.body.removeChild(link);
    // Let the browser begin the download before releasing the temporary URL.
    browser.setTimeout(() => browser.URL.revokeObjectURL(url), 1000);
  }
}

function exportAsCsv(data: ReturnType<typeof buildParticipantExport>): string {
  const rows: Array<[string, string, string, string]> = [['Type', 'Reference', 'Date', 'Details']];
  const groups: Array<[string, Array<Record<string, any>>]> = [
    ['Goal', data.goals], ['Action plan', data.actionPlans],
    ['Monitoring plan', data.monitoringPlans], ['Monitoring check-in', data.monitoringCheckIns],
    ['Activity', data.activities], ['Reflection', data.reflections],
  ];
  groups.forEach(([type, items]) => items.forEach(item => {
    rows.push([type, String(item.reference || item.goal || ''), String(item.date || item.createdAt || ''), JSON.stringify(item)]);
  }));
  data.learning.completedLessons.forEach(lesson => rows.push(['Completed lesson', '', '', String(lesson)]));
  data.conversations?.forEach(c => c.messages.forEach(m => rows.push([
    'Chat message', c.reference, m.createdAt || '', JSON.stringify({ role: m.role, text: m.text }),
  ])));
  const cell = (value: string) => {
    // Prevent spreadsheet formula evaluation when CSV is opened in Excel/Sheets.
    const safe = /^[\s]*[=+@\-]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n');
}

export function PenguinSettings({ onboarding = false, onClose, onLogout }: { onboarding?: boolean; onClose: () => void; onLogout?: () => void }) {
  const { state, update, track } = useAppStore();
  const [name, setName] = useState(state.profile.displayName); const [pronouns, setPronouns] = useState(state.profile.pronouns); const [penguinName, setPenguinName] = useState(state.profile.penguinName);
  const [penguinColour, setPenguinColour] = useState(state.profile.penguinColour || 'blue');
  const [bowColour, setBowColour] = useState(state.profile.bowColour || 'red');
  const [includeChats, setIncludeChats] = useState(false);
  const [exportError, setExportError] = useState('');
  function downloadData(format: 'json' | 'csv') {
    try {
      setExportError('');
      const snapshot = buildParticipantExport(state, includeChats);
      const stamp = new Date().toISOString().slice(0, 10);
      if (format === 'json') {
        downloadParticipantFile(`my-progress-${stamp}.json`, JSON.stringify(snapshot, null, 2), 'application/json;charset=utf-8');
      } else {
        downloadParticipantFile(`my-progress-${stamp}.csv`, exportAsCsv(snapshot), 'text/csv;charset=utf-8');
      }
      track('participant_export_downloaded', { format, includesChat: includeChats });
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Unable to export your data.');
    }
  }

  function save(skip = false) {
    update(st => ({ ...st, profile: { displayName: skip ? '' : name.trim(), pronouns: skip ? '' : pronouns.trim(), penguinName: skip ? 'Pip' : penguinName.trim() || 'Pip', onboarded: true, penguinColour: skip ? 'blue' : penguinColour, glassesColour: 'none', bowColour: skip ? 'blue' : bowColour } }));
    track('buddy_profile_updated'); onClose();
  }
  return <SafeAreaView style={s.modal}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={s.header}><PenguinAvatar profile={{ ...state.profile, penguinColour, bowColour }} size={55} /><Text style={[s.heading, { flex: 1 }]}>{onboarding ? 'Meet your buddy' : 'Your penguin & you'}</Text>{!onboarding && <Button secondary onPress={onClose}>Done</Button>}</View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <View style={{ alignSelf: 'center' }}><PenguinAvatar profile={{ ...state.profile, penguinColour, bowColour }} size={130} /></View>
      <Text style={s.title}>{onboarding ? 'A little company for your journey.' : 'Make this space yours.'}</Text><Text style={s.body}>Your penguin learns alongside you, celebrates your effort, and helps you find your next small step.</Text>
      <Card><Field label="What would you like to be called? (optional)" value={name} onChangeText={setName} maxLength={60} />
        <Field label="Your pronouns (optional)" value={pronouns} onChangeText={setPronouns} maxLength={60} placeholder="For example, she/her, he/him, or they/them" />
        <Field label="What is your penguin’s name?" value={penguinName} onChangeText={setPenguinName} maxLength={30} placeholder="Pip" />
        <Text style={[s.heading, { marginTop: 14 }]}>Penguin colour</Text>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          {COLOURS.map(c => <Pressable key={c.id} accessibilityRole="radio" accessibilityState={{ checked: penguinColour === c.id }} accessibilityLabel={`${c.label} penguin`} onPress={() => setPenguinColour(c.id)} style={{ alignItems: 'center', gap: 5 }}><View style={{ width: 40, height: 40, backgroundColor: c.value, borderRadius: 22, borderWidth: penguinColour === c.id ? 3 : 1, borderColor: penguinColour === c.id ? color.ink : color.line }} /><Text style={s.small}>{c.label}</Text></Pressable>)}
        </View>
        <Text style={s.heading}>Bow colour</Text>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          {COLOURS.map(c => <Pressable key={c.id} accessibilityRole="radio" accessibilityState={{ checked: bowColour === c.id }} accessibilityLabel={`${c.label} bow`} onPress={() => setBowColour(c.id)} style={{ alignItems: 'center', gap: 5 }}><View style={{ width: 40, height: 40, backgroundColor: c.value, borderRadius: 8, borderWidth: bowColour === c.id ? 3 : 1, borderColor: bowColour === c.id ? color.ink : color.line }} /><Text style={s.small}>{c.label}</Text></Pressable>)}
        </View>
        <Text style={s.small}>You can change these anytime. They personalize your coaching.</Text><Button onPress={() => save()}>{onboarding ? 'Meet my penguin' : 'Save preferences'}</Button>
        
      </Card>
      {!onboarding && <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Ionicons name="download-outline" size={23} color={color.blue} />
          <Text style={s.heading}>Export my data</Text>
        </View>
        <Text style={s.body}>Save a copy of your goals, action plans, activity records, self-monitoring, reflections and learning progress.</Text>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: includeChats }}
          accessibilityLabel="Include chat conversations in my export"
          onPress={() => setIncludeChats(current => !current)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}>
          <Ionicons name={includeChats ? 'checkbox' : 'square-outline'} size={23} color={color.blue} />
          <Text style={[s.body, { flex: 1 }]}>Include chat conversations (optional)</Text>
        </Pressable>
        <Text style={s.small}>Your account name, participant ID, and login details are not included. Text you wrote yourself may still contain personal information. Keep your downloaded file private.</Text>
        <Button onPress={() => downloadData('json')}>Download JSON</Button>
        <Button secondary onPress={() => downloadData('csv')}>Download CSV</Button>
        {!!exportError && <Text accessibilityRole="alert" style={[s.small, { color: '#B42318' }]}>{exportError}</Text>}
      </Card>}
      {onLogout && <Button secondary onPress={onLogout}>Sign out</Button>}
    </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
