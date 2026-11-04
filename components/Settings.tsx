import React, { useEffect, useState } from "react";
type Props = { userId: string; onLogout: () => void; setActiveTab: (tab: string) => void };
const Settings: React.FC<Props> = ({ userId, onLogout, setActiveTab }) => {
  const key = `behaviour_change_accessibility_${userId}`;
  const [large,setLarge] = useState(()=>localStorage.getItem(key)==="large");
  useEffect(()=>{localStorage.setItem(key,large?"large":"normal");document.documentElement.style.fontSize=large?"19px":"";return ()=>{document.documentElement.style.fontSize=""};},[key,large]);
  const exportData=()=>{
    const prefix = `behaviour_change_`;
    const data: Record<string,unknown> = { exportedAt: new Date().toISOString(), participantId:userId, localData:{} };
    const localData: Record<string, unknown> = {};
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i); if(k && k.startsWith(prefix) && k.endsWith(`_${userId}`)){try {localData[k]=JSON.parse(localStorage.getItem(k)||"null");}catch{localData[k]=localStorage.getItem(k);}}}
    data.localData=localData;
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download="tie-local-data.json";a.click();URL.revokeObjectURL(url);
  };
  return <div className="min-h-screen bg-[#fafafa] px-5 pt-20 pb-28 lg:pt-12"><div className="max-w-xl mx-auto"><h1 className="text-4xl mb-8">Settings</h1><section className="bg-white border border-slate-100 rounded-3xl p-6 space-y-5"><h2 className="text-xl">Accessibility</h2><label className="flex items-center justify-between gap-4"><span>Larger text</span><input aria-label="Larger text" type="checkbox" checked={large} onChange={e=>setLarge(e.target.checked)} className="w-5 h-5"/></label><p className="text-sm text-slate-500">Text size is saved on this device.</p></section><section className="bg-white border border-slate-100 rounded-3xl p-6 mt-5 space-y-4"><h2 className="text-xl">Your account</h2><button type="button" onClick={()=>setActiveTab("profile")} className="block text-sky-700">Profile and penguin appearance →</button><button type="button" onClick={exportData} className="block text-sky-700">Download locally stored agent data</button><p className="text-xs text-slate-500">This download contains only participant-specific data held in this browser. It does not include all server-held study data or cloud transcripts.</p><button type="button" onClick={onLogout} className="text-red-600">Log out</button></section></div></div>;
};
export default Settings;
