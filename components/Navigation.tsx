import React, { useState } from "react";

interface NavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const Navigation: React.FC<NavProps> = ({
  activeTab,
  setActiveTab,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const tabs = [
    {
      id: "home",
      label: "Home",
      icon: "",
    },
    {
      id: "workshop",
      label: "Workshop",
      icon: "",
    },
    {
      id: "coach",
      label: "Daily AI Coach",
      icon: "",
    },
    {
      id: "resources",
      label: "Resources",
      icon: "",
    },
    {
      id: "community",
      label: "Community",
      icon: "",
    },
    {
      id: "goals",
      label: "Goals",
      icon: "",
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: "",
    },
    {
      id: "profile",
      label: "Profile",
      icon: "",
    },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-100 h-screen sticky top-0 p-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3">
            <img
              src="/behaviour-logo.png"
              alt="TIE the Support Agent"
              className="w-10 h-10 rounded-xl object-cover"
            />

            <h1 className="text-[12px] uppercase tracking-[0.2em] font-bold text-slate-400">
              TIE the SUPPORT AGENT
            </h1>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setActiveTab(tab.id)
              }
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-semibold text-sm ${
                activeTab === tab.id
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-100"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Logout */}
        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onLogout}
            className="
              w-full
              text-left
              px-5
              py-4
              rounded-2xl
              text-slate-500
              font-semibold
              text-sm
              hover:bg-red-50
              hover:text-red-600
              transition
            "
          >
            Log Out
          </button>
        </div>
      </nav>

      {/* Mobile Menu Button */}
      <button
        type="button"
        onClick={() =>
          setMobileMenuOpen(true)
        }
        className="
          lg:hidden
          fixed
          top-4
          left-4
          z-50
          w-11
          h-11
          bg-white
          border
          border-slate-200
          rounded-xl
          shadow-md
          flex
          items-center
          justify-center
          text-slate-700
        "
        aria-label="Open navigation"
      >
        <span className="text-2xl">
          ☰
        </span>
      </button>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-50"
          onClick={() =>
            setMobileMenuOpen(false)
          }
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed top-0 left-0 h-full w-72 bg-white z-[60] shadow-2xl transition-transform duration-300 ease-in-out ${
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col p-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <img
                src="/behaviour-logo.png"
                alt="TIE the Support Agent"
                className="w-11 h-11 rounded-xl object-cover"
              />

              <h1 className="text-[12px] uppercase tracking-[0.2em] font-bold text-slate-400">
                TIE the SUPPORT AGENT
              </h1>
            </div>

            <button
              type="button"
              onClick={() =>
                setMobileMenuOpen(false)
              }
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close navigation"
            >
              <span className="text-xl">
                ×
              </span>
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-semibold text-sm ${
                  activeTab === tab.id
                    ? "bg-sky-500 text-white shadow-lg shadow-sky-100"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Mobile Logout */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onLogout();
              }}
              className="
                w-full
                text-left
                px-5
                py-4
                rounded-2xl
                text-slate-500
                font-semibold
                text-sm
                hover:bg-red-50
                hover:text-red-600
              "
            >
              Log Out
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default Navigation;