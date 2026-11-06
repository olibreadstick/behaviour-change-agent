import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppStore } from './store';
import { completeGoal } from './domain';
import { AskCoach, Goal, GuideId } from './types';
import { GUIDE_DEFINITIONS } from './guide-engine.cjs';
import { color, styles as s } from './theme';
import { Button } from './ui';
import { PenguinAvatar } from './Penguin';

type OpenGuide = (id: GuideId, mode: 'learn' | 'use') => void;
const separator = <View style={{ height: 1, backgroundColor: color.line }} />;

function MenuAction({ icon, title, detail, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail?: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 14 }}>
    <Ionicons name={icon} size={23} color={color.blue} />
    <View style={{ flex: 1 }}><Text style={[s.body, { fontWeight: '600' }]}>{title}</Text>{detail && <Text style={s.small}>{detail}</Text>}</View>
    <Ionicons name="chevron-forward" size={18} color={color.muted} />
  </Pressable>;
}

type GoalEvent = { id: string; date: string; title: string; description: string };

const formatGoalDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

function GoalDetails({ goal, onBack, onCoach }: { goal: Goal; onBack: () => void; onCoach: AskCoach }) {
  const { state } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const plans = state.plans.filter(p => p.goalId === goal.id);
  const events: GoalEvent[] = [
    { id: `created-${goal.id}`, date: goal.createdAt, title: `Added ${goal.goal}`, description: goal.meaning ? `Goal created: ${goal.meaning}` : `Goal created: ${goal.goal}` },
    ...(goal.revisions || []).map((revision, i) => ({ id: `goal-revision-${i}`, date: revision.changedAt, title: 'Updated goal', description: `Changed from “${revision.previous}” to “${revision.next}”.` })),
    ...plans.flatMap(plan => [
      { id: `plan-${plan.id}`, date: plan.createdAt, title: 'Created action plan', description: [plan.what, plan.when && `When: ${plan.when}`, plan.where && `Where: ${plan.where}`, plan.how && `How: ${plan.how}`, plan.barrier && `Possible barrier: ${plan.barrier}`, plan.alternative && `Backup: ${plan.alternative}`, plan.cue && `Reminder: ${plan.cue}`].filter(Boolean).join(' · ') },
      ...(plan.revisions || []).map((revision, i) => {
        let description = `Action plan revised.`;
        try {
          const before = JSON.parse(revision.previous);
          const after = JSON.parse(revision.next);
          if (before.when !== after.when) description = `Schedule: ${before.when || 'Unspecified'} → ${after.when || 'Unspecified'}.`;
          if (before.what !== after.what) description += ` Activity: ${after.what}.`;
        } catch {
          description = `Changed from “${revision.previous}” to “${revision.next}”.`;
        }
        return { id: `plan-revision-${plan.id}-${i}`, date: revision.changedAt, title: 'Action plan adjusted with goal', description };
      }),
    ]),
    ...(state.monitoringPlans || []).filter(m => m.goalId === goal.id).map(m => ({ id: `monitoring-plan-${m.id}`, date: m.createdAt, title: 'Self-monitoring plan created', description: `Track: ${m.what} · Method: ${m.how} · When: ${m.when} · Review: ${m.frequency}` })),
    ...(state.monitoringCheckIns || []).filter(m => m.goalId === goal.id).map(m => ({ id: `monitoring-check-${m.id}`, date: m.createdAt, title: 'Self-monitoring check-in', description: m.note })),
    ...state.activities.filter(a => a.goalId === goal.id).map(activity => ({ id: `activity-${activity.id}`, date: activity.date, title: activity.title, description: activity.status === 'completed' ? 'Activity completed' : 'Activity planned' })),
    ...(goal.statusHistory?.length ? goal.statusHistory.map((change, i) => ({ id: `status-${goal.id}-${i}`, date: change.changedAt, title: change.completed ? 'Completed goal' : 'Reopened goal', description: change.completed ? 'Moved to Completed Goals.' : 'Moved back to Active Goals.' })) : goal.completedAt ? [{ id: `completed-${goal.id}`, date: goal.completedAt, title: 'Completed goal', description: 'Moved to Completed Goals.' }] : []),
  ].sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));

  const discussGoal = () => onCoach({ kind: 'goal_support', goalId: goal.id, subject: goal.goal, prompt: `I'd like to discuss my goal: ${goal.goal}` });
  const planGoal = () => onCoach({ kind: 'plan_support', goalId: goal.id, subject: goal.goal, prompt: `Could we make or revise an action plan for my goal: ${goal.goal}?` });

  return <View style={{ gap: 0, paddingBottom: 28 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 26 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to goals" onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingRight: 16 }}>
        <Ionicons name="chevron-back" size={26} color={color.ink} />
        <Text style={s.body}>Back</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Goal options" onPress={() => setMenuOpen(v => !v)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.white, alignItems: 'center', justifyContent: 'center', borderColor: color.line, borderWidth: 1 }}>
        <Ionicons name="ellipsis-horizontal" size={24} color={color.ink} />
      </Pressable>
    </View>
    {menuOpen && <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.line, paddingBottom: 8, marginBottom: 18 }}>
      <MenuAction icon="chatbubble-ellipses-outline" title="Discuss or revise this goal" onPress={discussGoal} />
      <MenuAction icon="list-outline" title={plans.length ? 'Discuss action plan' : 'Create an action plan'} onPress={planGoal} />
      <MenuAction icon="analytics-outline" title="Self-monitoring or check in" onPress={() => onCoach({ kind: 'guide_help', goalId: goal.id, subject: goal.goal, prompt: 'I would like to track my progress for this goal.' })} />
    </View>}
    <Text style={[s.title, { fontSize: 34, lineHeight: 42, marginBottom: 18 }]}>{goal.goal}</Text>
    {!!goal.meaning && <Text style={[s.body, { fontSize: 19, lineHeight: 29, marginBottom: 22 }]}>{goal.meaning}</Text>}
    {!goal.meaning && <Text style={[s.body, { marginBottom: 22 }]}>{goal.completed ? 'Completed goal' : goal.confirmed ? 'Your current goal and its progress over time.' : 'Draft goal'}</Text>}
    <View style={{ height: 1, backgroundColor: color.line, marginHorizontal: -22, marginBottom: 26 }} />
    <Text style={[s.heading, { marginBottom: 22 }]}>Activity</Text>
    {events.map((event, i) => <View key={event.id} style={{ flexDirection: 'row', gap: 17, minHeight: 104 }}>
      <View style={{ width: 28, alignItems: 'center' }}>
        <View style={{ height: 17, width: 17, borderColor: color.muted, borderWidth: 1.5, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: color.white }}>
          <View style={{ height: 7, width: 7, borderRadius: 4, borderWidth: 1, borderColor: color.muted }} />
        </View>
        {i < events.length - 1 && <View style={{ flex: 1, width: 1.5, backgroundColor: color.line, marginVertical: 5 }} />}
      </View>
      <View style={{ flex: 1, paddingBottom: 28, gap: 5 }}>
        <Text style={[s.body, { fontWeight: '600', fontSize: 18 }]}>{event.title}</Text>
        <Text style={[s.body, { color: color.muted }]}>{event.description}</Text>
        <Text style={s.small}>{formatGoalDate(event.date)}</Text>
      </View>
    </View>)}
    <View style={{ marginTop: 18, gap: 12 }}>
      <Button onPress={discussGoal}>Talk to your penguin about this goal</Button>
      {!plans.length && <Button secondary onPress={planGoal}>Create an action plan</Button>}
    </View>
  </View>;
}

export function MuseHome({ onGuide, onCoach, onGoals, onLearn, onCommunity }: { onGuide: OpenGuide; onCoach: AskCoach; onGoals: () => void; onLearn: () => void; onCommunity: () => void }) {
  const { state } = useAppStore();
  const goals = [...state.goals].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  const preferredName = state.profile.displayName?.trim() || '';
  return <View style={{ gap: 22 }}>
    <View style={{ alignItems: 'center', gap: 7, paddingTop: 10 }}><PenguinAvatar profile={state.profile} size={118} /><Text style={s.eyebrow}>Your penguin coach</Text><Text style={[s.title, { textAlign: 'center' }]}>{preferredName ? `Hi ${preferredName}!` : 'Your journey, your pace.'}</Text><Text style={[s.body, { textAlign: 'center' }]}>What would you like to work on today?</Text></View>
    <View style={{ backgroundColor: color.white, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1, borderColor: color.line }}>
      <MenuAction icon="add-circle-outline" title="Create a goal" detail="Start with your penguin" onPress={() => onCoach({ kind: 'goal_support', prompt: 'I would like to create a goal. Can we talk it through together and save it here in our conversation when I am ready?' })}/>{separator}
      <MenuAction icon="list-outline" title="Create an action plan" detail="Make your next step specific" onPress={() => onCoach({ kind: 'plan_support', prompt: 'Can we make an action plan for one of my saved goals? Ask me about the details one at a time, then offer to save it here in our conversation.' })}/>{separator}
      <MenuAction icon="analytics-outline" title="Self-monitoring" detail="Track progress with your penguin" onPress={() => onCoach({ kind: 'guide_help', prompt: 'I would like to create a self-monitoring plan.' })}/>{separator}
      <MenuAction icon="heart-outline" title="Positive self-talk" detail="A kinder way to move forward" onPress={() => onCoach({ kind: 'reflection', prompt: 'Can you help me practise compassionate self-talk about my goals?' })}/>
    </View>
    <View style={{ gap: 10 }}><View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}><Text style={s.heading}>Your goals</Text><Pressable onPress={onGoals} accessibilityRole="button"><Text style={[s.small, { color: color.blue }]}>See all</Text></Pressable></View>
      <View style={{ backgroundColor: color.white, borderRadius: 22, paddingHorizontal: 18, borderWidth: 1, borderColor: color.line }}>
        {goals.length ? goals.slice(0,4).map((g,i) => <React.Fragment key={g.id}>{i > 0 && separator}<MenuAction icon={g.completed ? 'checkmark-circle-outline' : 'flag-outline'} title={g.goal} detail={g.completed ? 'Completed' : 'View timeline and action plan'} onPress={onGoals}/></React.Fragment>) : <MenuAction icon="flag-outline" title="Your first goal starts here" onPress={() => onCoach({ kind: 'goal_support', prompt: 'Help me create my first goal through our conversation.' })}/>}
      </View>
    </View>
    <View style={{ gap: 6 }}><Text style={s.heading}>Your learning path</Text><View style={{ backgroundColor: color.white, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1, borderColor: color.line }}><MenuAction icon="book-outline" title="Read the guides" onPress={onLearn}/></View></View>
  </View>;
}

export function MuseGoals({ onGuide, onCoach }: { onGuide: OpenGuide; onCoach: AskCoach }) {
  const { state, update, track } = useAppStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [collapsedGoalIds, setCollapsedGoalIds] = useState<string[]>([]);
  const goals = [...state.goals].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const selectedGoal = goals.find(g => g.id === selected);
  if (selectedGoal) return <GoalDetails goal={selectedGoal} onBack={() => setSelected(null)} onCoach={onCoach} />;

  const toggleGoal = (goal: Goal) => {
    update(previous => completeGoal(previous, goal.id));
    track('goal_completion_toggled', { goalId: goal.id, completed: !goal.completed });
  };
  const active = goals.filter(goal => !goal.completed);
  const completed = goals.filter(goal => goal.completed);
  const quickActions = (goal: Goal) => <View style={{ paddingLeft: 44, paddingBottom: 16, gap: 0 }}>
    <MenuAction icon="chatbubble-ellipses-outline" title="Discuss or revise this goal" onPress={() => onCoach({ kind: 'goal_support', goalId: goal.id, subject: goal.goal, prompt: `I'd like to discuss or revise my goal: ${goal.goal}` })} />
    <MenuAction icon="list-outline" title="Discuss action plan" onPress={() => onCoach({ kind: 'plan_support', goalId: goal.id, subject: goal.goal, prompt: `I'd like to discuss my action plan for ${goal.goal}.` })} />
    <MenuAction icon="analytics-outline" title="Self-monitoring or check in" onPress={() => onCoach({ kind: 'guide_help', goalId: goal.id, subject: goal.goal, prompt: `I'd like to check in on or self-monitor my goal: ${goal.goal}.` })} />
  </View>;
  const goalRow = (goal: Goal, showActions: boolean) => <View key={goal.id} style={{ borderBottomWidth: 1, borderBottomColor: color.line }}>
    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 16 }}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: goal.completed }} accessibilityLabel={`${goal.completed ? 'Move to active goals' : 'Mark complete'}: ${goal.goal}`} onPress={() => toggleGoal(goal)} style={{ padding: 5 }}>
        <Ionicons name={goal.completed ? 'checkbox-outline' : 'square-outline'} size={27} color={goal.completed ? color.green : color.muted} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`View ${goal.goal} timeline`} onPress={() => setSelected(goal.id)} style={{ flex: 1, gap: 4 }}>
        <Text style={[s.body, { fontSize: 19, fontWeight: '600' }]}>{goal.goal}</Text>
        <Text style={s.small}>{goal.completed ? 'Completed · Tap to view timeline' : 'Tap to view timeline'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`View ${goal.goal} details`} onPress={() => setSelected(goal.id)} style={{ padding: 8 }}><Ionicons name="chevron-forward" size={21} color={color.muted} /></Pressable>
    </View>
    {showActions && <>
      <Pressable accessibilityRole="button" accessibilityLabel={`${collapsedGoalIds.includes(goal.id) ? 'Expand' : 'Collapse'} shortcuts for ${goal.goal}`} accessibilityState={{ expanded: !collapsedGoalIds.includes(goal.id) }} onPress={() => setCollapsedGoalIds(ids => ids.includes(goal.id) ? ids.filter(id => id !== goal.id) : [...ids, goal.id])} style={{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 12 }}>
        <Text style={[s.small, { color: color.blue }]}>Shortcuts</Text>
        <Ionicons name={collapsedGoalIds.includes(goal.id) ? 'chevron-down' : 'chevron-up'} size={19} color={color.blue} />
      </Pressable>
      {!collapsedGoalIds.includes(goal.id) && quickActions(goal)}
    </>}
  </View>;

  return <View style={{ gap: 0, paddingBottom: 30 }}>
    <Text style={[s.title, { fontSize: 34, marginBottom: 12 }]}>Goals</Text>
    <Text style={[s.body, { color: color.muted, marginBottom: 24 }]}>Your goals, all in one place.</Text>
    <Text style={[s.heading, { marginBottom: 8 }]}>Active goals</Text>
    <View style={{ borderTopWidth: 1, borderTopColor: color.line }}>
      {active.map(goal => goalRow(goal, true))}
      {!active.length && <Text style={[s.body, { paddingVertical: 20 }]}>No active goals yet.</Text>}
    </View>
    <Pressable accessibilityRole="button" onPress={() => onCoach({ kind: 'goal_support', prompt: 'I would like to create a new goal with you.' })} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 24 }}>
      <Ionicons name="add" size={28} color={color.blue} /><Text style={[s.body, { fontSize: 18 }]}>Create a goal</Text>
    </Pressable>
    <Text style={[s.heading, { marginTop: 12, marginBottom: 8 }]}>Completed goals</Text>
    <View style={{ borderTopWidth: 1, borderTopColor: color.line }}>
      {completed.map(goal => goalRow(goal, false))}
      {!completed.length && <Text style={[s.body, { color: color.muted, paddingVertical: 20 }]}>Completed goals will appear here. You can restore them at any time.</Text>}
    </View>
  </View>;
}

// Recommendations are derived locally from confirmed participant records.
// The coach receives the same goal/plan context when the participant opens a suggestion.
export function MuseFeed({ onGuide, onCoach, onLearn }: { onGuide: OpenGuide; onCoach: AskCoach; onLearn: () => void }) {
  const { state } = useAppStore();
  const activeGoals = state.goals.filter(goal => goal.confirmed && !goal.completed).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unfinished = GUIDE_DEFINITIONS.filter(guide => !state.completedLessons.includes(guide.id));
  const latestReflections = [...state.reflections].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return <View style={{ gap: 22, paddingBottom: 28 }}>
    <View style={{ gap: 7 }}>
      <Text style={s.eyebrow}>Discover</Text>
      <Text style={[s.title, { fontSize: 34 }]}>Your Feed</Text>
      <Text style={s.body}>Ideas connected to the goals and plans you've saved.</Text>
    </View>

    {!activeGoals.length ? <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.line, paddingVertical: 20, gap: 10 }}>
      <Text style={s.heading}>Start with a goal that matters to you</Text>
      <Text style={s.body}>Pip can help you find a manageable starting point, at your pace.</Text>
      <MenuAction icon="chatbubble-ellipses-outline" title="Talk with Pip" onPress={() => onCoach({ kind: 'goal_support', prompt: 'Help me explore a goal I would like to work toward.' })} />
    </View> : <View style={{ gap: 3 }}>
      <Text style={s.heading}>For your goals</Text>
      {activeGoals.map(goal => {
        const plan = [...state.plans].filter(p => p.goalId === goal.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        const lastChange = (goal.revisions || []).slice(-1)[0];
        const title = !plan ? 'Make an action plan' : lastChange ? 'Check in on your updated goal' : 'See how your plan is working';
        const detail = !plan ? 'Choose when, where, and how to make this goal doable.' : lastChange ? 'Your goal has changed. Explore what feels realistic with Pip.' : plan.barrier ? `You identified “${plan.barrier}” as a possible barrier. Explore what might help.` : 'Reflect on what is working, and adjust your plan if you need to.';
        return <View key={goal.id} style={{ paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: color.line, gap: 7 }}>
          <Text style={[s.body, { color: color.blue, fontSize: 20, lineHeight: 27, fontWeight: '600' }]}>{goal.goal}</Text>
          <Text style={[s.heading, { fontSize: 19 }]}>{title}</Text>
          <Text style={s.body}>{detail}</Text>
          <MenuAction icon="chatbubble-outline" title="Discuss with Pip" onPress={() => onCoach(!plan ? { kind: 'plan_support', goalId: goal.id, subject: goal.goal, prompt: 'Help me create an action plan for my saved goal.' } : { kind: 'goal_review', goalId: goal.id, subject: goal.goal, prompt: 'Can we check in on how my goal and action plan fit my current circumstances?' })} />
        </View>;
      })}
    </View>}

    <View style={{ gap: 5 }}>
      <Text style={s.heading}>Your learning path</Text>
      {unfinished.length ? <>
        <Text style={s.body}>A guide you haven't finished yet:</Text>
        <MenuAction icon="book-outline" title={unfinished[0].title} detail={unfinished[0].subtitle} onPress={onLearn} />
      </> : <Text style={s.body}>You've explored all the current guides. Return to one whenever a refresher would help.</Text>}
      <MenuAction icon="library-outline" title="See all guides" onPress={onLearn} />
    </View>

    {!!latestReflections.length && <View style={{ borderTopWidth: 1, borderTopColor: color.line, paddingTop: 18, gap: 7 }}>
      <Text style={s.heading}>Room to reflect</Text>
      <Text style={s.body}>Your reflections can help you notice what is useful and what needs to change.</Text>
      <MenuAction icon="heart-outline" title="Talk through a reflection" onPress={() => onCoach({ kind: 'reflection', prompt: 'Help me reflect on how my goals are going, using what I have previously shared.' })} />
    </View>}
    <Text style={s.small}>Suggestions are based on saved goals, action plans, and guide progress. You can always choose something different.</Text>
  </View>;
}
