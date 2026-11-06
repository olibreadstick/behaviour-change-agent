import React, { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppStore } from './store';
import { color, styles as s } from './theme';
import { Button, Card, Field } from './ui';

// Phase 4 / browser foreground reminder prototype.
// This does not deliver notifications while the browser/app is closed.
// Full delivery requires an approved push infrastructure and opt-in consent.
type Reminder = { enabled: boolean; time: string };
type Saved = Record<string, Reminder>;

export function RemindersAndExport({ participantId }: { participantId: string }) {
  const { state } = useAppStore();
  const [reminders, setReminders] = useState<Saved>({});
  const [includeChats, setIncludeChats] = useState(false);
  const [notice, setNotice] = useState('');
  const [loaded, setLoaded] = useState(false);
  const storageKey = `bca_reminder_prefs_${participantId}`;
  const activePlans = state.plans.filter(p => state.goals.some(g => g.id === p.goalId && g.confirmed && !g.completed));
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(storageKey).then(raw => {
      if (live && raw) {
        try { setReminders(JSON.parse(raw)); } catch { /* disregard invalid local preferences */ }
      }
    }).finally(() => { if (live) setLoaded(true); });
    return () => { live = false; };
  }, [storageKey]);
  useEffect(() => {
    if (loaded) void AsyncStorage.setItem(storageKey, JSON.stringify(reminders));
  }, [reminders, loaded, storageKey]);

  async function changeReminder(planId: string, enabled: boolean) {
    if (enabled && Platform.OS === 'web') {
      const NotificationAPI = (globalThis as any).Notification;
      if (!NotificationAPI) { setNotice('This browser does not support notifications.'); return; }
      const permission = NotificationAPI.permission === 'granted'
        ? 'granted' : await NotificationAPI.requestPermission();
      if (permission !== 'granted') { setNotice('Notifications are disabled in your browser. You can change permissions in browser settings.'); return; }
    }
    setReminders(previous => ({ ...previous, [planId]: { enabled, time: previous[planId]?.time || '18:00' } }));
    setNotice(enabled ? 'Reminder preference saved. Browser alerts work only while this page is open.' : 'Reminder disabled.');
  }
  // Browser foreground reminders are intentionally best-effort; one alert per plan/day.
  useEffect(() => {
    if (Platform.OS !== 'web' || !loaded) return;
    const sent = new Set<string>();
    const check = () => {
      const NotificationAPI = (globalThis as any).Notification;
      if (!NotificationAPI || NotificationAPI.permission !== 'granted') return;
      const now = new Date();
      const date = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      for (const plan of activePlans) {
        const preference = reminders[plan.id];
        if (!preference?.enabled || preference.time !== currentTime || sent.has(`${plan.id}:${date}`)) continue;
        sent.add(`${plan.id}:${date}`);
        try { new NotificationAPI('Your activity reminder', { body: 'You have a saved activity plan to revisit. Open your goals when you are ready.' }); }
        catch { /* permission may change */ }
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [reminders, loaded, state.plans, state.goals]);

  function exportParticipantData() {
    if (Platform.OS !== 'web') { setNotice('File download is currently supported on the web version.'); return; }
    // Intentionally exclude profile names and participant identifiers from export.
    // Chats can contain voluntarily disclosed identifying information; opt-in only.
    const payload = {
      export_version: 1,
      exported_at: new Date().toISOString(),
      goals: state.goals,
      action_plans: state.plans,
      activities: state.activities,
      reflections: state.reflections,
      completed_lessons: state.completedLessons,
      monitoring_plan: state.monitoring || null,
      reminders: Object.entries(reminders).map(([plan_id, preference]) => ({ plan_id, ...preference })),
      ...(includeChats ? { conversations: state.conversations.map(c => ({
        title: c.title,
        messages: c.messages.map(m => ({ role: m.role, text: m.text, createdAt: m.createdAt }))
      })) } : {}),
    };
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `my-activity-data-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice('Your data export was downloaded to this device.');
    } catch { setNotice('Unable to download the export in this browser.'); }
  }

  return <View style={{ gap: 16, marginTop: 24 }}>
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name="notifications-outline" size={24} color={color.blue} />
        <Text style={s.heading}>Activity reminders</Text>
      </View>
      <Text style={s.small}>Optional reminders for your saved action plans. Browser alerts currently work only while this page is open. The app does not yet send background or scheduled push notifications.</Text>
      {activePlans.length === 0 && <Text style={s.body}>Create an action plan to configure reminders.</Text>}
      {activePlans.map(plan => {
        const pref = reminders[plan.id] || { enabled: false, time: '18:00' };
        const goal = state.goals.find(g => g.id === plan.goalId);
        return <View key={plan.id} style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: color.line, gap: 10 }}>
          <Text style={[s.body, { fontWeight: '600' }]}>{goal?.goal || 'Activity plan'}</Text>
          <Text style={s.small}>Reminder cue in plan: {plan.cue || 'Not set'}</Text>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: pref.enabled }} onPress={() => void changeReminder(plan.id, !pref.enabled)} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <Ionicons name={pref.enabled ? 'checkbox' : 'square-outline'} size={24} color={color.blue} />
            <Text style={s.body}>{pref.enabled ? 'Reminders on' : 'Reminders off'}</Text>
          </Pressable>
          {pref.enabled && <Field label="Reminder time (24-hour HH:MM)" value={pref.time} onChangeText={value => {
            if (/^\d{0,2}:?\d{0,2}$/.test(value)) setReminders(previous => ({ ...previous, [plan.id]: { enabled: true, time: value } }));
          }} placeholder="18:00" />}
        </View>;
      })}
    </Card>
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name="download-outline" size={24} color={color.blue} />
        <Text style={s.heading}>Export my activity data</Text>
      </View>
      <Text style={s.small}>Download your goals, action plans, activity logs, and reflections as a JSON file. Your profile name and participant ID are not included.</Text>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: includeChats }} onPress={() => setIncludeChats(v => !v)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Ionicons name={includeChats ? 'checkbox' : 'square-outline'} size={24} color={color.blue}/>
        <Text style={[s.body, { flex: 1 }]}>Also include my chat messages (may contain personal information)</Text>
      </Pressable>
      <Button onPress={exportParticipantData}>Download my data</Button>
      <Text style={s.small}>This participant download is separate from the researcher/admin data export, which requires its own access controls and de-identification checks.</Text>
    </Card>
    {!!notice && <Text accessibilityRole="text" style={s.small}>{notice}</Text>}
  </View>;
}
