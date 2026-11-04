import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppStore } from './store';
import { AskCoach, Goal, GuideId } from './types';
import { color, styles as s } from './theme';
import { Button } from './ui';

const penguin = require('../assets/coach-penguin.png');
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
      ...(plan.revisions || []).map((revision, i) => ({ id: `plan-revision-${plan.id}-${i}`, date: revision.changedAt, title: 'Updated action plan', description: `Changed from “${revision.previous}” to “${revision.next}”.` })),
    ]),
    ...state.activities.filter(a => a.goalId === goal.id).map(activity => ({ id: `activity-${activity.id}`, date: activity.date, title: activity.title, description: activity.status === 'completed' ? 'Activity completed' : 'Activity planned' })),
    ...(goal.completedAt ? [{ id: `completed-${goal.id}`, date: goal.completedAt, title: 'Completed goal', description: 'Marked this goal as completed.' }] : []),
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

export function MuseHome({ onGuide, onCoach, onGoals, onLearn, onCommunity, onFeed }: { onGuide: OpenGuide; onCoach: AskCoach; onGoals: () => void; onLearn: () => void; onCommunity: () => void; onFeed: () => void }) {
  const { state } = useAppStore();
  const goals = [...state.goals].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  return <View style={{ gap: 22 }}>
    <View style={{ alignItems: 'center', gap: 7, paddingTop: 10 }}><Image source={penguin} style={{ width: 118, height: 118 }} resizeMode="contain"/><Text style={s.eyebrow}>Your penguin coach</Text><Text style={[s.title, { textAlign: 'center' }]}>Your journey, your pace.</Text><Text style={[s.body, { textAlign: 'center' }]}>What would you like to work on today?</Text></View>
    <View style={{ backgroundColor: color.white, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1, borderColor: color.line }}>
      <MenuAction icon="add-circle-outline" title="Create a goal" detail="Start with your penguin" onPress={() => onCoach({ kind: 'goal_support', prompt: 'I would like to create a goal. Can we talk it through together and save it here in our conversation when I am ready?' })}/>{separator}
      <MenuAction icon="list-outline" title="Create an action plan" detail="Make your next step specific" onPress={() => onCoach({ kind: 'plan_support', prompt: 'Can we make an action plan for one of my saved goals? Ask me about the details one at a time, then offer to save it here in our conversation.' })}/>{separator}
      <MenuAction icon="heart-outline" title="Positive self-talk" detail="A kinder way to move forward" onPress={() => onCoach({ kind: 'reflection', prompt: 'Can you help me practise compassionate self-talk about my goals?' })}/>
    </View>
    <View style={{ gap: 10 }}><View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}><Text style={s.heading}>Your goals</Text><Pressable onPress={onGoals} accessibilityRole="button"><Text style={[s.small, { color: color.blue }]}>See all</Text></Pressable></View>
      <View style={{ backgroundColor: color.white, borderRadius: 22, paddingHorizontal: 18, borderWidth: 1, borderColor: color.line }}>
        {goals.length ? goals.slice(0,4).map((g,i) => <React.Fragment key={g.id}>{i > 0 && separator}<MenuAction icon={g.completed ? 'checkmark-circle-outline' : 'flag-outline'} title={g.goal} detail={g.completed ? 'Completed' : 'View timeline and action plan'} onPress={onGoals}/></React.Fragment>) : <MenuAction icon="flag-outline" title="Your first goal starts here" onPress={() => onCoach({ kind: 'goal_support', prompt: 'Help me create my first goal through our conversation.' })}/>}
      </View>
    </View>
    <View style={{ gap: 6 }}><Text style={s.heading}>Your learning path</Text><View style={{ backgroundColor: color.white, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1, borderColor: color.line }}><MenuAction icon="book-outline" title="Read the guides" onPress={onLearn}/>{separator}<MenuAction icon="sparkles-outline" title="Explore your Feed" onPress={onFeed}/>{separator}<MenuAction icon="people-outline" title="Community Hub" onPress={onCommunity}/></View></View>
  </View>;
}

export function MuseGoals({ onGuide, onCoach }: { onGuide: OpenGuide; onCoach: AskCoach }) {
  const { state } = useAppStore();
  const [selected, setSelected] = useState<string | null>(null);
  const goals = [...state.goals].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const selectedGoal = goals.find(g => g.id === selected);
  if (selectedGoal) return <GoalDetails goal={selectedGoal} onBack={() => setSelected(null)} onCoach={onCoach} />;

  return <View style={{ gap: 0, paddingBottom: 30 }}>
    <Text style={[s.title, { fontSize: 34, marginBottom: 12 }]}>Goals</Text>
    <Text style={[s.body, { color: color.muted, marginBottom: 24 }]}>Your goals, all in one place.</Text>
    <View style={{ borderTopWidth: 1, borderTopColor: color.line }}>
      {goals.map(goal => <Pressable key={goal.id} accessibilityRole="button" onPress={() => setSelected(goal.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: color.line }}>
        <Ionicons name={goal.completed ? 'checkbox-outline' : 'square-outline'} size={25} color={goal.completed ? color.green : color.muted} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[s.body, { fontSize: 18, fontWeight: '600' }]}>{goal.goal}</Text>
          <Text style={s.small}>{goal.completed ? 'Completed' : goal.confirmed ? 'In progress' : 'Draft'} · View activity timeline</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={color.muted} />
      </Pressable>)}
      {!goals.length && <Text style={[s.body, { paddingVertical: 24 }]}>No goals yet. You can create one by talking to your penguin.</Text>}
    </View>
    <Pressable accessibilityRole="button" onPress={() => onCoach({ kind: 'goal_support', prompt: 'I would like to create a new goal with you.' })} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 24 }}>
      <Ionicons name="add" size={28} color={color.blue} />
      <Text style={[s.body, { fontSize: 18 }]}>Create a goal</Text>
    </Pressable>
  </View>;
}

export function MuseFeed({ onGuide, onCoach, onLearn }: { onGuide: OpenGuide; onCoach: AskCoach; onLearn: () => void }) {
  const { state } = useAppStore();
  const activeGoal = state.goals.find(g => g.confirmed && !g.completed);
  const hasPlan = activeGoal && state.plans.some(p => p.goalId === activeGoal.id);
  return <View style={{ gap: 16 }}><Text style={s.eyebrow}>Discover</Text><Text style={s.title}>Your Feed</Text><Text style={s.body}>Suggestions based on your saved goals and learning progress.</Text>
    <View style={{ backgroundColor: color.white, padding: 20, borderRadius: 22, gap: 12, borderWidth:1, borderColor:color.line }}><Text style={s.eyebrow}>Recommended next step</Text><Text style={s.heading}>{!activeGoal ? 'Start with a meaningful goal' : !hasPlan ? 'Make a plan for your goal' : 'Notice your progress'}</Text><Text style={s.body}>{!activeGoal ? 'A small, realistic goal can help you get started.' : !hasPlan ? `Your goal is “${activeGoal.goal}.” An action plan can help you decide when, where, and how.` : 'Your plan is ready. Check in about what is working and what you might adjust.'}</Text><Button onPress={() => !activeGoal ? onCoach({kind:'goal_support',prompt:'Help me set my first goal.'}) : !hasPlan ? onCoach({kind:'plan_support',goalId:activeGoal.id,subject:activeGoal.goal,prompt:`Help me make a plan for my goal: ${activeGoal.goal}`}) : onCoach({ kind:'goal_review', goalId:activeGoal.id, subject:activeGoal.goal, prompt:`Help me review progress on ${activeGoal.goal}` })}>Explore suggestion</Button></View>
    <View style={{ backgroundColor: color.white, padding: 20, borderRadius: 22, gap: 12, borderWidth:1, borderColor:color.line }}><Text style={s.heading}>Explore the guides</Text><Text style={s.body}>Goal setting, action planning, and self-monitoring are available in your learning path.</Text><Button secondary onPress={onLearn}>Browse learning path</Button></View>
    <Text style={s.small}>Suggestions are based on your saved goals and plans. Your coach also receives this context during conversations.</Text>
  </View>;
}
