import React, { useState } from "react";

type Props = { activeTab: string; setActiveTab: (tab: string) => void; onLogout: () => void };
const tabs = [
  { id: "home", label: "Home", icon: "⌂" },
  { id: "coach", label: "Chat", icon: "☏" },
  { id: "resources", label: "Learning", icon: "▤" },
  { id: "feed", label: "Feed", icon: "✦" },
  { id: "goals", label: "Goals", icon: "☑" },
  { id: "settings", label: "Settings", icon: "⚙" },
];
const Navigation: React.FC<Props> = ({ activeTab, setActiveTab, onLogout }) => {
  const [open, setOpen] = useState(false);
  const choose = (id: string) => { setActiveTab(id); setOpen(false); };
  return <>
    <nav className="hidden lg:flex lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen flex-col bg-white border-r border-slate-100 p-6" aria-label="Main navigation">
      <div className="flex items-center gap-3 mb-12"><img src="/behaviour-logo.png" alt="Tie penguin" className="h-12 w-12 object-contain"/><span className="text-lg text-slate-900">Tie · Your coach</span></div>
      <div className="flex-1 space-y-2">{tabs.map(t=><button type="button" key={t.id} onClick={()=>choose(t.id)} aria-current={activeTab===t.id?"page":undefined} className={`w-full text-left flex gap-4 rounded-2xl px-4 py-3 ${activeTab===t.id?"bg-sky-100 text-sky-800":"text-slate-600 hover:bg-slate-50"}`}><span aria-hidden="true">{t.icon}</span>{t.label}</button>)}</div>
      <button type="button" onClick={onLogout} className="p-3 text-left text-slate-600 hover:text-red-600">Log out</button>
    </nav>
    <button type="button" className="lg:hidden fixed top-4 left-4 z-40 h-11 w-11 rounded-full bg-white border border-slate-100 shadow-sm text-xl" aria-label="Open menu" onClick={()=>setOpen(true)}>☰</button>
    {open && <div className="fixed inset-0 z-[70] lg:hidden bg-black/30" onClick={()=>setOpen(false)} />}
    <aside className={`fixed top-0 left-0 bottom-0 z-[80] lg:hidden w-72 bg-white shadow-lg p-6 transition-transform ${open?"translate-x-0":"-translate-x-full"}`} aria-label="Menu" aria-hidden={!open}>
      <div className="flex justify-between items-center mb-8"><span className="text-lg">Tie · Your coach</span><button type="button" onClick={()=>setOpen(false)} aria-label="Close menu">✕</button></div>
      <div className="space-y-2">{tabs.map(t=><button type="button" key={t.id} onClick={()=>choose(t.id)} className="block text-left w-full rounded-2xl px-4 py-3 text-slate-700 hover:bg-sky-50">{t.icon}　{t.label}</button>)}<button type="button" onClick={onLogout} className="px-4 py-3 text-red-600">Log out</button></div>
    </aside>
    <nav className="lg:hidden fixed z-40 bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around px-1 pb-[max(env(safe-area-inset-bottom),8px)] pt-2" aria-label="Bottom navigation">
      {tabs.filter(t=>t.id!=="settings").map(t=><button type="button" key={t.id} onClick={()=>choose(t.id)} aria-label={t.label} aria-current={activeTab===t.id?"page":undefined} className={`min-w-0 flex-1 flex flex-col items-center gap-1 py-1 text-[11px] ${activeTab===t.id?"text-sky-700":"text-slate-500"}`}><span className="text-xl">{t.icon}</span>{t.label}</button>)}
    </nav>
  </>;
};
export default Navigation;
