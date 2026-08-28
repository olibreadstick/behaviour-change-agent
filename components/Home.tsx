import React, { useEffect, useState } from "react";

interface HomeProps {
  userId: string;
  userName: string;
  setActiveTab: (tab: string) => void;
}

interface WorkshopProgress {
  status: "not_started" | "in_progress" | "completed";
  updatedAt: string | null;
}

const Home: React.FC<HomeProps> = ({
  userId,
  userName,
  setActiveTab,
}) => {
  const [completedWorkshops, setCompletedWorkshops] =
    useState(0);

  useEffect(() => {
    const storageKey =
      `behaviour_change_workshop_progress_${userId}`;

    const saved = localStorage.getItem(storageKey);

    if (!saved) {
      setCompletedWorkshops(0);
      return;
    }

    try {
      const progress: Record<
        string,
        WorkshopProgress
      > = JSON.parse(saved);

      const completed = Object.values(
        progress
      ).filter(
        (item) => item.status === "completed"
      ).length;

      setCompletedWorkshops(completed);
    } catch {
      setCompletedWorkshops(0);
    }
  }, [userId]);

  const progressPercent =
    (completedWorkshops / 4) * 100;

  return (
    <div className="min-h-screen bg-sky-50 p-6 lg:p-12">
      <div className="max-w-6xl mx-auto">

        {/* Welcome */}
        <div className="bg-sky-200 rounded-3xl p-7 mb-6 shadow-sm">
          <p className="text-sm font-semibold text-sky-700">
            Welcome back
          </p>

          <h1 className="text-3xl font-bold text-sky-950 mt-1">
            {userName}
          </h1>

          <p className="text-sky-700 mt-3">
            Continue your behaviour change journey or
            choose what you would like support with today.
          </p>
        </div>

        {/* Workshop progress */}
        <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-sky-950">
                Your Progress
              </h2>

              <p className="text-sm text-sky-700 mt-1">
                {completedWorkshops} of 4 workshop activities completed
              </p>
            </div>

            <span className="text-xl font-bold text-sky-600">
              {Math.round(progressPercent)}%
            </span>
          </div>

          <div className="w-full bg-sky-100 rounded-full h-3 mt-4 overflow-hidden">
            <div
              className="bg-sky-500 h-3 rounded-full transition-all"
              style={{
                width: `${progressPercent}%`,
              }}
            />
          </div>
        </div>

        {/* Main options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Workshop */}
          <button
            type="button"
            onClick={() =>
              setActiveTab("workshop")
            }
            className="text-left bg-white border border-sky-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-sky-200 transition-all"
          >
            <p className="text-sm font-semibold text-sky-500">
              Workshops
            </p>

            <h2 className="text-xl font-bold text-sky-950 mt-2">
              Workshop Activities
            </h2>

            <p className="text-sky-700 mt-3">
              Access activities associated with your
              workshops and continue your progress.
            </p>

            <p className="text-sky-600 font-semibold mt-5">
              View Workshops →
            </p>
          </button>

          {/* Daily Coach */}
          <button
            type="button"
            onClick={() =>
              setActiveTab("coach")
            }
            className="text-left bg-white border border-sky-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-sky-200 transition-all"
          >
            <p className="text-sm font-semibold text-sky-500">
              Independent Support
            </p>

            <h2 className="text-xl font-bold text-sky-950 mt-2">
              Daily AI Coach
            </h2>

            <p className="text-sky-700 mt-3">
              Get support with your physical activity
              goals whenever you need it.
            </p>

            <p className="text-sky-600 font-semibold mt-5">
              Talk to the Coach →
            </p>
          </button>

          {/* Resources */}
          <button
            type="button"
            onClick={() =>
              setActiveTab("resources")
            }
            className="text-left bg-white border border-sky-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-sky-200 transition-all"
          >
            <p className="text-sm font-semibold text-sky-500">
              Learn
            </p>

            <h2 className="text-xl font-bold text-sky-950 mt-2">
              BCT Resources
            </h2>

            <p className="text-sky-700 mt-3">
              Learn about behaviour change techniques
              that can support your physical activity.
            </p>

            <p className="text-sky-600 font-semibold mt-5">
              Browse Resources →
            </p>
          </button>

          {/* Community */}
          <button
            type="button"
            onClick={() =>
              setActiveTab("community")
            }
            className="text-left bg-white border border-sky-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-sky-200 transition-all"
          >
            <p className="text-sm font-semibold text-sky-500">
              Connect
            </p>

            <h2 className="text-xl font-bold text-sky-950 mt-2">
              Community
            </h2>

            <p className="text-sky-700 mt-3">
              Share and discover tips from others about strategies
              that support physical activity.
            </p>

            <p className="text-sky-600 font-semibold mt-5">
              Explore Community →
            </p>
          </button>

          {/* Goals */}
          <button
            type="button"
            onClick={() =>
              setActiveTab("goals")
            }
            className="text-left bg-white border border-sky-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-sky-200 transition-all"
          >
            <p className="text-sm font-semibold text-sky-500">
              Goal Setting
            </p>

            <h2 className="text-xl font-bold text-sky-950 mt-2">
              Weekly Goals
            </h2>

            <p className="text-sky-700 mt-3">
              Set a physical activity goal for the week and keep
              track of what you are working toward.
            </p>

            <p className="text-sky-600 font-semibold mt-5">
              View Goals →
            </p>
          </button>

          {/* Calendar */}
          <button
            type="button"
            onClick={() =>
              setActiveTab("calendar")
            }
            className="text-left bg-white border border-sky-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-sky-200 transition-all"
          >
            <p className="text-sm font-semibold text-sky-500">
              Planning
            </p>

            <h2 className="text-xl font-bold text-sky-950 mt-2">
              Activity Calendar
            </h2>

            <p className="text-sky-700 mt-3">
              View your schedule and planned physical
              activities.
            </p>

            <p className="text-sky-600 font-semibold mt-5">
              Open Calendar →
            </p>
          </button>

        </div>
      </div>
    </div>
  );
};

export default Home;