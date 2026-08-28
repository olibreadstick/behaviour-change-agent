import React, { useState } from "react";

type LoginMode = "participant" | "admin";
type ParticipantMode = "login" | "signup";

interface LoginProps {
  onParticipantLogin: (
    username: string,
    password: string
  ) => void;

  onAdminLogin: (
    username: string,
    password: string
  ) => void;

  onParticipantAccountCreate: (
    username: string,
    password: string
  ) => void;

  error?: string;
}

const Login: React.FC<LoginProps> = ({
  onParticipantLogin,
  onAdminLogin,
  onParticipantAccountCreate,
  error = "",
}) => {
  const [mode, setMode] =
    useState<LoginMode>("participant");

  const [participantMode, setParticipantMode] =
    useState<ParticipantMode>("login");

  const [loginUsername, setLoginUsername] =
    useState("");

  const [loginPassword, setLoginPassword] =
    useState("");

  const [newUsername, setNewUsername] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [signupError, setSignupError] =
    useState("");

  const [adminUsername, setAdminUsername] =
    useState("");

  const [adminPassword, setAdminPassword] =
    useState("");

  const handleParticipantSubmit = (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const username = loginUsername.trim();

    if (!username || !loginPassword) {
      return;
    }

    onParticipantLogin(
      username,
      loginPassword
    );
  };

  const handleSignupSubmit = (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const username = newUsername.trim();

    if (!username) {
      setSignupError(
        "Please choose a username."
      );
      return;
    }

    if (newPassword.length < 6) {
      setSignupError(
        "Your password must contain at least 6 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setSignupError(
        "The passwords do not match."
      );
      return;
    }

    setSignupError("");

    onParticipantAccountCreate(
      username,
      newPassword
    );
  };

  const handleAdminSubmit = (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (
      !adminUsername.trim() ||
      !adminPassword
    ) {
      return;
    }

    onAdminLogin(
      adminUsername.trim(),
      adminPassword
    );
  };

  const switchParticipantMode = (
    newMode: ParticipantMode
  ) => {
    setParticipantMode(newMode);
    setSignupError("");
  };

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/behaviour-logo.png"
            alt="TIE the Support Agent"
            className="w-32 h-32 object-contain mx-auto"
          />

          <h1 className="text-3xl font-black text-sky-950 mt-4">
            TIE
          </h1>

          <p className="text-sm font-semibold text-sky-600 uppercase tracking-[0.18em] mt-1">
            The Support Agent
          </p>

          <p className="text-slate-500 mt-4">
            {mode === "admin"
              ? "Administrator sign in"
              : participantMode === "signup"
                ? "Welcome to TIE, the Support Agent"
                : "Sign in to continue"}
          </p>
        </div>

        {/* Main Login Card */}
        <div className="bg-white border border-sky-100 rounded-3xl shadow-lg p-6 md:p-8">

          {/* Participant / Administrator */}
          <div className="grid grid-cols-2 bg-sky-50 rounded-xl p-1 mb-7">
            <button
              type="button"
              onClick={() => {
                setMode("participant");
                setSignupError("");
              }}
              className={`py-3 rounded-lg text-sm font-semibold transition ${
                mode === "participant"
                  ? "bg-white text-sky-700 shadow-sm"
                  : "text-slate-500 hover:text-sky-700"
              }`}
            >
              Participant
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("admin");
                setSignupError("");
              }}
              className={`py-3 rounded-lg text-sm font-semibold transition ${
                mode === "admin"
                  ? "bg-white text-sky-700 shadow-sm"
                  : "text-slate-500 hover:text-sky-700"
              }`}
            >
              Administrator
            </button>
          </div>

          {mode === "participant" ? (
            <>
              {/* Participant Login / Create Account */}
              <div className="flex justify-center gap-6 border-b border-sky-100 mb-6">
                <button
                  type="button"
                  onClick={() =>
                    switchParticipantMode("login")
                  }
                  className={`pb-3 text-sm font-bold border-b-2 transition ${
                    participantMode === "login"
                      ? "border-sky-500 text-sky-700"
                      : "border-transparent text-slate-400 hover:text-sky-600"
                  }`}
                >
                  Log In
                </button>

                <button
                  type="button"
                  onClick={() =>
                    switchParticipantMode("signup")
                  }
                  className={`pb-3 text-sm font-bold border-b-2 transition ${
                    participantMode === "signup"
                      ? "border-sky-500 text-sky-700"
                      : "border-transparent text-slate-400 hover:text-sky-600"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {participantMode === "login" ? (
                <form onSubmit={handleParticipantSubmit}>
                  <div>
                    <label
                      htmlFor="login-username"
                      className="block text-sm font-bold text-sky-950 mb-2"
                    >
                      Username
                    </label>

                    <input
                      id="login-username"
                      type="text"
                      value={loginUsername}
                      onChange={(event) =>
                        setLoginUsername(event.target.value)
                      }
                      placeholder="Enter your username"
                      autoComplete="username"
                      className="w-full border border-sky-200 rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-sky-300"
                    />
                  </div>

                  <div className="mt-4">
                    <label
                      htmlFor="login-password"
                      className="block text-sm font-bold text-sky-950 mb-2"
                    >
                      Password
                    </label>

                    <input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(event) =>
                        setLoginPassword(event.target.value)
                      }
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="w-full border border-sky-200 rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-sky-300"
                    />
                  </div>

                  <p className="text-xs text-slate-400 mt-3">
                    Sign in using the username and password
                    you created for your Support Agent account.
                  </p>

                  {error && (
                    <div className="mt-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      !loginUsername.trim() ||
                      !loginPassword
                    }
                    className="w-full mt-6 bg-sky-500 text-white font-bold py-3.5 rounded-xl hover:bg-sky-600 disabled:opacity-50 transition"
                  >
                    Log In
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignupSubmit}>
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-sky-950">
                      Welcome to TIE
                    </h2>

                    <p className="text-sm font-semibold text-sky-600 mt-1">
                      Your Support Agent
                    </p>

                    <p className="text-sm text-slate-500 mt-4 leading-relaxed">
                      Create your account to get started.
                      Choose a username and password that
                      you will use to access your Support Agent.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="new-username"
                      className="block text-sm font-bold text-sky-950 mb-2"
                    >
                      Username
                    </label>

                    <input
                      id="new-username"
                      type="text"
                      value={newUsername}
                      onChange={(event) =>
                        setNewUsername(event.target.value)
                      }
                      placeholder="Choose a username"
                      autoComplete="username"
                      className="w-full border border-sky-200 rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-sky-300"
                    />
                  </div>

                  <div className="mt-4">
                    <label
                      htmlFor="new-password"
                      className="block text-sm font-bold text-sky-950 mb-2"
                    >
                      Password
                    </label>

                    <input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(event) =>
                        setNewPassword(event.target.value)
                      }
                      placeholder="Create a password"
                      autoComplete="new-password"
                      className="w-full border border-sky-200 rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-sky-300"
                    />

                    <p className="text-xs text-slate-400 mt-2">
                      Use at least 6 characters.
                    </p>
                  </div>

                  <div className="mt-4">
                    <label
                      htmlFor="confirm-password"
                      className="block text-sm font-bold text-sky-950 mb-2"
                    >
                      Confirm Password
                    </label>

                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      placeholder="Enter your password again"
                      autoComplete="new-password"
                      className="w-full border border-sky-200 rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-sky-300"
                    />
                  </div>

{/* Privacy note */}
<div className="mt-5 bg-sky-50 border border-sky-100 rounded-xl p-4">
  <div className="flex gap-3">
    <div className="shrink-0">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5 text-sky-700 mt-0.5"
      >
        <rect
          width="18"
          height="11"
          x="3"
          y="11"
          rx="2"
          ry="2"
        />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </div>

    <div>
      <p className="text-sm font-bold text-sky-950">
        Your login information stays private
      </p>

      <p className="text-xs text-sky-800 mt-2 leading-relaxed">
        Your username and password are used only
        to access your Support Agent account and
        are not displayed in the researcher
        dashboard.
      </p>

      <p className="text-xs text-sky-800 mt-2 leading-relaxed">
        Your account will also be assigned an
        anonymous Participant ID. Researchers
        will use this ID rather than your username,
        password, or name to identify your study
        data.
      </p>
    </div>
  </div>
</div>

                  {signupError && (
                    <div className="mt-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                      {signupError}
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      !newUsername.trim() ||
                      !newPassword ||
                      !confirmPassword
                    }
                    className="w-full mt-6 bg-sky-500 text-white font-bold py-3.5 rounded-xl hover:bg-sky-600 disabled:opacity-50 transition"
                  >
                    Create Account
                  </button>
                </form>
              )}
            </>
          ) : (
            <form onSubmit={handleAdminSubmit}>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-sky-950">
                  Administrator Access
                </h2>

                <p className="text-sm text-slate-500 mt-2">
                  Sign in to access study monitoring and moderation.
                </p>
              </div>

              <div>
                <label
                  htmlFor="admin-username"
                  className="block text-sm font-bold text-sky-950 mb-2"
                >
                  Admin Username
                </label>

                <input
                  id="admin-username"
                  type="text"
                  value={adminUsername}
                  onChange={(event) =>
                    setAdminUsername(event.target.value)
                  }
                  placeholder="Enter admin username"
                  autoComplete="username"
                  className="w-full border border-sky-200 rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>

              <div className="mt-4">
                <label
                  htmlFor="admin-password"
                  className="block text-sm font-bold text-sky-950 mb-2"
                >
                  Password
                </label>

                <input
                  id="admin-password"
                  type="password"
                  value={adminPassword}
                  onChange={(event) =>
                    setAdminPassword(event.target.value)
                  }
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                  className="w-full border border-sky-200 rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  !adminUsername.trim() ||
                  !adminPassword
                }
                className="w-full mt-6 bg-sky-700 text-white font-bold py-3.5 rounded-xl hover:bg-sky-800 disabled:opacity-50 transition"
              >
                Admin Log In
              </button>
            </form>
          )}
        </div>

        <p className="text-xs text-slate-400 text-center mt-5">
          Support Agent
        </p>
      </div>
    </div>
  );
};

export default Login;
