import React from "react";

interface Account {
  id: string;
  name: string;
  createdAt: number;
}

interface NavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;

  accounts: Account[];
  activeAccountId: string | null;
  setActiveAccountId: (id: string) => void;
  onCreateAccount: () => void;
}

const Navigation: React.FC<NavProps> = ({
  activeTab,
  setActiveTab,
  accounts,
  activeAccountId,
  setActiveAccountId,
  onCreateAccount,
}) => {
  const tabs = [
    { id: "home", label: "Home", icon: "" },
    { id: "workshop", label: "Workshop", icon: "" },
    { id: "coach", label: "Daily AI Coach", icon: "" },
    { id: "resources", label: "Resources", icon: "" },
    { id: "calendar", label: "Calendar", icon: "" },
    { id: "profile", label: "Profile", icon: "" },
    { id: "admin", label: "Admin", icon: "" },
  ];
  const activeName =
    accounts.find((a) => a.id === activeAccountId)?.name || "Select account";

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-100 h-screen sticky top-0 p-8">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-100">
              <span className="text-white text-xl font-black">U</span>
            </div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900">
              Behaviour Change
            </h1>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 pl-1">
            Support Agent
          </p>

          {/* Account Switcher */}
          <div className="mt-6 bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Account
            </p>

            <div className="flex items-center gap-2">
              <select
                value={activeAccountId || ""}
                onChange={(e) => setActiveAccountId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-red-200"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>

              <button
                onClick={onCreateAccount}
                className="px-3 py-2 rounded-xl bg-sky-500 text-white text-xs font-black hover:bg-red-600 transition-colors"
                title="Create new account"
              >
                + New
              </button>
            </div>

            <p className="mt-2 text-[10px] text-slate-400 font-medium">
              Active:{" "}
              <span className="font-black text-slate-600">{activeName}</span>
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-semibold text-sm ${
                activeTab === tab.id
                  ? "bg-sky-500 text-white shadow-xl shadow-bg-sky-100"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile Bottom Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 z-50 flex justify-between items-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === tab.id ? "text-sky-700" : "text-slate-400"
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {tab.label.split(" ")[0]}
            </span>
          </button>
        ))}
      </nav>
    </>
  );
};

export default Navigation;
