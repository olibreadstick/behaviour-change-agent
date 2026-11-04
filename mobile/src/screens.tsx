import React, { useEffect, useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { loadCommunity, sharePost } from './api';
import { useAppStore, uuid } from './store';
import { awardHomework, completeActivity, completeGoal, confirmedGoal, energyEarned, localDate, monday, validActivity } from './domain';
import { GUIDE_DEFINITIONS } from './guide-engine.cjs';
import { AskCoach, CommunityPost, GuideId } from './types';
import { color, styles as s } from './theme';
import { Button, Card, ErrorText, Field } from './ui';
type GuideStarter = (id: GuideId, mode: 'learn' | 'use') => void;
const definition = (id: GuideId) => GUIDE_DEFINITIONS.find(g => g.id === id)!;
const coachImage = require('../assets/coach-penguin.png');
const explainError = (e: unknown) => e instanceof Error ? e.message : 'Unable to complete this request.';
export function Today({ onGuide, onCoach, onResume }: { onGuide: GuideStarter; onCoach: AskCoach; onResume: () => void }) {
  const { state } = useAppStore(); const goal = confirmedGoal(state);
  const goalPlan = goal ? state.plans.find(plan => plan.goalId === goal.id) : undefined;
  const nextGuide = GUIDE_DEFINITIONS.find(g => !state.completedLessons.includes(g.id)) || GUIDE_DEFINITIONS[0];
  const todays = state.activities.filter(a => a.date === localDate());
  return <><Text style={s.eyebrow}>{state.profile.displayName ? `Hello, ${state.profile.displayName}` : 'Your daily companion'}</Text><Text style={s.title}>Small steps,{ '\n' }together.</Text>
    <Card><Image source={coachImage} style={{ width: 140, height: 140, alignSelf: 'center' }} resizeMode="contain" /><Text style={[s.heading, { textAlign: 'center' }]}>How are things today?</Text><Text style={s.body}>{state.profile.penguinName} is here to help you learn, make a plan, or work through a difficult moment.</Text><Button onPress={() => onCoach()}>Check in with my penguin</Button></Card>
    {state.guide && <Card><Text style={s.eyebrow}>Pick up where you left off</Text><Text style={s.heading}>{definition(state.guide.guide_id).title}</Text><Button onPress={onResume}>Continue your guide</Button></Card>}
    <Card><Text style={s.eyebrow}>Your current goal</Text><Text style={s.body}>{goal?.goal || 'Choose a goal that matters to you and fits your circumstances.'}</Text>{goal && <Button secondary onPress={() => onCoach({ kind: 'goal_support', goalId: goal.id, subject: goal.goal, prompt: `Help me with my goal: ${goal.goal}` })}>Talk about this goal</Button>}<Button secondary onPress={() => onGuide('goal_setting', 'use')}>{goal ? 'Work on a new goal' : 'Set a goal with my penguin'}</Button></Card>
    {goal && !goalPlan && <Card><Text style={s.eyebrow}>Your next step</Text><Text style={s.heading}>Turn your goal into a plan</Text><Text style={s.body}>Your goal is saved. Now choose the missing details, such as when and where it will happen and what you can do if something gets in the way.</Text><Button onPress={() => onGuide('action_planning_problem_solving', 'use')}>Build my action plan</Button></Card>}
    <Card><Text style={s.eyebrow}>Your learning path</Text><Text style={s.heading}>{nextGuide.title}</Text><Text style={s.body}>{nextGuide.subtitle}</Text><Button onPress={() => onGuide(nextGuide.id, 'learn')}>Try a short lesson</Button></Card>
    {!!todays.length && <Card><Text style={s.heading}>On your plan today</Text>{todays.map(a => <Text key={a.id} style={s.body}>{a.time} · {a.title}{a.status === 'completed' ? ' · Completed' : ''}</Text>)}</Card>}
    <HomeworkSummary />
    <Text style={s.small}>You can return, revise, and start again whenever you need.</Text></>;
}
export function Learn({ onGuide, onResume }: { onGuide: GuideStarter; onResume: () => void }) {
  const { state, track } = useAppStore(); const [error, setError] = useState('');
  async function openResource(id: GuideId | 'self_talk') { try { const origin = Platform.OS === 'web' ? window.location.origin : 'https://behaviour-change-agent.vercel.app'; await Linking.openURL(`${origin}/resources/${id === 'self_talk' ? 'talking-to-yourself-about-physical-activity.pdf' : definition(id).resource}`); track('resource_opened', { resource: id, source: 'learn' }); } catch (e) { setError(explainError(e)); } }
  return <><Text style={s.eyebrow}>Learn · practise · make it yours</Text><Text style={s.title}>Your learning path</Text><Text style={s.body}>Choose a short lesson or apply a guide directly. Every guide is available at your own pace.</Text>
    <ErrorText>{error}</ErrorText>{state.guide && <Button secondary onPress={onResume}>Resume your current guide</Button>}
    <View style={s.path}>{GUIDE_DEFINITIONS.map((g, i) => <Card key={g.id}><View style={s.row}><View style={s.badge}><Text style={s.heading}>{state.completedLessons.includes(g.id) ? '✓' : i + 1}</Text></View><View style={{ flex: 1 }}><Text style={s.heading}>{g.title}</Text><Text style={s.small}>{g.subtitle}</Text></View></View>
      <Text style={s.small}>{g.lessons.length} short steps{state.completedLessons.includes(g.id) ? ' · Practised' : ''}</Text>
      <Button onPress={() => onGuide(g.id, 'learn')}>Learn the guide first</Button><Button secondary onPress={() => onGuide(g.id, 'use')}>Use the guide now</Button><Button secondary onPress={() => void openResource(g.id)}>Read the original guide</Button></Card>)}</View><Card><Text style={s.heading}>Talking to yourself about physical activity</Text><Text style={s.body}>Explore self-praise and compassionate ways to reframe a difficult moment.</Text><Button secondary onPress={() => void openResource('self_talk')}>Read the self-talk resource</Button></Card></>;
}
export function MyPlan({ onGuide, onCoach }: { onGuide: GuideStarter; onCoach: AskCoach }) {
  const { state, update, track } = useAppStore();
  const goal = confirmedGoal(state);

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(localDate());
  const [time, setTime] = useState('18:00');
  const [duration, setDuration] = useState('15');
  const [error, setError] = useState('');

  const [week, setWeek] = useState(monday());
  const [selectedDate, setSelectedDate] = useState(localDate());

  const [schedulingPlanId, setSchedulingPlanId] = useState<string | null>(null);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDuration, setScheduleDuration] = useState('15');
  const [scheduleRows, setScheduleRows] = useState<Array<{ date: string; time: string }>>([]);
  const [scheduleError, setScheduleError] = useState('');

  const dayAt = (offset: number) => {
    const [y, m, d] = week.split('-').map(Number);
    return new Date(y, m - 1, d + offset);
  };

  const changeWeek = (offset: number) => {
    const next = localDate(dayAt(offset));
    setWeek(next);
    setSelectedDate(next);
    setDate(next);
  };

  const selectDay = (next: string) => {
    setSelectedDate(next);
    setDate(next);
  };

  const durationFrom = (text: string) => {
    const minutes = text.match(/\b(\d+)\s*(?:minute|min)s?\b/i)?.[1];
    if (minutes) return minutes;

    const hours = text.match(/\b(\d+(?:\.\d+)?)\s*(?:hour|hr)s?\b/i)?.[1];
    if (hours) return String(Math.round(Number(hours) * 60));

    return '15';
  };

  const frequencyFrom = (text: string) => {
    const lower = text.toLowerCase();

    if (/\bevery\s+day\b|\bdaily\b/.test(lower)) return 7;
    if (/\bonce\s+(?:this|a|per)?\s*week\b/.test(lower)) return 1;
    if (/\btwice\s+(?:this|a|per)?\s*week\b/.test(lower)) return 2;

    const wordNumbers: Record<string, number> = {
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
    };

    const numeric = lower.match(/\b([1-7])\s*(?:times?|x)\s*(?:this|a|per)?\s*week\b/);
    if (numeric) return Number(numeric[1]);

    const word = lower.match(/\b(one|two|three|four|five|six|seven)\s+times?\s+(?:this|a|per)?\s*week\b/);
    if (word) return wordNumbers[word[1]];

    return 1;
  };

  const timeFrom = (text: string) => {
    const twentyFourHour = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (twentyFourHour) {
      return `${twentyFourHour[1].padStart(2, '0')}:${twentyFourHour[2]}`;
    }

    const amPm = text.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)\b/i);
    if (!amPm) return '18:00';

    let hour = Number(amPm[1]);
    const minute = amPm[2] || '00';
    const period = amPm[3].toLowerCase();

    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;

    return `${String(hour).padStart(2, '0')}:${minute}`;
  };

  const weekdayDatesFrom = (text: string) => {
    const weekdayNames = [
      ['monday', 0],
      ['tuesday', 1],
      ['wednesday', 2],
      ['thursday', 3],
      ['friday', 4],
      ['saturday', 5],
      ['sunday', 6],
    ] as const;

    return weekdayNames
      .filter(([name]) => new RegExp(`\\b${name}\\b`, 'i').test(text))
      .map(([, offset]) => localDate(dayAt(offset)));
  };

  const activityTitleFrom = (text: string) => {
    const cleaned = text
      .replace(/\bfor\s+\d+(?:\.\d+)?\s*(?:minutes?|mins?|hours?|hrs?)\b/gi, '')
      .replace(/\b(?:once|twice|[1-7]\s+times?|one\s+time|two\s+times?|three\s+times?|four\s+times?|five\s+times?|six\s+times?|seven\s+times?)\s+(?:this|a|per)?\s*week\b/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/[,.]+$/, '')
      .trim();

    return cleaned || text.trim();
  };

  const defaultDatesFor = (count: number) => {
    const today = new Date();
    const thisWeek = monday(today) === week;
    const todayOffset = (today.getDay() + 6) % 7;
    const firstOffset = thisWeek ? todayOffset : 0;
    const available = Array.from({ length: 7 - firstOffset }, (_, i) => firstOffset + i);

    if (count >= available.length) {
      return available.map(offset => localDate(dayAt(offset)));
    }

    if (count === 1) return [localDate(dayAt(firstOffset))];

    return Array.from({ length: count }, (_, i) => {
      const index = Math.round((i * (available.length - 1)) / (count - 1));
      return localDate(dayAt(available[index]));
    });
  };

  function addActivity() {
    if (!validActivity(title, date, time, duration)) {
      setError('Enter an activity, a valid date (YYYY-MM-DD), time (HH:MM), and duration between 1 and 1440 minutes.');
      return;
    }

    const id = uuid();
    update(st => ({
      ...st,
      activities: [
        ...st.activities,
        {
          id,
          title: title.trim(),
          date,
          time,
          durationMinutes: Number(duration),
          status: 'planned',
          goalId: goal?.id,
        },
      ],
    }));

    track('calendar_activity_added', {
      activityId: id,
      scheduledDate: date,
      durationMinutes: Number(duration),
    });

    setAdding(false);
    setTitle('');
    setError('');
  }

  function openPlanScheduler(plan: typeof state.plans[number]) {
    const linkedGoal = state.goals.find(g => g.id === plan.goalId);
    const sourceText = `${plan.what} ${linkedGoal?.goal || ''}`;
    const weekdayDates = weekdayDatesFrom(plan.when);
    const occurrenceCount = Math.max(frequencyFrom(linkedGoal?.goal || ''), weekdayDates.length, 1);
    const inferredTime = timeFrom(plan.when);
    const defaults = defaultDatesFor(occurrenceCount);

    const rows = Array.from({ length: occurrenceCount }, (_, index) => ({
      date: weekdayDates[index] || defaults[index] || selectedDate,
      time: inferredTime,
    }));

    setSchedulingPlanId(plan.id);
    setScheduleTitle(activityTitleFrom(plan.what));
    setScheduleDuration(durationFrom(sourceText));
    setScheduleRows(rows);
    setScheduleError('');
  }

  function updateScheduleRow(index: number, field: 'date' | 'time', value: string) {
    setScheduleRows(rows => rows.map((row, i) => i === index ? { ...row, [field]: value } : row));
  }

  function addScheduleRow() {
    const previous = scheduleRows[scheduleRows.length - 1];
    setScheduleRows(rows => [
      ...rows,
      {
        date: previous?.date || selectedDate,
        time: previous?.time || '18:00',
      },
    ]);
  }

  function removeScheduleRow(index: number) {
    setScheduleRows(rows => rows.filter((_, i) => i !== index));
  }

  function savePlanSchedule(planId: string) {
    const plan = state.plans.find(p => p.id === planId);
    if (!plan) {
      setScheduleError('This plan is unavailable.');
      return;
    }

    const cleanTitle = scheduleTitle.trim();
    if (!scheduleRows.length) {
      setScheduleError('Add at least one date and time.');
      return;
    }

    for (const row of scheduleRows) {
      if (!validActivity(cleanTitle, row.date, row.time, scheduleDuration)) {
        setScheduleError('Check each date and time, and enter a duration between 1 and 1440 minutes.');
        return;
      }
    }

    const existingKeys = new Set(
      state.activities.map(a => `${a.title.trim().toLowerCase()}|${a.date}|${a.time}`)
    );

    const newActivities = scheduleRows.flatMap(row => {
      const duplicateKey = `${cleanTitle.toLowerCase()}|${row.date}|${row.time}`;
      if (existingKeys.has(duplicateKey)) return [];
      existingKeys.add(duplicateKey);

      return [{
        id: uuid(),
        title: cleanTitle,
        date: row.date,
        time: row.time,
        durationMinutes: Number(scheduleDuration),
        status: 'planned' as const,
        goalId: plan.goalId,
      }];
    });

    if (!newActivities.length) {
      setScheduleError('Those activities are already on your calendar.');
      return;
    }

    update(st => ({
      ...st,
      activities: [...st.activities, ...newActivities],
    }));

    newActivities.forEach(activity => {
      track('calendar_activity_added', {
        activityId: activity.id,
        scheduledDate: activity.date,
        durationMinutes: activity.durationMinutes,
        source: 'action_plan',
        planId,
      });
    });

    const first = newActivities.slice().sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];
    if (first) {
      setSelectedDate(first.date);
      setDate(first.date);
      const [year, month, day] = first.date.split('-').map(Number);
      setWeek(monday(new Date(year, month - 1, day)));
    }

    setSchedulingPlanId(null);
    setScheduleRows([]);
    setScheduleError('');
  }

  return <>
    <Text style={s.eyebrow}>Calendar · action planning</Text>
    <Text style={s.title}>A plan that fits you</Text>
    <Text style={s.body}>Turn your goal into small steps. Your penguin can help you plan around barriers and adapt when things change.</Text>

    <Card>
      <Text style={s.eyebrow}>Your goals</Text>
      {state.goals.length ? state.goals.map(g => <View key={g.id} style={{ gap: 8 }}>
        <Text style={s.body}>{g.goal}{g.completed ? ' · Completed' : ''}</Text>
        <Button secondary onPress={() => onCoach({
          kind: g.completed ? 'goal_completed' : 'goal_review',
          goalId: g.id,
          subject: g.goal,
          prompt: g.completed
            ? `I completed my goal: ${g.goal}. Help me reflect on what worked and choose a next step.`
            : `Give me feedback on my goal: ${g.goal}. What works well and what could I make clearer or more realistic?`,
        })}>
          {g.completed ? 'Reflect on this achievement' : 'Get my penguin’s feedback'}
        </Button>
        <Button secondary onPress={() => {
          update(st => completeGoal(st, g.id));
          track(g.completed ? 'goal_reopened' : 'goal_completed', { goalId: g.id });
        }}>
          {g.completed ? 'Reopen goal' : 'Mark goal completed'}
        </Button>
      </View>) : <Text style={s.body}>Start with a meaningful goal.</Text>}
      <Button onPress={() => onGuide('goal_setting', 'use')}>Set a goal</Button>
    </Card>

    {state.plans.map(p => <React.Fragment key={p.id}>
      <Card>
        <Text style={s.heading}>{p.what}</Text>
        <Text style={s.body}>{p.when}{'\n'}{p.where}{'\n'}{p.how}</Text>
        <Text style={s.small}>If {p.barrier}, then {p.alternative}.{'\n'}Reminder: {p.cue}</Text>
        <Button secondary onPress={() => onCoach({
          kind: 'plan_support',
          planId: p.id,
          goalId: p.goalId,
          subject: p.what,
          prompt: `Help me adapt my action plan for ${p.what}, including my barrier and alternative.`,
        })}>
          Talk through this plan
        </Button>
        <Button secondary onPress={() => openPlanScheduler(p)}>
          Schedule this plan
        </Button>
      </Card>

      {schedulingPlanId === p.id && <Card>
        <Text style={s.eyebrow}>Add this plan to your calendar</Text>
        <Text style={s.heading}>Choose the actual dates and times</Text>
        <Text style={s.body}>
          I used your goal and action plan to prepare the schedule below. You can change any date or time before saving.
        </Text>

        <Field label="Activity" value={scheduleTitle} onChangeText={setScheduleTitle} />
        <Field
          label="Duration in minutes"
          value={scheduleDuration}
          onChangeText={setScheduleDuration}
          keyboardType="numeric"
        />

        {scheduleRows.map((row, index) => <View key={`${p.id}-schedule-${index}`} style={{ gap: 8 }}>
          <Text style={s.heading}>Occurrence {index + 1}</Text>
          <Field
            label={`Date ${index + 1} (YYYY-MM-DD)`}
            value={row.date}
            onChangeText={value => updateScheduleRow(index, 'date', value)}
          />
          <Field
            label={`Time ${index + 1} (HH:MM)`}
            value={row.time}
            onChangeText={value => updateScheduleRow(index, 'time', value)}
          />
          {scheduleRows.length > 1 && <Button secondary onPress={() => removeScheduleRow(index)}>
            Remove this occurrence
          </Button>}
        </View>)}

        <Button secondary onPress={addScheduleRow}>Add another occurrence</Button>
        <ErrorText>{scheduleError}</ErrorText>
        <Button onPress={() => savePlanSchedule(p.id)}>
          Save {scheduleRows.length} {scheduleRows.length === 1 ? 'activity' : 'activities'} to calendar
        </Button>
        <Button secondary onPress={() => {
          setSchedulingPlanId(null);
          setScheduleRows([]);
          setScheduleError('');
        }}>
          Cancel
        </Button>
      </Card>}
    </React.Fragment>)}

    <Button secondary onPress={() => onGuide('action_planning_problem_solving', 'use')}>Build an action plan</Button>

    {state.monitoring && <Card>
      <Text style={s.heading}>Your self-monitoring plan</Text>
      <Text style={s.body}>{state.monitoring.what}{'\n'}Record with: {state.monitoring.how}{'\n'}When: {state.monitoring.when}{'\n'}Review: {state.monitoring.frequency}</Text>
    </Card>}

    <Button secondary onPress={() => onGuide('self_monitoring', 'use')}>Set up self-monitoring</Button>

    <Text style={s.heading}>Your activity calendar</Text>
    <View style={s.row}>
      <Button secondary onPress={() => changeWeek(-7)}>Previous week</Button>
      <Button secondary onPress={() => changeWeek(7)}>Next week</Button>
    </View>
    <Text style={s.small}>Week of {dayAt(0).toLocaleDateString()}</Text>

    <View style={{ flexDirection: 'row', gap: 4 }}>
      {Array.from({ length: 7 }, (_, i) => {
        const d = dayAt(i);
        const key = localDate(d);
        const selected = selectedDate === key;
        return <Pressable
          key={key}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={`${d.toLocaleDateString()}, ${state.activities.filter(a => a.date === key).length} activities`}
          onPress={() => selectDay(key)}
          style={{
            flex: 1,
            minHeight: 64,
            borderRadius: 12,
            paddingVertical: 8,
            alignItems: 'center',
            backgroundColor: selected ? color.blue : color.white,
          }}
        >
          <Text style={[s.small, { color: selected ? color.white : color.muted }]}>
            {d.toLocaleDateString(undefined, { weekday: 'narrow' })}
          </Text>
          <Text style={[s.body, { color: selected ? color.white : color.ink }]}>{d.getDate()}</Text>
          <Text style={{ fontSize: 10, color: selected ? color.white : color.green }}>
            {state.activities.some(a => a.date === key) ? '●' : ' '}
          </Text>
        </Pressable>;
      })}
    </View>

    <Text style={s.small}>{selectedDate}</Text>
    {!state.activities.some(a => a.date === selectedDate) && <Text style={s.body}>A little room for a small step—or a rest.</Text>}

    {state.activities
      .filter(a => a.date === selectedDate)
      .sort((a, b) => a.time.localeCompare(b.time))
      .map(a => <Card key={a.id}>
        <Text style={s.heading}>{a.title}</Text>
        <Text style={s.small}>{a.date} · {a.time} · {a.durationMinutes} min</Text>
        <Button secondary onPress={() => onCoach({
          kind: 'activity_support',
          activityId: a.id,
          goalId: a.goalId,
          subject: a.title,
          prompt: a.status === 'completed'
            ? `I completed ${a.title}. Help me reflect on how it went.`
            : `Help me prepare for ${a.title} on ${a.date} at ${a.time}, and think through possible barriers.`,
        })}>
          Ask my penguin about this activity
        </Button>
        <Button secondary onPress={() => {
          update(st => completeActivity(st, a.id));
          track(a.status === 'planned' ? 'calendar_activity_completed' : 'calendar_activity_reopened', { activityId: a.id });
        }}>
          {a.status === 'completed'
            ? 'Completed · reopen'
            : state.homeworkAwards.some(award => award.id === `activity:${a.id}`)
              ? 'Mark completed'
              : 'Mark completed · +15 energy'}
        </Button>
      </Card>)}

    <Button onPress={() => setAdding(!adding)}>
      {adding ? 'Close activity form' : 'Schedule an activity'}
    </Button>

    {adding && <Card>
      <Field label="Activity" value={title} onChangeText={setTitle} />
      <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      <Field label="Time (HH:MM)" value={time} onChangeText={setTime} />
      <Field label="Duration in minutes" value={duration} onChangeText={setDuration} keyboardType="numeric" />
      <ErrorText>{error}</ErrorText>
      <Button onPress={addActivity}>Save activity</Button>
    </Card>}

    <Button secondary onPress={() => onCoach({
      kind: 'plan_support',
      prompt: 'Help me turn my current goal into an action plan that fits my circumstances.',
    })}>
      Plan with my penguin
    </Button>
  </>;
}
export function ReflectionPanel({ onCoach }: { onCoach: AskCoach }) {
  const { state, update, track } = useAppStore(); const [reflection, setReflection] = useState('');
  function submit() { const id = uuid(); update(st => awardHomework({ ...st, reflections: [...st.reflections, { id, text: reflection.trim(), createdAt: new Date().toISOString() }] }, 'reflection', id, 'A moment of reflection')); track('reflection_saved'); setReflection(''); }
  return <><Card><Text style={s.heading}>A moment to reflect</Text><Text style={s.body}>What helped? What felt difficult? Noticing either is worthwhile.</Text><Field label="Your reflection" value={reflection} onChangeText={setReflection} multiline maxLength={3000} /><Button disabled={!reflection.trim()} onPress={submit}>Submit reflection · +5 energy</Button></Card>
    {state.reflections.slice(-5).reverse().map(r => <Card key={r.id}><Text style={s.small}>{new Date(r.createdAt).toLocaleDateString()}</Text><Text style={s.body}>{r.text}</Text><Button secondary onPress={() => onCoach({ kind: 'reflection', subject: r.text, prompt: `Help me reflect on this and find a compassionate next step: ${r.text}` })}>Discuss this with my penguin</Button></Card>)}</>;
}
export function HomeworkSummary() {
  const { state } = useAppStore();
  return <Card><Text style={s.eyebrow}>Your penguin’s energy</Text><Text style={s.title}>{energyEarned(state)} energy</Text><Text style={s.body}>Both guide exercises and real-world activities count as homework. Reflections count too.</Text><Text style={s.small}>{state.completedLessons.length} of 3 guides practised · {state.homeworkAwards.length} homework submissions</Text><View style={s.progressTrack}><View style={[s.progressFill, { width: `${state.completedLessons.length / 3 * 100}%` }]} /></View>{state.homeworkAwards.slice(-4).reverse().map(a => <View key={a.id} style={s.row}><Text style={[s.small, { flex: 1 }]}>{a.label}</Text><Text style={[s.small, { color: color.green }]}>+{a.energy}</Text></View>)}</Card>;
}
export function Community({ participantId, preview, onCoach }: { participantId: string; preview: boolean; onCoach: AskCoach }) {
  const { track } = useAppStore(); const [posts, setPosts] = useState<CommunityPost[]>([]); const [concept, setConcept] = useState(GUIDE_DEFINITIONS[0].title); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [barrier, setBarrier] = useState('');
  useEffect(() => { if (!preview) loadCommunity().then(setPosts).catch(e => setError(explainError(e))); }, []);
  async function share() { setBusy(true); setError(''); try { const p = { id: uuid(), concept, text: text.trim(), createdAt: new Date().toISOString(), authorId: participantId }; await sharePost(p); setPosts([p, ...posts]); setText(''); track('community_post_created', { concept }); } catch (e) { setError(explainError(e)); } finally { setBusy(false); } }
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}><Text style={s.eyebrow}>Community · problem solving</Text><Text style={s.title}>Find a way forward</Text><Card><Text style={s.heading}>What is getting in the way?</Text><Field label="A barrier you’d like help with" value={barrier} onChangeText={setBarrier} multiline maxLength={1000} /><Button disabled={!barrier.trim()} onPress={() => onCoach({ kind: 'plan_support', subject: barrier, prompt: `Help me problem-solve this barrier and consider practical alternatives: ${barrier}` })}>Problem-solve with my penguin</Button></Card>
    <Text style={s.body}>Share a tip you choose to make visible to other participants.</Text><Card><Text style={s.heading}>Which guide is your tip about?</Text>{GUIDE_DEFINITIONS.map(g => <Button secondary={concept !== g.title} key={g.id} onPress={() => setConcept(g.title)}>{g.title}</Button>)}<Field label="Your tip" value={text} onChangeText={setText} multiline maxLength={2000} /><Button busy={busy} disabled={preview || !text.trim()} onPress={() => void share()}>Share with the community</Button>{preview && <Text style={s.small}>Community sharing is available with a connected participant account.</Text>}</Card>
    <ErrorText>{error}</ErrorText>{posts.map(p => <Card key={p.id}><Text style={s.eyebrow}>{p.concept}</Text><Text style={s.body}>{p.text}</Text><Button secondary onPress={() => onCoach({ kind: 'community_tip', subject: p.text, prompt: `Help me decide whether this community tip fits my goal and circumstances: ${p.text}` })}>Explore this tip with my penguin</Button></Card>)}
  </ScrollView>;
}
