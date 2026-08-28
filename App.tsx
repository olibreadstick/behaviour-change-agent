import React, { useState, useEffect } from "react";
import Navigation from "./components/Navigation";
import DiscoverySwipe from "./components/DiscoverySwipe";
import BehaviourChangeChat from "./components/BehaviourChangeChat";
import Onboarding from "./components/Onboarding";
import { DiscoveryItem, DiscoveryType, CollabRequest } from "./types";
import type { UserProfile } from "./types";
import Calendar from "./components/Calendar";
import Resources from "./components/Resources";
import Workshop from "./components/Workshop";
import CommunityBoard from "./components/CommunityBoard";
import AdminDashboard from "./components/AdminDashboard";
import GoalSetting from "./components/GoalSetting";
import { logUsageEvent } from "./utils/usageTracking";
import Home from "./components/Home";
import Login from "./components/Login";
import {
  loginParticipant,
  signupParticipant,
  loginAdmin,
  changeAdminPassword,
} from "./services/auth";

import {
  getParticipantSummary,
} from "./services/participants";

import {
  deleteParticipantProfile,
  getParticipantProfile,
  saveParticipantProfile,
} from "./services/profile";

const ACCOUNTS_KEY = "uc_accounts";
const ACTIVE_ACCOUNT_KEY = "uc_active_account";
const GLOBAL_COLLABS_KEY = "uc_global_collabs";

const heartsKey = (id: string) => `uc_hearted_${id}`;

type Account = { id: string; name: string; createdAt: number };

type AuthSession =
  | {
      role: "participant";
      userId: string;
    }
  | {
      role: "admin";
    };

type PenguinBodyColour =
  | "blue"
  | "pink"
  | "purple"
  | "green"
  | "red";

type GlassesColour =
  | "none"
  | "sky"
  | "pink"
  | "purple"
  | "green"
  | "red";

interface PenguinCustomization {
  bodyColour: PenguinBodyColour;
  glassesColour: GlassesColour;
}

const ACCESSORY_COLOURS = [
  { id: "sky", label: "Sky", value: "#38bdf8" },
  { id: "pink", label: "Pink", value: "#f472b6" },
  { id: "purple", label: "Purple", value: "#a78bfa" },
  { id: "green", label: "Green", value: "#4ade80" },
  { id: "red", label: "Red", value: "#ef4444" },
] as const;


const AUTH_SESSION_KEY =
  "support_agent_auth_session";



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
  const [activeTab, setActiveTab] = useState("home");

  const [authSession, setAuthSession] =
  useState<AuthSession | null>(() => {
    const saved = sessionStorage.getItem(
      AUTH_SESSION_KEY
    );

    if (!saved) {
      return null;
    }

    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });

const [
  showAdminPasswordForm,
  setShowAdminPasswordForm,
] = useState(false);

const [
  adminCurrentPassword,
  setAdminCurrentPassword,
] = useState("");

const [
  adminNewPassword,
  setAdminNewPassword,
] = useState("");

const [
  adminConfirmPassword,
  setAdminConfirmPassword,
] = useState("");

const [
  adminPasswordMessage,
  setAdminPasswordMessage,
] = useState("");

const [
  adminPasswordError,
  setAdminPasswordError,
] = useState("");

const [loginError, setLoginError] =
  useState("");

  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileNameInput, setProfileNameInput] =
  useState("");
  const [profileSaveError, setProfileSaveError] =
    useState("");

const [
  showPenguinCustomizer,
  setShowPenguinCustomizer,
] = useState(false);

const [
  penguinCustomization,
  setPenguinCustomization,
] = useState<PenguinCustomization>({
  bodyColour: "blue",
  glassesColour: "none",
});

const PENGUIN_IMAGES: Record<
  PenguinBodyColour,
  string
> = {
  blue: "/behaviour-logo.png",
  pink: "/penguin-pink.png",
  purple: "/penguin-purple.png",
  green: "/penguin-green.png",
  red: "/penguin-red.png",
};

const PENGUIN_BODY_COLOURS = [
  { id: "blue", label: "Default", value: "#38bdf8" },
  { id: "pink", label: "Pink", value: "#f472b6" },
  { id: "purple", label: "Purple", value: "#a78bfa" },
  { id: "green", label: "Green", value: "#4ade80" },
  { id: "red", label: "Red", value: "#ef4444" },
] as const;


  const [newReqType, setNewReqType] = useState<DiscoveryType>(
    DiscoveryType.COLLAB_REQUEST,
  );

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


useEffect(() => {
  const c = localStorage.getItem(
    GLOBAL_COLLABS_KEY
  );

  setCollabRequests(
    c ? JSON.parse(c) : []
  );

  const savedAccounts =
    localStorage.getItem(ACCOUNTS_KEY);

  const parsedAccounts: Account[] =
    savedAccounts
      ? JSON.parse(savedAccounts)
      : [];

  setAccounts(parsedAccounts);
}, []);


const handleAdminPasswordChange = async (
  event: React.FormEvent
) => {
  event.preventDefault();

  setAdminPasswordError("");
  setAdminPasswordMessage("");

  if (adminNewPassword.length < 8) {
    setAdminPasswordError(
      "New password must contain at least 8 characters."
    );
    return;
  }

  if (
    adminNewPassword !==
    adminConfirmPassword
  ) {
    setAdminPasswordError(
      "The new passwords do not match."
    );
    return;
  }

  try {
    const response =
      await changeAdminPassword(
        "admin",
        adminCurrentPassword,
        adminNewPassword
      );

    setAdminPasswordMessage(
      response.message
    );

    setAdminCurrentPassword("");
    setAdminNewPassword("");
    setAdminConfirmPassword("");

  } catch (error) {

    setAdminPasswordError(
      error instanceof Error
        ? error.message
        : "Unable to change password."
    );
  }
};



useEffect(() => {
  if (!authSession) {
    setActiveAccountId(null);
    return;
  }

  if (authSession.role === "admin") {
    setActiveAccountId(null);
    return;
  }

  if (accounts.length === 0) {
    return;
  }

  const participantExists =
    accounts.some(
      (account) =>
        account.id === authSession.userId
    );

  if (!participantExists) {
    sessionStorage.removeItem(
      AUTH_SESSION_KEY
    );

    setAuthSession(null);
    setActiveAccountId(null);

    return;
  }

  setActiveAccountId(
    authSession.userId
  );
}, [authSession, accounts]);



  useEffect(() => {
    if (!activeAccountId) return;

    let cancelled = false;

    const h = localStorage.getItem(
      heartsKey(activeAccountId)
    );
    const c = localStorage.getItem(
      GLOBAL_COLLABS_KEY
    );

    setHeartedItems(h ? JSON.parse(h) : []);
    setCollabRequests(c ? JSON.parse(c) : []);
    setUserProfile(null);
    setProfileSaveError("");

    const loadProfile = async () => {
      try {
        const profile =
          await getParticipantProfile(
            activeAccountId
          );

        if (cancelled) return;

        if (profile) {
          setUserProfile({
            id: activeAccountId,
            name: profile.displayName,
            major: "",
            interests: [],
            bio: "",
            avatar: "",
            gpa: "",
            skills: [],
            experience: [],
          });

          setPenguinCustomization({
            bodyColour:
              profile.bodyColour as PenguinBodyColour,
            glassesColour:
              profile.glassesColour as GlassesColour,
          });

          setOnboardingComplete(true);
        } else {
          setUserProfile({
            id: activeAccountId,
            name: "New User",
            major: "",
            interests: [],
            bio: "",
            avatar: "",
            gpa: "",
            skills: [],
            experience: [],
          });

          setPenguinCustomization({
            bodyColour: "blue",
            glassesColour: "none",
          });

          setOnboardingComplete(false);
        }
      } catch (error) {
        if (cancelled) return;

        setUserProfile({
          id: activeAccountId,
          name: "New User",
          major: "",
          interests: [],
          bio: "",
          avatar: "",
          gpa: "",
          skills: [],
          experience: [],
        });

        setPenguinCustomization({
          bodyColour: "blue",
          glassesColour: "none",
        });

        setOnboardingComplete(false);
        setProfileSaveError(
          error instanceof Error
            ? error.message
            : "Unable to load participant profile."
        );
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [activeAccountId]);


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
    if (!activeAccountId) return;
    localStorage.setItem(
      heartsKey(activeAccountId),
      JSON.stringify(heartedItems),
    );
  }, [activeAccountId, heartedItems]);

  useEffect(() => {
    localStorage.setItem(GLOBAL_COLLABS_KEY, JSON.stringify(collabRequests));
  }, [collabRequests]);

  useEffect(() => {
  if (!activeAccountId) return;

  const sessionKey =
    `behaviour_change_app_open_${activeAccountId}`;

  if (!sessionStorage.getItem(sessionKey)) {
    logUsageEvent(
      activeAccountId,
      "app_opened"
    );

    sessionStorage.setItem(
      sessionKey,
      "true"
    );
  }
}, [activeAccountId]);

useEffect(() => {
  if (!activeAccountId) return;

  // Don't count the admin dashboard as participant usage
  if (activeTab === "admin") return;

  logUsageEvent(
    activeAccountId,
    "page_viewed",
    {
      page: activeTab,
    }
  );
}, [activeTab, activeAccountId]);

const handleOnboardingComplete = async (
  name: string
) => {
  if (!activeAccountId) {
    throw new Error(
      "Participant account is not available."
    );
  }

  const savedProfile =
    await saveParticipantProfile(
      activeAccountId,
      {
        displayName: name,
        bodyColour:
          penguinCustomization.bodyColour,
        glassesColour:
          penguinCustomization.glassesColour,
      }
    );

  setUserProfile((previous) =>
    previous
      ? {
          ...previous,
          name: savedProfile.displayName,
        }
      : {
          id: activeAccountId,
          name: savedProfile.displayName,
          major: "",
          interests: [],
          bio: "",
          avatar: "",
          gpa: "",
          skills: [],
          experience: [],
        }
  );

  setPenguinCustomization({
    bodyColour:
      savedProfile.bodyColour as PenguinBodyColour,
    glassesColour:
      savedProfile.glassesColour as GlassesColour,
  });

  setProfileSaveError("");
  setOnboardingComplete(true);
  setActiveTab("home");
};

const handleProfileNameSave = async () => {
  if (!activeAccountId || !userProfile) {
    return;
  }

  const trimmedName =
    profileNameInput.trim();

  if (!trimmedName) return;

  setProfileSaveError("");

  try {
    const savedProfile =
      await saveParticipantProfile(
        activeAccountId,
        {
          displayName: trimmedName,
          bodyColour:
            penguinCustomization.bodyColour,
          glassesColour:
            penguinCustomization.glassesColour,
        }
      );

    setUserProfile({
      ...userProfile,
      name: savedProfile.displayName,
    });

    setIsEditingProfile(false);
  } catch (error) {
    setProfileSaveError(
      error instanceof Error
        ? error.message
        : "Unable to save profile name."
    );
  }
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


const handleParticipantLogin = async (
  username: string,
  password: string
) => {
  try {
    setLoginError("");

    const authResponse =
      await loginParticipant(
        username,
        password
      );

    const participant =
      await getParticipantSummary(
        authResponse.participantId
      );

    const participantExists =
      accounts.some(
        (account) =>
          account.id ===
          participant.participantId
      );

    if (!participantExists) {
      const newAccount: Account = {
        id: participant.participantId,
        name: "Participant",
        createdAt: participant.createdAt,
      };

      const updatedAccounts = [
        ...accounts,
        newAccount,
      ];

      localStorage.setItem(
        ACCOUNTS_KEY,
        JSON.stringify(updatedAccounts)
      );

      setAccounts(updatedAccounts);
    }

    const session: AuthSession = {
      role: "participant",
      userId: participant.participantId,
    };

    sessionStorage.setItem(
      AUTH_SESSION_KEY,
      JSON.stringify(session)
    );

    localStorage.setItem(
      ACTIVE_ACCOUNT_KEY,
      participant.participantId
    );

    setAuthSession(session);

    setActiveAccountId(
      participant.participantId
    );

    setLoginError("");
    setActiveTab("home");

  } catch (error) {

    setLoginError(
      error instanceof Error
        ? error.message
        : "Unable to log in."
    );
  }
};

const handleParticipantAccountCreate = async (
  username: string,
  password: string
) => {
  try {
    setLoginError("");

    const authResponse =
      await signupParticipant(
        username,
        password
      );

    const participant =
      await getParticipantSummary(
        authResponse.participantId
      );

    const newAccount: Account = {
      id: participant.participantId,
      name: "Participant",
      createdAt: participant.createdAt,
    };

    const updatedAccounts = [
      ...accounts,
      newAccount,
    ];

    localStorage.setItem(
      ACCOUNTS_KEY,
      JSON.stringify(updatedAccounts)
    );

    localStorage.setItem(
      ACTIVE_ACCOUNT_KEY,
      participant.participantId
    );

    setAccounts(updatedAccounts);

    const session: AuthSession = {
      role: "participant",
      userId: participant.participantId,
    };

    sessionStorage.setItem(
      AUTH_SESSION_KEY,
      JSON.stringify(session)
    );

    setAuthSession(session);

    setActiveAccountId(
      participant.participantId
    );

    setUserProfile(null);
    setOnboardingComplete(false);
    setLoginError("");
    setActiveTab("home");

  } catch (error) {

    setLoginError(
      error instanceof Error
        ? error.message
        : "Unable to create account."
    );
  }
};


const handleAdminLogin = async (
  username: string,
  password: string
) => {
  try {
    setLoginError("");

    await loginAdmin(
      username,
      password
    );

    const session: AuthSession = {
      role: "admin",
    };

    sessionStorage.setItem(
      AUTH_SESSION_KEY,
      JSON.stringify(session)
    );

    setAuthSession(session);
    setActiveAccountId(null);
    setLoginError("");

  } catch (error) {

    setLoginError(
      error instanceof Error
        ? error.message
        : "Unable to log in as administrator."
    );
  }
};

const handleLogout = () => {
  sessionStorage.removeItem(
    AUTH_SESSION_KEY
  );

  setAuthSession(null);
  setActiveAccountId(null);
  setUserProfile(null);
  setOnboardingComplete(false);
  setActiveTab("home");
  setLoginError("");
}; 
  
  
  
  const needsDetails =
    newReqType === DiscoveryType.EVENT ||
    newReqType === DiscoveryType.NETWORKING ||
    newReqType === DiscoveryType.CLUB;

  if (!authSession) {
    return (
      <Login
        onParticipantLogin={
          handleParticipantLogin
        }
        onParticipantAccountCreate={
          handleParticipantAccountCreate
        }
        onAdminLogin={
          handleAdminLogin
        }
        error={loginError}
      />
    );
  }

  if (authSession.role === "admin") {
  return (
    <div className="min-h-screen bg-sky-50">

      {/* Admin Header */}
      <div className="bg-white border-b border-sky-100 px-4 md:px-8 py-4 flex items-center justify-between">

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">
            Support Agent
          </p>

          <h1 className="text-xl font-bold text-sky-950 mt-1">
            Administrator
          </h1>
        </div>

        <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setShowAdminPasswordForm(
              (previous) => !previous
            );

            setAdminPasswordError("");
            setAdminPasswordMessage("");
          }}
          className="
            border
            border-sky-200
            text-sky-700
            font-semibold
            px-4
            py-2.5
            rounded-xl
            hover:bg-sky-50
          "
        >
          Change Password
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="
            border
            border-sky-200
            text-sky-700
            font-semibold
            px-4
            py-2.5
            rounded-xl
            hover:bg-sky-50
          "
        >
          Log Out
        </button>
      </div>
      </div>

      {showAdminPasswordForm && (
  <div className="max-w-xl mx-auto mt-6 px-4">
    <div className="bg-white border border-sky-100 rounded-3xl shadow-lg p-6">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-sky-950">
            Change Administrator Password
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Enter your current password before
            choosing a new password.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setShowAdminPasswordForm(false)
          }
          className="text-2xl text-slate-400 hover:text-slate-700"
          aria-label="Close password form"
        >
          ×
        </button>
      </div>

      <form
        onSubmit={handleAdminPasswordChange}
        className="mt-6"
      >
        <div>
          <label className="block text-sm font-bold text-sky-950 mb-2">
            Current Password
          </label>

          <input
            type="password"
            value={adminCurrentPassword}
            onChange={(event) =>
              setAdminCurrentPassword(
                event.target.value
              )
            }
            autoComplete="current-password"
            className="
              w-full
              border
              border-sky-200
              rounded-xl
              px-4
              py-3
              outline-none
              focus:ring-2
              focus:ring-sky-300
            "
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-bold text-sky-950 mb-2">
            New Password
          </label>

          <input
            type="password"
            value={adminNewPassword}
            onChange={(event) =>
              setAdminNewPassword(
                event.target.value
              )
            }
            autoComplete="new-password"
            className="
              w-full
              border
              border-sky-200
              rounded-xl
              px-4
              py-3
              outline-none
              focus:ring-2
              focus:ring-sky-300
            "
          />

          <p className="text-xs text-slate-400 mt-2">
            Use at least 8 characters.
          </p>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-bold text-sky-950 mb-2">
            Confirm New Password
          </label>

          <input
            type="password"
            value={adminConfirmPassword}
            onChange={(event) =>
              setAdminConfirmPassword(
                event.target.value
              )
            }
            autoComplete="new-password"
            className="
              w-full
              border
              border-sky-200
              rounded-xl
              px-4
              py-3
              outline-none
              focus:ring-2
              focus:ring-sky-300
            "
          />
        </div>

        {adminPasswordError && (
          <div className="mt-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
            {adminPasswordError}
          </div>
        )}

        {adminPasswordMessage && (
          <div className="mt-4 bg-green-50 border border-green-100 text-green-700 text-sm rounded-xl px-4 py-3">
            {adminPasswordMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={
            !adminCurrentPassword ||
            !adminNewPassword ||
            !adminConfirmPassword
          }
          className="
            w-full
            mt-6
            bg-sky-600
            text-white
            font-bold
            py-3
            rounded-xl
            hover:bg-sky-700
            disabled:opacity-50
          "
        >
          Update Password
        </button>
      </form>
    </div>
  </div>
)}


      <AdminDashboard
        accounts={accounts}
      />

    </div>
  );
}

if (
  authSession.role === "participant" &&
  !userProfile
) {
  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center">
      <p className="text-sky-700 font-semibold">
        Loading your account...
      </p>
    </div>
  );
}



  if (!onboardingComplete)
    return (
      <Onboarding
        userId={activeAccountId!}
        onComplete={handleOnboardingComplete}
      />
    );


  const handleDeleteProfile = async () => {
    if (!activeAccountId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete your profile? This removes your saved display name and penguin customization from the backend and clears chat/calendar data saved on this device. Your participant login account and study data are not deleted."
    );

    if (!confirmed) return;

    try {
      await deleteParticipantProfile(
        activeAccountId
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to delete participant profile."
      );
      return;
    }

    localStorage.removeItem(
      heartsKey(activeAccountId)
    );
    localStorage.removeItem(
      `behaviour_change_session_${activeAccountId}`
    );
    localStorage.removeItem(
      `behaviour_change_chat_${activeAccountId}`
    );
    localStorage.removeItem(
      `behaviour_change_activities_${activeAccountId}`
    );
    localStorage.removeItem(
      `behaviour_change_penguin_${activeAccountId}`
    );

    setUserProfile({
      id: activeAccountId,
      name: "New User",
      major: "",
      interests: [],
      bio: "",
      avatar: "",
      gpa: "",
      skills: [],
      experience: [],
    });

    setPenguinCustomization({
      bodyColour: "blue",
      glassesColour: "none",
    });

    setProfileSaveError("");
    setShowPenguinCustomizer(false);
    setOnboardingComplete(false);
    setActiveTab("home");
  };


const updatePenguinCustomization = async (
  updates: Partial<PenguinCustomization>
) => {
  if (!activeAccountId || !userProfile) {
    return;
  }

  const previous = penguinCustomization;
  const updated = {
    ...previous,
    ...updates,
  };

  setPenguinCustomization(updated);
  setProfileSaveError("");

  try {
    await saveParticipantProfile(
      activeAccountId,
      {
        displayName: userProfile.name,
        bodyColour: updated.bodyColour,
        glassesColour:
          updated.glassesColour,
      }
    );
  } catch (error) {
    setPenguinCustomization(previous);
    setProfileSaveError(
      error instanceof Error
        ? error.message
        : "Unable to save penguin customization."
    );
  }
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

      case "home":
      return (
        <Home
          key={activeAccountId}
          userId={activeAccountId!}
          userName={userProfile.name}
          setActiveTab={setActiveTab}
        />
      );

      case "workshop":
        return (
          <Workshop
            key={activeAccountId}
            userId={activeAccountId!}
          />
        ); 
      case "coach":
        return (
          <BehaviourChangeChat
            key={activeAccountId}
            userId={activeAccountId!}
          />
        );
      case "community":
        return (
          <CommunityBoard
            key={activeAccountId}
            userId={activeAccountId!}
          />
        );
      case "goals":
        return (
          <GoalSetting
            key={activeAccountId}
            userId={activeAccountId!}
          />
        );
      case "resources":
        return (
          <Resources
            userId={activeAccountId!}
          />
        );

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

      case "profile":
      return (
        <div className="min-h-screen bg-sky-50 p-4 md:p-6 lg:p-12">
          <div className="max-w-4xl mx-auto">

            {/* Header */}
            <div className="bg-sky-200 rounded-3xl p-6 md:p-8 mb-6 shadow-sm">
              <h1 className="text-2xl md:text-3xl font-bold text-sky-950">
                Profile
              </h1>

              <p className="text-sky-700 mt-2">
                Manage your Behaviour Change Agent profile
                and personalize your penguin.
              </p>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-3xl shadow-lg border border-sky-100 p-6 md:p-8">

              {profileSaveError && (
                <div className="mb-6 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                  {profileSaveError}
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-8 md:gap-12">

                {/* Penguin */}
                <div className="flex flex-col items-center shrink-0">

                  {/* Penguin Preview */}
<div className="relative w-48 h-48 md:w-56 md:h-56">

  {/* Base Penguin */}
  <img
    src={
      PENGUIN_IMAGES[
        penguinCustomization.bodyColour
      ]
    }
    alt="Your customized penguin"
    className="absolute inset-0 w-full h-full object-contain"
  />

  {/* Glasses */}
  {penguinCustomization.glassesColour !== "none" && (
    <div className="absolute top-[25%] left-1/2 -translate-x-1/2 flex items-center">

      {/* Left lens */}
      <div
        className="w-9 h-7 rounded-full border-[3px] bg-white/20"
        style={{
          borderColor:
            ACCESSORY_COLOURS.find(
              (colour) =>
                colour.id ===
                penguinCustomization.glassesColour
            )?.value,
        }}
      />

      {/* Bridge */}
      <div
        className="w-4 h-[3px]"
        style={{
          backgroundColor:
            ACCESSORY_COLOURS.find(
              (colour) =>
                colour.id ===
                penguinCustomization.glassesColour
            )?.value,
        }}
      />

      {/* Right lens */}
      <div
        className="w-9 h-7 rounded-full border-[3px] bg-white/20"
        style={{
          borderColor:
            ACCESSORY_COLOURS.find(
              (colour) =>
                colour.id ===
                penguinCustomization.glassesColour
            )?.value,
        }}
      />
    </div>
  )}

</div>

                  <p className="text-sm font-semibold text-sky-700 mt-2">
                    Your Penguin
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setShowPenguinCustomizer(
                        (previous) => !previous
                      )
                    }
                    className="
                      mt-4
                      border
                      border-sky-300
                      bg-white
                      text-sky-700
                      font-semibold
                      px-5
                      py-2.5
                      rounded-xl
                      hover:bg-sky-50
                    "
                  >
                    Customize Penguin
                  </button>

                </div>

                {/* Profile Information */}
                <div className="flex-1 min-w-0">

                  {isEditingProfile ? (
                    <div>
                      <label className="block text-sm font-semibold text-sky-950 mb-2">
                        Name
                      </label>

                      <input
                        type="text"
                        value={profileNameInput}
                        onChange={(event) =>
                          setProfileNameInput(
                            event.target.value
                          )
                        }
                        className="
                          w-full
                          border
                          border-sky-200
                          rounded-xl
                          px-4
                          py-3
                          outline-none
                          focus:ring-2
                          focus:ring-sky-300
                        "
                      />

                      <div className="flex flex-wrap gap-3 mt-4">
                        <button
                          type="button"
                          disabled={
                            !profileNameInput.trim()
                          }
                          onClick={() => {
                            void handleProfileNameSave();
                          }}
                          className="
                            bg-sky-500
                            text-white
                            font-semibold
                            px-5
                            py-3
                            rounded-xl
                            hover:bg-sky-600
                            disabled:opacity-50
                          "
                        >
                          Save Name
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setProfileNameInput("");
                            setIsEditingProfile(false);
                          }}
                          className="
                            bg-slate-100
                            text-slate-600
                            font-semibold
                            px-5
                            py-3
                            rounded-xl
                            hover:bg-slate-200
                          "
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-3xl font-bold text-sky-950">
                        {userProfile.name}
                      </h2>

                      {/* User ID */}
                      <div className="mt-6">
                        <p className="text-sm font-semibold text-sky-700">
                          User ID
                        </p>

                        <p className="text-sm text-slate-500 mt-1 break-all">
                          {activeAccountId}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileNameInput(
                            userProfile.name
                          );

                          setIsEditingProfile(true);
                        }}
                        className="
                          mt-6
                          bg-sky-500
                          text-white
                          font-semibold
                          px-5
                          py-3
                          rounded-xl
                          hover:bg-sky-600
                        "
                      >
                        Edit Name
                      </button>
                    </>
                  )}
                </div>
              </div>
{/* Penguin Customizer */}
{showPenguinCustomizer && (
  <div className="mt-8 pt-8 border-t border-sky-100">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-xl font-bold text-sky-950">
          Customize Your Penguin
        </h3>

        <p className="text-sm text-slate-500 mt-1">
          Make your penguin your own.
        </p>
      </div>

      <button
        type="button"
        onClick={() =>
          setShowPenguinCustomizer(false)
        }
        className="text-slate-400 hover:text-slate-700 text-2xl"
        aria-label="Close penguin customization"
      >
        ×
      </button>
    </div>

    {/* Penguin Colour */}
<div className="mt-6">
  <p className="text-sm font-bold text-sky-950 mb-3">
    Penguin Colour
  </p>

  <div className="flex flex-wrap gap-3">
    {PENGUIN_BODY_COLOURS.map((colour) => (
      <button
        key={colour.id}
        type="button"
        onClick={() => {
          void updatePenguinCustomization({
            bodyColour: colour.id,
          });
        }}
        title={colour.label}
        aria-label={`${colour.label} penguin`}
        className={`w-12 h-12 rounded-full border-4 transition ${
          penguinCustomization.bodyColour ===
          colour.id
            ? "border-sky-700 scale-110"
            : "border-white shadow"
        }`}
        style={{
          backgroundColor: colour.value,
        }}
      />
    ))}
  </div>
</div>

{/* Glasses */}
<div className="mt-7">
  <p className="text-sm font-bold text-sky-950 mb-3">
    Glasses
  </p>

  <div className="flex flex-wrap items-center gap-3">

    {/* No Glasses */}
    <button
      type="button"
      onClick={() => {
        void updatePenguinCustomization({
          glassesColour: "none",
        });
      }}
      className={`h-11 px-4 rounded-xl border text-sm font-semibold transition ${
        penguinCustomization.glassesColour === "none"
          ? "bg-sky-100 border-sky-500 text-sky-800"
          : "bg-white border-sky-200 text-slate-600 hover:bg-sky-50"
      }`}
    >
      No Glasses
    </button>

    {/* Glasses Colours */}
    {ACCESSORY_COLOURS.map((colour) => (
      <button
        key={colour.id}
        type="button"
        onClick={() => {
          void updatePenguinCustomization({
            glassesColour: colour.id,
          });
        }}
        title={`${colour.label} glasses`}
        aria-label={`${colour.label} glasses`}
        className={`w-11 h-11 rounded-full border-4 transition ${
          penguinCustomization.glassesColour ===
          colour.id
            ? "border-sky-700 scale-110"
            : "border-white shadow"
        }`}
        style={{
          backgroundColor: colour.value,
        }}
      />
    ))}
  </div>
</div>

  </div>
)}

              {/* Delete Profile */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleDeleteProfile}
                  className="
                    border
                    border-red-200
                    text-red-600
                    font-semibold
                    px-5
                    py-3
                    rounded-xl
                    hover:bg-red-50
                  "
                >
                  Delete Profile
                </button>
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
        onLogout={handleLogout}
      />

      <main className="flex-1 min-h-screen lg:ml-0 overflow-y-auto relative bg-transparent">
        {renderContent()}  
      </main>
    </div>
  );
};

export default App;

