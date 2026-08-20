import React, { useState, useEffect } from "react";
import Navigation from "./components/Navigation";
import DiscoverySwipe from "./components/DiscoverySwipe";
import BehaviourChangeChat from "./components/BehaviourChangeChat";
import Onboarding from "./components/Onboarding";
import Welcome from "./components/Welcome";
import { DiscoveryItem, DiscoveryType, CollabRequest } from "./types";
import type { UserProfile } from "./types";
import Calendar from "./components/Calendar";
import Resources from "./components/Resources";
import { truncateSync } from "node:fs";

const ACCOUNTS_KEY = "uc_accounts";
const ACTIVE_ACCOUNT_KEY = "uc_active_account";
const GLOBAL_COLLABS_KEY = "uc_global_collabs";

const profileKey = (id: string) => `uc_profile_${id}`;
const heartsKey = (id: string) => `uc_hearted_${id}`;

type Account = { id: string; name: string; createdAt: number };

const makeAccountId = () =>
  `acc_${Date.now()}_${Math.random().toString(16).slice(2)}`;


const COLLAB_GOALS = [
  "Looking for a lab partner?",
  "Searching for a capstone team?",
  "Need a study group?",
  "Just browsing campus events?",
];

const CREATE_TYPES = [
  { id: DiscoveryType.COLLAB_REQUEST, label: "Collaboration Request" },
  { id: DiscoveryType.EVENT, label: "Event" },
  { id: DiscoveryType.CLUB, label: "Club / Org" },
  { id: DiscoveryType.NETWORKING, label: "Networking" },
] as const;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState("coach");

  const [showWelcome, setShowWelcome] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [activityInput, setActivityInput] = useState("");

  const [newReqType, setNewReqType] = useState<DiscoveryType>(
    DiscoveryType.COLLAB_REQUEST,
  );

  const MAX_AVATAR_BYTES = 5_000_000;

  const handleAvatarFile = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG/JPG/WebP).");
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      alert("That image is too large. Try one under ~5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUserProfile((prev) => (prev ? { ...prev, avatar: dataUrl } : prev));
    };
    reader.onerror = () =>
      alert("Could not read that file. Try another image.");
    reader.readAsDataURL(file);
  };

  const defaultImageFor = (t: DiscoveryType) => {
    switch (t) {
      case DiscoveryType.COLLAB_REQUEST:
      case DiscoveryType.PARTNER:
        return "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800";
      case DiscoveryType.EVENT:
        return "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800";
      case DiscoveryType.CLUB:
        return "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=800";
      case DiscoveryType.NETWORKING:
        return "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80&w=800";
      default:
        return "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800";
    }
  };

  const [heartedItems, setHeartedItems] = useState<DiscoveryItem[]>([]);
  const [collabRequests, setCollabRequests] = useState<CollabRequest[]>([]);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);

  const [newReqTitle, setNewReqTitle] = useState("");
  const [newReqGoal, setNewReqGoal] = useState(COLLAB_GOALS[0]);
  const [newReqSize, setNewReqSize] = useState(2);

  const [newReqDescription, setNewReqDescription] = useState("");

  //olivia
  const [eventDate, setEventDate] = useState(""); // YYYY-MM-DD
  const [eventTime, setEventTime] = useState(""); // HH:MM

  const [hasPersonalKey, setHasPersonalKey] = useState(false);

  useEffect(() => {
    const c = localStorage.getItem(GLOBAL_COLLABS_KEY);
    setCollabRequests(c ? JSON.parse(c) : []);

    const savedAccounts = localStorage.getItem(ACCOUNTS_KEY);
    const savedActive = localStorage.getItem(ACTIVE_ACCOUNT_KEY);

    const parsedAccounts: Account[] = savedAccounts
      ? JSON.parse(savedAccounts)
      : [];

    if (parsedAccounts.length === 0) {
      const id = makeAccountId();
      const defaultAcc: Account = {
        id,
        name: "New User",
        createdAt: Date.now(),
      };
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([defaultAcc]));
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
      setAccounts([defaultAcc]);
      setActiveAccountId(id);
      return;
    }

    setAccounts(parsedAccounts);

    const activeId =
      savedActive && parsedAccounts.some((a) => a.id === savedActive)
        ? savedActive
        : parsedAccounts[0].id;

    setActiveAccountId(activeId);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, activeId);
  }, []);

  useEffect(() => {
    if (!activeAccountId) return;

    const p = localStorage.getItem(profileKey(activeAccountId));
    const h = localStorage.getItem(heartsKey(activeAccountId));
    const c = localStorage.getItem(GLOBAL_COLLABS_KEY);

    if (p) {
      setUserProfile(JSON.parse(p));
      setOnboardingComplete(true);
    } else {
      setUserProfile({
        id: activeAccountId,
        name: "New User",
        major: "",
        interests: [],
        bio: "Prospective high-achiever.",
        avatar: "",
        gpa: "3.8",
        skills: ["Python", "Teamwork", "Research"],
        experience: ["Research Assistant @ McGill", "Intern @ Shopify"],
      });
      setOnboardingComplete(true);
    }

    setHeartedItems(h ? JSON.parse(h) : []);
    setCollabRequests(c ? JSON.parse(c) : []);
  }, [activeAccountId, accounts]);

  useEffect(() => {
    const c = localStorage.getItem(GLOBAL_COLLABS_KEY);
    setCollabRequests(c ? JSON.parse(c) : []);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === GLOBAL_COLLABS_KEY) {
        setCollabRequests(e.newValue ? JSON.parse(e.newValue) : []);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!userProfile || !activeAccountId) return;
    if (userProfile.id !== activeAccountId) return;

    setAccounts((prev) => {
      const current = prev.find((a) => a.id === activeAccountId);
      if (!current) return prev;

      if (current.name === userProfile.name) return prev;

      const updated = prev.map((acc) =>
        acc.id === activeAccountId ? { ...acc, name: userProfile.name } : acc,
      );

      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [userProfile?.name, userProfile?.id, activeAccountId]);

  useEffect(() => {
    if (!activeAccountId || !userProfile) return;
    localStorage.setItem(
      profileKey(activeAccountId),
      JSON.stringify(userProfile),
    );
  }, [activeAccountId, userProfile]);

  useEffect(() => {
    if (!activeAccountId) return;
    localStorage.setItem(
      heartsKey(activeAccountId),
      JSON.stringify(heartedItems),
    );
  }, [activeAccountId, heartedItems]);

  useEffect(() => {
    localStorage.setItem(GLOBAL_COLLABS_KEY, JSON.stringify(collabRequests));
  }, [collabRequests]);

  const handleOnboardingComplete = (interests: string[], major: string) => {
    setUserProfile((prev) => (prev ? { ...prev, interests, major } : prev));
    setOnboardingComplete(true);
  };

  const handleHeart = (item: DiscoveryItem) => {
    if (!heartedItems.find((h) => h.id === item.id)) {
      setHeartedItems((prev) => [...prev, item]);
    }
  };

  {
    /* olivia */
  }
  const submitRequest = () => {
    if (!userProfile) return;

    const isEvent = newReqType === DiscoveryType.EVENT;
    const isCollab = newReqType === DiscoveryType.COLLAB_REQUEST;

    const title =
      newReqTitle ||
      (isCollab ? newReqGoal : isEvent ? "New Event" : "New Broadcast");

    const description = isEvent
      ? newReqDescription?.trim() || `Event posted by ${userProfile.name}.`
      : isCollab
        ? `Project request by ${userProfile.name}. Target team size: ${newReqSize}.`
        : `Posted by ${userProfile.name}.`;

    {
      /* olivia */
    }
    const newItem: CollabRequest = {
      id: `req_${Date.now()}`,
      type: newReqType,
      title,
      description,
      tags: [userProfile.major, "Collaboration"],
      creatorId: userProfile.id,
      creatorName: userProfile.name,
      creatorAvatar: userProfile.avatar || "",
      participants: [],
      image: defaultImageFor(newReqType),

      targetGroupSize: isCollab ? newReqSize : undefined,

      eventDate: isEvent ? eventDate : undefined,
      eventTime: isEvent ? eventTime : undefined,
    };

    setCollabRequests((prev) => [newItem, ...prev]);

    // reset modal state
    setIsCollabModalOpen(false);
    setNewReqTitle("");
    setNewReqDescription("");
    setEventDate("");
    setEventTime("");
    setNewReqType(DiscoveryType.COLLAB_REQUEST);
    setActiveTab("discover");
  };

  const onToggleInterested = (requestId: string) => {
    if (!activeAccountId) return;

    setCollabRequests((prev) => {
      const next = prev.map((r) => {
        if (r.id !== requestId) return r;

        const participants = Array.isArray(r.participants)
          ? r.participants
          : [];
        const already = participants.includes(activeAccountId);

        return {
          ...r,
          participants: already
            ? participants.filter((id) => id !== activeAccountId)
            : [...participants, activeAccountId],
        };
      });

      localStorage.setItem(GLOBAL_COLLABS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleArrayItem = (
    field: "skills" | "experience",
    index: number,
    value: string,
  ) => {
    setUserProfile((prev) => {
      if (!prev) return prev;
      const updated = [...prev[field]];
      updated[index] = value;
      return { ...prev, [field]: updated };
    });
  };

  const addArrayItem = (field: "skills" | "experience") => {
    setUserProfile((prev) =>
      prev ? { ...prev, [field]: [...prev[field], ""] } : prev,
    );
  };

  const removeArrayItem = (field: "skills" | "experience", index: number) => {
    setUserProfile((prev) =>
      prev
        ? { ...prev, [field]: prev[field].filter((_, i) => i !== index) }
        : prev,
    );
  };

  const handleUpdateKey = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasPersonalKey(true);
    }
  };

  {
    /* Olivia */
  }
  const needsDetails =
    newReqType === DiscoveryType.EVENT ||
    newReqType === DiscoveryType.NETWORKING ||
    newReqType === DiscoveryType.CLUB;

  if (showWelcome) {
    return (
      <Welcome
        onStart={() => {
          setShowWelcome(false);
          setActiveTab("discover");
        }}
      />
    );
  }

  if (!userProfile) return null;
  if (!onboardingComplete)
    return <Onboarding onComplete={handleOnboardingComplete} />;


  const handleDeleteProfile = () => {
      if (!activeAccountId) return;

      const confirmed = window.confirm(
        "Are you sure you want to delete this profile? This will remove its saved chat history and calendar activities from this device."
      );

      if (!confirmed) return;

      const accountIdToDelete = activeAccountId;

      // Remove this user's saved data
      localStorage.removeItem(profileKey(accountIdToDelete));
      localStorage.removeItem(heartsKey(accountIdToDelete));
      localStorage.removeItem(
        `behaviour_change_session_${accountIdToDelete}`
      );
      localStorage.removeItem(
        `behaviour_change_chat_${accountIdToDelete}`
      );
      localStorage.removeItem(
        `behaviour_change_activities_${accountIdToDelete}`
      );

      const remainingAccounts = accounts.filter(
        (account) => account.id !== accountIdToDelete
      );

      if (remainingAccounts.length > 0) {
        localStorage.setItem(
          ACCOUNTS_KEY,
          JSON.stringify(remainingAccounts)
        );

        const nextAccountId = remainingAccounts[0].id;

        localStorage.setItem(
          ACTIVE_ACCOUNT_KEY,
          nextAccountId
        );

        setAccounts(remainingAccounts);
        setActiveAccountId(nextAccountId);
      } else {
        const id = makeAccountId();

        const newAccount: Account = {
          id,
          name: "New User",
          createdAt: Date.now(),
        };

        localStorage.setItem(
          ACCOUNTS_KEY,
          JSON.stringify([newAccount])
        );

        localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);

        setAccounts([newAccount]);
        setActiveAccountId(id);
      }

      setShowWelcome(false);
      setOnboardingComplete(true);
      setActiveTab("coach");
    };

  const renderContent = () => {
    switch (activeTab) {
      case "discover":
        return (
          <div className="h-full flex flex-col items-start p-6 lg:p-12 animate-in fade-in zoom-in-95 duration-500">
            <header className="w-full mb-6 px-8 py-6 text-left">
              <span className="text-xs font-black text-white/80 uppercase tracking-[0.3em] mb-2 block">
                Discovery
              </span>
              <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight">
                Connect with McGill
              </h1>
            </header>

            <div className="w-full flex-1">
              <DiscoverySwipe
                onHeart={handleHeart}
                externalItems={collabRequests}
                userInterests={userProfile.interests}
                onToggleInterested={onToggleInterested}
              />
            </div>
          </div>
        );
      case "coach":
        return (
          <BehaviourChangeChat
            key={activeAccountId}
            userId={activeAccountId!}
          />
        );
      case "resources":
        return <Resources />;

      case "calendar":
      return (
        <div className="p-6 lg:p-12 pb-32 animate-in fade-in duration-500 bg-sky-50 min-h-screen">
          <header className="mb-12 max-w-6xl mx-auto">
            <span className="text-xs font-bold text-sky-600 uppercase tracking-[0.3em] mb-2 block">
              Your Schedule
            </span>
            <h2 className="text-4xl lg:text-5xl font-black text-sky-950 tracking-tight">
              Activity Calendar
            </h2>
          </header>
            <Calendar
              key={activeAccountId}
              userId={activeAccountId!}
              savedItems={heartedItems}
              allItems={collabRequests}
              onSaveItem={handleHeart}
            />
          </div>
        );

      case "courses":
        return (
          <McGillCourses
            userProfile={userProfile} // #mariam
            activeAccountId={activeAccountId!} // #mariam
          />
        ); // #mariam

      case "profile":
        return (
          <div className="min-h-screen bg-sky-50 p-6 lg:p-12">
            <div className="max-w-4xl mx-auto">
              <div className="bg-sky-200 rounded-3xl p-6 mb-6 shadow-sm">
                <h1 className="text-2xl font-bold text-sky-950">
                  Profile
                </h1>

                <p className="text-sky-700 mt-2">
                  Manage your personal information and Behaviour Change Agent account.
                </p>
              </div>

              <div className="bg-white rounded-3xl shadow-lg border border-sky-100 p-8">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">

                  <div className="w-32 h-32 rounded-full overflow-hidden bg-sky-100 border-4 border-sky-200 flex-shrink-0">
                    <img
                      src={
                        userProfile.avatar?.trim()
                          ? userProfile.avatar
                          : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                              userProfile.name || "User"
                            )}`
                      }
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 w-full">
                    {isEditingProfile ? (
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-semibold text-sky-950 mb-2">
                            Name
                          </label>

                          <input
                            value={userProfile.name}
                            onChange={(event) =>
                              setUserProfile({
                                ...userProfile,
                                name: event.target.value,
                              })
                            }
                            className="w-full border border-sky-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-300"
                          />
                        </div>
                        

                        <div>
                          <label className="block text-sm font-semibold text-sky-950 mb-2">
                            Preferred Activities
                          </label>

                          <input
                            type="text"
                            value={activityInput}
                            onChange={(event) => setActivityInput(event.target.value)}
                            placeholder="e.g. Walking, Swimming, Yoga"
                            className="w-full border border-sky-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-300"
                          />

                          <p className="text-xs text-slate-400 mt-2">
                            Separate activities with commas.
                          </p>
                        </div>


                        <div>
                          <label className="block text-sm font-semibold text-sky-950 mb-2">
                            Profile Picture
                          </label>

                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) =>
                              handleAvatarFile(event.target.files?.[0] ?? null)
                            }
                            className="w-full border border-sky-200 rounded-xl px-4 py-3"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setUserProfile({
                                ...userProfile,
                                interests: activityInput
                                  .split(",")
                                  .map((activity) => activity.trim())
                                  .filter(Boolean),
                              });

                              setIsEditingProfile(false);
                            }}
                            className="bg-sky-500 text-white font-semibold px-5 py-3 rounded-xl hover:bg-sky-600"
                          >
                            Save Profile
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setUserProfile((previous) =>
                                previous
                                  ? { ...previous, avatar: "" }
                                  : previous
                              )
                            }
                            className="border border-sky-200 text-sky-700 font-semibold px-5 py-3 rounded-xl hover:bg-sky-50"
                          >
                            Remove Photo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-3xl font-bold text-sky-950">
                          {userProfile.name}
                        </h2>

                        <div className="mt-5">
                          <p className="text-sm font-semibold text-sky-700">
                            User ID
                          </p>

                          <p className="text-sm text-slate-500 mt-1 break-all">
                            {activeAccountId}
                          </p>
                        </div>

                        <div className="mt-5">
                          <p className="text-sm font-semibold text-sky-700">
                            Preferred Activities
                          </p>

                          {userProfile.interests.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {userProfile.interests.map((activity) => (
                                <span
                                  key={activity}
                                  className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-sm font-medium"
                                >
                                  {activity}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400 mt-1">
                              No preferred activities added yet.
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setActivityInput(userProfile.interests.join(", "));
                            setIsEditingProfile(true);
                          }}
                          className="mt-6 bg-sky-500 text-white font-semibold px-5 py-3 rounded-xl hover:bg-sky-600"
                        >
                          Edit Profile
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteProfile}
                          className="mt-3 border border-red-200 text-red-600 font-semibold px-5 py-3 rounded-xl hover:bg-red-50"
                        >
                          Delete Profile
                        </button>

                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <DiscoverySwipe
            userInterests={userProfile.interests}
            onHeart={handleHeart}
            externalItems={collabRequests}
            onToggleInterested={onToggleInterested}
          />
        );
    }
  };

  return (
    <div className="min-h-screen lg:flex bg-sky-50">
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        accounts={accounts}
        activeAccountId={activeAccountId}
        setActiveAccountId={(id) => {
          setActiveAccountId(id);
          localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
          setActiveTab("coach");
          setShowWelcome(false);
        }}
        onCreateAccount={() => {
          const id = makeAccountId();
          const newAcc = { id, name: "New User", createdAt: Date.now() };
          const next = [newAcc, ...accounts];

          setAccounts(next);
          localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));

          setActiveAccountId(id);
          localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);

          setShowWelcome(false);
          setOnboardingComplete(false);
          setActiveTab("coach");
        }}
      />

      <main className="flex-1 min-h-screen lg:ml-0 overflow-y-auto relative bg-transparent">
        {renderContent()}  
      </main>
    </div>
  );
};

export default App;
