import React, { useEffect, useState } from "react";
import { goalEventName, loadGoals, StoredGoal } from "./goalStore";
interface HomeProps { userId: string; userName: string; setActiveTab: (tab: string) => void }
const Home: React.FC<HomeProps> = ({ userId, userName, setActiveTab }) => {
  const [goals, setGoals] = useState<StoredGoal[]>([]);
  useEffect(() => {
    const refresh = () => setGoals(loadGoals(userId)); refresh();
    window.addEventListener(goalEventName, refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener(goalEventName, refresh); window.removeEventListener("storage", refresh); };
  }, [userId]);
  const row = (label: string, detail: string, tab: string, icon: string) => <button type="button" onClick={()=>setActiveTab(tab)} className="w-full flex items-center gap-4 text-left py-5 border-b border-slate-100 last:border-b-0"><span className="text-2xl w-9 text-center text-sky-600">{icon}</span><span className="flex-1"><span className="block text-lg text-slate-900">{label}</span><span className="block text-sm text-slate-500 mt-1">{detail}</span></span><span aria-hidden="true" className="text-slate-400">›</span></button>;
  return <div className="min-h-screen bg-[#fafafa] text-slate-900 px-5 pt-20 pb-28 lg:pt-12"><div className="max-w-2xl mx-auto">
    <div className="flex items-center justify-center flex-col mb-10"><img src="/behaviour-logo.png" alt="Tie, your penguin coach" className="w-28 h-28 object-contain"/><span className="rounded-full bg-white px-5 py-2 border border-slate-100">Tie</span></div>
    <p className="text-slate-500">Welcome back{userName && userName!=="New User" ? `, ${userName}`:""}</p><h1 className="text-4xl font-medium mt-2 mb-6">Your journey</h1>
    <div className="bg-white rounded-3xl px-5 border border-slate-100">
      {row("Create a goal","Talk with Tie about what matters to you", "create-goal", "+")}
      {row("Create an action plan","Choose when, where and how", "action-plan", "▤")}
      {row("Self-talk","Build a more supportive inner voice", "self-talk", "♡")}
    </div>
    <section className="mt-9"><div className="flex justify-between items-center mb-3"><h2 className="text-2xl">Your goals</h2><button type="button" onClick={()=>setActiveTab("goals")} className="text-sky-700">View all</button></div>
      <div className="bg-white rounded-3xl px-5 border border-slate-100">{goals.length===0?<p className="py-6 text-slate-500">No goals yet. Start a conversation with Tie to explore one, or add a goal in Goals.</p>:goals.map(g=><button type="button" key={g.id} onClick={()=>setActiveTab("goals")} className="w-full flex gap-3 items-center py-4 border-b border-slate-100 last:border-0 text-left"><span className="text-xl text-sky-600">{g.completed?"☑":"☐"}</span><span className="flex-1">{g.goal}</span><span className="text-slate-400">›</span></button>)}</div>
    </section>
    <section className="mt-9"><h2 className="text-2xl mb-3">Your learning path</h2><div className="bg-white rounded-3xl px-5 border border-slate-100">{row("Read the guides","Goal setting, planning, monitoring and self-talk", "resources", "▤")}{row("Community Hub","Share tips with other participants", "community", "♧")}{row("Explore your feed","Ideas related to your saved goals", "feed", "✦")}</div></section>
    <button type="button" onClick={()=>setActiveTab("settings")} className="mt-8 text-slate-500 text-sm">⚙ Settings and accessibility</button>
  </div></div>;
};
export default Home;
