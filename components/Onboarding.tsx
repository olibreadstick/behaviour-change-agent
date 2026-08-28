import React, { useState } from "react";

interface OnboardingProps {
  userId: string;
  onComplete: (name: string) => Promise<void>;
}

const Onboarding: React.FC<OnboardingProps> = ({
  userId,
  onComplete,
}) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleContinue = () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    setSaveError("");
    setStep(2);
  };

  const handleFinish = async () => {
    const trimmedName = name.trim();

    if (!trimmedName || isSaving) {
      return;
    }

    setSaveError("");
    setIsSaving(true);

    try {
      await onComplete(trimmedName);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to save your profile. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-lg border border-sky-100 p-6 md:p-10">

        {/* Progress */}
        <div className="flex gap-2 max-w-xs mx-auto mb-10">
          {[1, 2].map((currentStep) => (
            <div
              key={currentStep}
              className={`h-2 flex-1 rounded-full transition ${
                step >= currentStep
                  ? "bg-sky-500"
                  : "bg-sky-100"
              }`}
            />
          ))}
        </div>

        {step === 1 ? (
          <>
            {/* Step 1 */}
            <div className="text-center">
              <img
                src="/behaviour-logo.png"
                alt="Support Agent"
                className="w-28 h-28 object-contain mx-auto"
              />

              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600 mt-4">
                Step 1 of 2
              </p>

              <h1 className="text-3xl md:text-4xl font-black text-sky-950 mt-3">
                Welcome to the Support Agent
              </h1>

              <p className="text-slate-500 mt-3">
                Before you get started, tell us what
                you would like your Support Agent to
                call you.
              </p>
            </div>

            {/* Name */}
            <div className="mt-8">
              <label
                htmlFor="participant-name"
                className="block text-sm font-bold text-sky-950 mb-2"
              >
                What would you like to be called?
              </label>

              <input
                id="participant-name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Enter your name"
                autoComplete="off"
                className="
                  w-full
                  border
                  border-sky-200
                  rounded-xl
                  px-4
                  py-3
                  text-base
                  outline-none
                  focus:ring-2
                  focus:ring-sky-300
                "
              />
            </div>

            {/* Privacy Notice */}
            <div className="mt-5 bg-sky-50 border border-sky-200 rounded-2xl p-5">
              <div className="flex gap-3">
                <div className="shrink-0 w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5 text-sky-700"
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
                  <h2 className="font-bold text-sky-950">
                    Your name stays private
                  </h2>

                  <p className="text-sm text-sky-800 mt-2 leading-relaxed">
                    Your name is used only to personalize
                    your experience in the Support Agent.
                    Researchers using the study dashboard
                    cannot access your name.
                  </p>

                  <p className="text-sm text-sky-800 mt-2 leading-relaxed">
                    Your study data is associated with
                    your anonymous Participant ID rather
                    than your name.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleContinue}
              disabled={!name.trim()}
              className="
                w-full
                mt-7
                bg-sky-500
                text-white
                font-bold
                py-3.5
                rounded-xl
                hover:bg-sky-600
                disabled:opacity-50
                transition
              "
            >
              Continue
            </button>
          </>
        ) : (
          <>
            {/* Step 2 */}
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">
                Step 2 of 2
              </p>

              <h1 className="text-3xl md:text-4xl font-black text-sky-950 mt-3">
                Meet Tie your Support Agent
              </h1>

              <p className="text-slate-500 mt-3">
                Your penguin will be here to support
                you throughout your physical activity
                journey.
              </p>

              <img
                src="/behaviour-logo.png"
                alt="Your Support Agent penguin"
                className="w-56 h-56 object-contain mx-auto mt-5"
              />

              <div className="bg-sky-50 border border-sky-100 rounded-2xl p-5 mt-4">
                <p className="font-bold text-sky-950">
                  Hi {name.trim()}!
                </p>

                <p className="text-sm text-slate-500 mt-2">
                  You can customize your penguin later
                  from your Profile.
                </p>
              </div>

              {/* Participant ID */}
              <div className="mt-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Your Participant ID
                </p>

                <p className="text-sm font-semibold text-sky-700 mt-1 break-all">
                  {userId}
                </p>
              </div>
            </div>

            {saveError && (
              <div className="mt-5 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                {saveError}
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isSaving}
                className="
                  flex-1
                  bg-slate-100
                  text-slate-600
                  font-semibold
                  py-3.5
                  rounded-xl
                  hover:bg-slate-200
                  disabled:opacity-50
                "
              >
                Back
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleFinish();
                }}
                disabled={isSaving}
                className="
                  flex-[2]
                  bg-sky-500
                  text-white
                  font-bold
                  py-3.5
                  rounded-xl
                  hover:bg-sky-600
                  disabled:opacity-50
                "
              >
                {isSaving
                  ? "Saving..."
                  : "Enter Support Agent"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
