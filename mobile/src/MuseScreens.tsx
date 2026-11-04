import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppStore } from './store';
import { AskCoach, Goal, GuideId } from './types';
import { color, styles as s } from './theme';
import { Button, Field } from './ui';

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

function GoalRow({ goal, expanded, onToggle, onCoach, onGuide }: { goal: Goal; expanded: boolean; onToggle: () => void; onCoach: AskCoach; onGuide: OpenGuide }) {
  const { state, update, track } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [goalText, setGoalText] = useState(goal.goal);
  const plans = state.plans.filter(p => p.goalId === goal.id);
  const activities = state.activities.filter(a => a.goalId === goal.id).sort((a,b) => b.date.localeCompare(a.date));
  return <View style={{ borderBottomWidth: 1, borderBottomColor: color.line }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onToggle} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 }}>
      <Ionicons name={goal.completed ? 'checkmark-circle' : 'ellipse-outline'} color={goal.completed ? color.green : color.blue} size={24} />
      <View style={{ flex: 1 }}><Text style={[s.body, { fontWeight: '600' }]}>{goal.goal}</Text><Text style={s.small}>{goal.completed ? 'Completed' : goal.confirmed ? 'In progress' : 'Draft goal'}</Text></View>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={color.muted}/>
    </Pressable>
    {expanded && <View style={{ paddingLeft: 35, paddingBottom: 18, gap: 12 }}>
      {!!goal.meaning && <Text style={s.body}>Why it matters: {goal.meaning}</Text>}
      <Text style={s.small}>Created {new Date(goal.createdAt).toLocaleDateString()}</Text>
      <Text style={s.heading}>Action plan</Text>
      {plans.length ? plans.map(p => <View key={p.id} style={{ gap: 4 }}><Text style={s.body}>{p.what}</Text><Text style={s.small}>When: {p.when || 'Not specified'} · Where: {p.where || 'Not specified'}</Text>{!!p.barrier && <Text style={s.small}>Possible barrier: {p.barrier}</Text>}{!!p.alternative && <Text style={s.small}>Backup: {p.alternative}</Text>}</View>) : <Text style={s.small}>No action plan saved for this goal yet.</Text>}
      <Text style={s.heading}>Timeline</Text>
      <Text style={s.small}>• {new Date(goal.createdAt).toLocaleDateString()} — Goal created</Text>
      {(goal.revisions || []).map((r, i) => <Text key={`${goal.id}-revision-${i}`} style={s.small}>• {new Date(r.changedAt).toLocaleDateString()} — Updated from “{r.previous}” to “{r.next}”</Text>)}
      {activities.map(a => <Text key={a.id} style={s.small}>• {a.date} — {a.title} ({a.status})</Text>)}
      {goal.completedAt && <Text style={s.small}>• {new Date(goal.completedAt).toLocaleDateString()} — Goal completed</Text>}
      {editing && <View style={{ gap: 8 }}>
        <Field label="Update your goal" value={goalText} onChangeText={setGoalText} maxLength={500} multiline />
        <Button disabled={!goalText.trim()} onPress={() => {
          const next = goalText.trim();
          if (next !== goal.goal) {
            update(st => ({ ...st, goals: st.goals.map(g => g.id === goal.id ? { ...g, goal: next, revisions: [...(g.revisions || []), { previous: g.goal, next, changedAt: new Date().toISOString(), source: 'manual' as const }] } : g) }));
            track('goal_updated', { source: 'goals_screen' });
          }
          setEditing(false);
        }}>Save changes</Button>
        <Button secondary onPress={() => { setGoalText(goal.goal); setEditing(false); }}>Cancel</Button>
      </View>}
      {!editing && <Button secondary onPress={() => { setGoalText(goal.goal); setEditing(true); }}>Edit this goal</Button>}
      <Button secondary onPress={() => onCoach({ kind: 'goal_support', goalId: goal.id, subject: goal.goal, prompt: `I'd like to talk about my goal: ${goal.goal}` })}>Discuss this goal</Button>
      {!plans.length && <Button secondary onPress={() => onGuide('action_planning_problem_solving', 'use')}>Create an action plan</Button>}
    </View>}
  </View>;
}

export function MuseHome({ onGuide, onCoach, onGoals, onLearn, onCommunity, onFeed }: { onGuide: OpenGuide; onCoach: AskCoach; onGoals: () => void; onLearn: () => void; onCommunity: () => void; onFeed: () => void }) {
  const { state } = useAppStore();
  const goals = [...state.goals].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  return <View style={{ gap: 22 }}>
    <View style={{ alignItems: 'center', gap: 7, paddingTop: 10 }}><Image source={penguin} style={{ width: 118, height: 118 }} resizeMode="contain"/><Text style={s.eyebrow}>Your penguin coach</Text><Text style={[s.title, { textAlign: 'center' }]}>Your journey, your pace.</Text><Text style={[s.body, { textAlign: 'center' }]}>What would you like to work on today?</Text></View>
    <View style={{ backgroundColor: color.white, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1, borderColor: color.line }}>
      <MenuAction icon="add-circle-outline" title="Create a goal" detail="Start with your penguin" onPress={() => onCoach({ kind: 'goal_support', prompt: 'Help me explore a new behaviour change goal. I would like to decide what matters to me and then save it using the goal-setting guide.' })}/>{separator}
      <MenuAction icon="list-outline" title="Create an action plan" detail="Make your next step specific" onPress={() => onCoach({ kind: 'plan_support', prompt: 'Help me turn one of my saved goals into an action plan. When I am ready, direct me to the action-planning guide to save it.' })}/>{separator}
      <MenuAction icon="heart-outline" title="Positive self-talk" detail="A kinder way to move forward" onPress={() => onCoach({ kind: 'reflection', prompt: 'Can you help me practise compassionate self-talk about my goals?' })}/>
    </View>
    <View style={{ gap: 10 }}><View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}><Text style={s.heading}>Your goals</Text><Pressable onPress={onGoals} accessibilityRole="button"><Text style={[s.small, { color: color.blue }]}>See all</Text></Pressable></View>
      <View style={{ backgroundColor: color.white, borderRadius: 22, paddingHorizontal: 18, borderWidth: 1, borderColor: color.line }}>
        {goals.length ? goals.slice(0,4).map((g,i) => <React.Fragment key={g.id}>{i > 0 && separator}<MenuAction icon={g.completed ? 'checkmark-circle-outline' : 'flag-outline'} title={g.goal} detail={g.completed ? 'Completed' : 'View timeline and action plan'} onPress={onGoals}/></React.Fragment>) : <MenuAction icon="flag-outline" title="Your first goal starts here" onPress={() => onGuide('goal_setting','use')}/>}
      </View>
    </View>
    <View style={{ gap: 6 }}><Text style={s.heading}>Your learning path</Text><View style={{ backgroundColor: color.white, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1, borderColor: color.line }}><MenuAction icon="book-outline" title="Read the guides" onPress={onLearn}/>{separator}<MenuAction icon="sparkles-outline" title="Explore your Feed" onPress={onFeed}/>{separator}<MenuAction icon="people-outline" title="Community Hub" onPress={onCommunity}/></View></View>
  </View>;
}

export function MuseGoals({ onGuide, onCoach }: { onGuide: OpenGuide; onCoach: AskCoach }) {
  const { state } = useAppStore();
  const [selected, setSelected] = useState<string | null>(null);
  const goals = [...state.goals].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  return <View style={{ gap: 18 }}><Text style={s.eyebrow}>My progress</Text><Text style={s.title}>Your goals</Text><Text style={s.body}>Your goals are all in one place. Open one to see its plan and timeline.</Text>
    <View style={{ backgroundColor: color.white, borderRadius: 22, borderWidth: 1, borderColor: color.line, paddingHorizontal: 18 }}>{goals.length ? goals.map(g => <GoalRow key={g.id} goal={g} expanded={selected === g.id} onToggle={() => setSelected(old => old === g.id ? null : g.id)} onGuide={onGuide} onCoach={onCoach}/>) : <Text style={[s.body, { paddingVertical: 22 }]}>No goals yet. Your first one can start with a conversation or a guide.</Text>}</View>
    <Button onPress={() => onGuide('goal_setting','use')}>Save a new goal</Button><Button secondary onPress={() => onGuide('action_planning_problem_solving','use')}>Create an action plan</Button>
  </View>;
}

export function MuseFeed({ onGuide, onCoach, onLearn }: { onGuide: OpenGuide; onCoach: AskCoach; onLearn: () => void }) {
  const { state } = useAppStore();
  const activeGoal = state.goals.find(g => g.confirmed && !g.completed);
  const hasPlan = activeGoal && state.plans.some(p => p.goalId === activeGoal.id);
  return <View style={{ gap: 16 }}><Text style={s.eyebrow}>Discover</Text><Text style={s.title}>Your Feed</Text><Text style={s.body}>Suggestions based on your saved goals and learning progress.</Text>
    <View style={{ backgroundColor: color.white, padding: 20, borderRadius: 22, gap: 12, borderWidth:1, borderColor:color.line }}><Text style={s.eyebrow}>Recommended next step</Text><Text style={s.heading}>{!activeGoal ? 'Start with a meaningful goal' : !hasPlan ? 'Make a plan for your goal' : 'Notice your progress'}</Text><Text style={s.body}>{!activeGoal ? 'A small, realistic goal can help you get started.' : !hasPlan ? `Your goal is “${activeGoal.goal}.” An action plan can help you decide when, where, and how.` : 'Your plan is ready. Check in about what is working and what you might adjust.'}</Text><Button onPress={() => !activeGoal ? onGuide('goal_setting','use') : !hasPlan ? onGuide('action_planning_problem_solving','use') : onCoach({ kind:'goal_review', goalId:activeGoal.id, subject:activeGoal.goal, prompt:`Help me review progress on ${activeGoal.goal}` })}>Explore suggestion</Button></View>
    <View style={{ backgroundColor: color.white, padding: 20, borderRadius: 22, gap: 12, borderWidth:1, borderColor:color.line }}><Text style={s.heading}>Explore the guides</Text><Text style={s.body}>Goal setting, action planning, and self-monitoring are available in your learning path.</Text><Button secondary onPress={onLearn}>Browse learning path</Button></View>
    <Text style={s.small}>Suggestions are based on your saved goals and plans. Your coach also receives this context during conversations.</Text>
  </View>;
}
