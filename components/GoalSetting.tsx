import React, { useEffect, useState } from "react";
import { getUsageEvents, logUsageEvent } from "../utils/usageTracking";
import { goalKey, loadGoals, saveGoals, StoredGoal } from "./goalStore";
interface Props {userId: string}
const GoalSetting: React.FC<Props> = ({userId}) => {
  const [goals,setGoals] = useState<StoredGoal[]>(()=>loadGoals(userId));
  const [selected,setSelected] = useState<string|null>(null);
  const [editing,setEditing] = useState<string|null>(null);
  const [input,setInput] = useState("");
  const [plan,setPlan] = useState("");
  const [add,setAdd] = useState(false);
  const [confirmDelete,setConfirmDelete] = useState<string|null>(null);
  useEffect(()=>setGoals(loadGoals(userId)),[userId]);
  const commit=(next:StoredGoal[])=>{setGoals(next);saveGoals(userId,next);};
  const newGoal=()=>{
    const text=input.trim();if(!text)return;
    const now=new Date().toISOString();const newItem:StoredGoal={id:crypto.randomUUID(),goal:text,createdAt:now,completed:false,events:[{at:now,label:"Goal created",detail:text}]};
    commit([newItem,...goals]);logUsageEvent(userId,"goal_set",{goalId:newItem.id,weekStart:now.slice(0,10)});
    setAdd(false);setInput("");setSelected(newItem.id);
  };
  const updateGoal=(id:string,changes:Partial<StoredGoal>,label:string,detail?:string)=>{
    const now=new Date().toISOString();
    const next=goals.map(g=>g.id===id?{...g,...changes,events:[...(g.events||[]),{at:now,label,detail}]}:g);
    commit(next);
  };
  const toggle=(g:StoredGoal)=>{
    const completed=!g.completed;
    updateGoal(g.id,{completed,completedAt:completed?new Date().toISOString():undefined},completed?"Goal completed":"Goal reopened");
    if(completed&&!getUsageEvents().some(e=>e.userId===userId&&e.type==="goal_completed"&&e.metadata?.goalId===g.id))logUsageEvent(userId,"goal_completed",{goalId:g.id,weekStart:g.weekStart||""});
  };
  const active=goals.find(g=>g.id===selected);
  return <div className="min-h-screen bg-[#fafafa] px-5 pt-20 pb-28 lg:pt-12 text-slate-900"><div className="max-w-2xl mx-auto">
    <div className="text-center mb-7"><img src="/behaviour-logo.png" className="w-24 h-24 mx-auto object-contain" alt="Tie the penguin"/><p className="text-slate-500 mt-1">Your goals with Tie</p></div>
    <h1 className="text-4xl mb-3">Goals</h1><p className="text-slate-500 mb-6">Your goals and progress over time</p>
    <div className="rounded-3xl border border-slate-100 bg-white px-5 mb-5">
      {goals.length===0?<p className="py-6 text-slate-500">You haven't saved a goal yet.</p>:goals.map(g=><div key={g.id} className="flex items-center gap-4 border-b border-slate-100 last:border-0 py-5"><button type="button" aria-label={g.completed?"Reopen goal":"Complete goal"} onClick={()=>toggle(g)} className="text-2xl text-sky-700">{g.completed?"☑":"☐"}</button><button type="button" className="flex-1 text-left" onClick={()=>{setSelected(g.id);setEditing(null);setPlan(g.actionPlan||"");}}><span className={g.completed?"line-through text-slate-500":""}>{g.goal}</span><span className="block text-sm text-slate-500 mt-1">{g.completed?"Completed":"In progress"} · View timeline ›</span></button></div>)}
    </div>
    <button type="button" onClick={()=>{setAdd(!add);setInput("");setSelected(null);}} className="w-full text-left p-5 bg-white rounded-3xl border border-slate-100 text-sky-700 text-lg">＋ Create a goal</button>
    {add&&<div className="bg-white rounded-3xl border border-slate-100 p-5 mt-4"><label className="block mb-2" htmlFor="goal-entry">Describe your goal</label><textarea id="goal-entry" value={input} onChange={e=>setInput(e.target.value)} maxLength={300} rows={3} className="w-full border border-slate-200 rounded-xl p-3" placeholder="For example, take a short walk three times a week"/><div className="flex gap-3 mt-3"><button type="button" onClick={newGoal} disabled={!input.trim()} className="bg-sky-600 text-white px-5 py-2 rounded-xl disabled:opacity-50">Save goal</button><button type="button" onClick={()=>setAdd(false)}>Cancel</button></div></div>}
    {active&&<section className="bg-white rounded-3xl border border-slate-100 p-5 mt-6"><div className="flex justify-between items-center"><h2 className="text-2xl">Goal details</h2><button aria-label="Close goal details" type="button" onClick={()=>setSelected(null)}>✕</button></div><h3 className="text-lg mt-4">{active.goal}</h3>
    <div className="mt-5"><label htmlFor="goal-plan" className="block text-lg mb-2">Action plan</label><textarea id="goal-plan" value={plan} onChange={e=>setPlan(e.target.value)} rows={3} className="w-full p-3 border border-slate-200 rounded-xl" placeholder="When, where and how will you work on this?"/><button type="button" onClick={()=>{updateGoal(active.id,{actionPlan:plan.trim()},"Action plan updated",plan.trim());logUsageEvent(userId,"action_plan_saved",{goalId:active.id});}} className="mt-2 text-sky-700">Save action plan</button></div>
    <div className="mt-6"><h3 className="text-lg mb-4">Activity timeline</h3><ol className="border-l-2 border-sky-100 pl-5 space-y-5">{[...(active.events?.length?active.events:[{at:active.createdAt,label:"Goal created",detail:active.goal}])].slice().reverse().map((e,i)=><li key={i} className="relative"><span className="absolute -left-[26px] top-1 rounded-full w-2.5 h-2.5 border border-sky-400 bg-white"/><p className="text-slate-900">{e.label}</p>{e.detail&&<p className="text-slate-500 text-sm mt-1">{e.detail}</p>}<time className="text-slate-400 text-xs">{new Date(e.at).toLocaleDateString()}</time></li>)}</ol></div>
    {editing===active.id?<div className="mt-5"><textarea aria-label="Edit goal" value={input} onChange={e=>setInput(e.target.value)} maxLength={300} className="w-full border rounded-xl p-3"/><button type="button" onClick={()=>{const updated=input.trim();if(!updated)return;updateGoal(active.id,{goal:updated},"Goal updated",updated);logUsageEvent(userId,"goal_edited",{goalId:active.id});setEditing(null);}} className="text-sky-700 mt-2">Save changes</button></div>:<button type="button" onClick={()=>{setEditing(active.id);setInput(active.goal);}} className="text-sky-700 block mt-5">Edit goal</button>}
    {confirmDelete===active.id?<div className="mt-5"><p>Delete this goal and its timeline?</p><button type="button" onClick={()=>{commit(goals.filter(g=>g.id!==active.id));logUsageEvent(userId,"goal_deleted",{goalId:active.id});setSelected(null);setConfirmDelete(null);}} className="text-red-600 mr-5">Confirm delete</button><button type="button" onClick={()=>setConfirmDelete(null)}>Cancel</button></div>:<button type="button" onClick={()=>setConfirmDelete(active.id)} className="mt-5 text-red-600">Delete goal</button>}
    </section>}
    <p className="text-xs text-slate-500 mt-7">Goals are currently saved in this browser. Automatic goal updates from AI conversations will require a shared backend integration.</p>
  </div></div>;
};
export default GoalSetting;
