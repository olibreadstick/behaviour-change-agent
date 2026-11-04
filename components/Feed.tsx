import React, { useEffect, useState } from "react";
import { goalEventName, loadGoals, StoredGoal } from "./goalStore";
interface Props { userId: string; setActiveTab: (tab: string) => void }
const Feed: React.FC<Props> = ({ userId, setActiveTab }) => {
  const [goals,setGoals] = useState<StoredGoal[]>([]);
  useEffect(()=>{ const refresh=()=>setGoals(loadGoals(userId)); refresh(); window.addEventListener(goalEventName,refresh); return ()=>window.removeEventListener(goalEventName,refresh); },[userId]);
  return <div className="min-h-screen bg-[#fafafa] px-5 pt-20 pb-28 lg:pt-12"><div className="max-w-2xl mx-auto"><p className="text-sm text-sky-700">Your learning path</p><h1 className="text-4xl mt-2 mb-3">Feed</h1><p className="text-slate-500 mb-8">Ideas and guides to support the goals you've saved.</p>
    {goals.length>0 && <section className="bg-white border border-slate-100 rounded-3xl p-6 mb-6"><h2 className="text-xl mb-3">Your current goals</h2>{goals.filter(g=>!g.completed).map(g=><p key={g.id} className="py-2 text-slate-700">• {g.goal}</p>)}<button type="button" onClick={()=>setActiveTab("goals")} className="text-sky-700 mt-3">View goal timeline →</button></section>}
    {goals.length===0 && <p className="rounded-2xl bg-white p-5 text-slate-600 mb-6">Add a goal to connect the feed to your personal objectives.</p>}
    {[{t:"Break a goal into manageable actions",d:"An action plan makes the next step more concrete.",tab:"action-plan"},{t:"Practice supportive self-talk",d:"Explore helpful ways to respond when motivation dips.",tab:"self-talk"},{t:"Explore the behaviour change guides",d:"Learn about goal setting, self-monitoring and problem solving.",tab:"resources"}].map(card=><button type="button" key={card.t} onClick={()=>setActiveTab(card.tab)} className="block w-full text-left bg-white border border-slate-100 rounded-3xl p-6 mb-4 hover:border-sky-200"><h2 className="text-xl text-slate-900">{card.t}</h2><p className="text-slate-500 mt-2">{card.d}</p><span className="text-sky-700 inline-block mt-4">Explore →</span></button>)}
    <p className="text-xs text-slate-500 mt-5">This first version uses saved goals and curated guides. AI-generated personalized posts and shared chat context are not connected yet.</p>
  </div></div>;
};
export default Feed;
