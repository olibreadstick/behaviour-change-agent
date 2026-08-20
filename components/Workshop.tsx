import React, { useEffect, useState } from "react";
import { logUsageEvent } from "../utils/usageTracking";

type WorkshopStatus = "not_started" | "in_progress" | "completed";

interface WorkshopProgress {
  status: WorkshopStatus;
  updatedAt: string | null;
}

interface WorkshopItem {
  id: string;
  week: string;
  title: string;
  description: string;
}

interface WorkshopProps {
  userId: string;
}

const workshops: WorkshopItem[] = [
  {
    id: "workshop_1",
    week: "Workshop 1",
    title: "Workshop Activity",
    description:
      "Your activity for this workshop will appear here.",
  },
  {
    id: "workshop_2",
    week: "Workshop 2",
    title: "Workshop Activity",
    description:
      "Your activity for this workshop will appear here.",
  },
  {
    id: "workshop_3",
    week: "Workshop 3",
    title: "Workshop Activity",
    description:
      "Your activity for this workshop will appear here.",
  },
  {
    id: "workshop_4",
    week: "Workshop 4",
    title: "Workshop Activity",
    description:
      "Your activity for this workshop will appear here.",
  },
];

const createInitialProgress = (): Record<string, WorkshopProgress> => {
  return workshops.reduce(
    (progress, workshop) => {
      progress[workshop.id] = {
        status: "not_started",
        updatedAt: null,
      };

      return progress;
    },
    {} as Record<string, WorkshopProgress>
  );
};

const Workshop: React.FC<WorkshopProps> = ({ userId }) => {
  const storageKey = `behaviour_change_workshop_progress_${userId}`;

  const [progress, setProgress] = useState<
    Record<string, WorkshopProgress>
  >(() => {
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        return {
          ...createInitialProgress(),
          ...JSON.parse(saved),
        };
      } catch {
        return createInitialProgress();
      }
    }

    return createInitialProgress();
  });

  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify(progress)
    );
  }, [progress, storageKey]);

  const updateStatus = (
  workshopId: string,
  status: WorkshopStatus
) => {
  setProgress((previous) => ({
    ...previous,
    [workshopId]: {
      status,
      updatedAt: new Date().toISOString(),
    },
  }));

  const workshop = workshops.find(
    (item) => item.id === workshopId
  );

  if (status === "in_progress") {
    logUsageEvent(
      userId,
      "workshop_started",
      {
        workshopId,
        workshop: workshop?.week ?? workshopId,
      }
    );
  }

  if (status === "completed") {
    logUsageEvent(
      userId,
      "workshop_completed",
      {
        workshopId,
        workshop: workshop?.week ?? workshopId,
      }
    );
  }
};

  const getStatusLabel = (status: WorkshopStatus) => {
    switch (status) {
      case "in_progress":
        return "In Progress";

      case "completed":
        return "Completed";

      default:
        return "Not Started";
    }
  };

  const getStatusStyle = (status: WorkshopStatus) => {
    switch (status) {
      case "in_progress":
        return "bg-amber-100 text-amber-700";

      case "completed":
        return "bg-green-100 text-green-700";

      default:
        return "bg-slate-100 text-slate-500";
    }
  };

  const completedCount = workshops.filter(
    (workshop) =>
      progress[workshop.id]?.status === "completed"
  ).length;

  return (
    <div className="min-h-screen bg-sky-50 p-6 lg:p-12">
      <div className="max-w-5xl mx-auto">
        <div className="bg-sky-200 rounded-3xl p-6 mb-6 shadow-sm">
          <h1 className="text-2xl font-bold text-sky-950">
            Workshop
          </h1>

          <p className="text-sky-700 mt-2">
            Access your workshop activities and keep track of your
            progress.
          </p>

          <div className="mt-5 bg-white/60 rounded-2xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-sky-950">
                Workshop Progress
              </span>

              <span className="text-sm font-bold text-sky-700">
                {completedCount} of {workshops.length} completed
              </span>
            </div>

            <div className="w-full bg-white rounded-full h-2 mt-3 overflow-hidden">
              <div
                className="bg-sky-500 h-2 rounded-full transition-all"
                style={{
                  width: `${
                    (completedCount / workshops.length) * 100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {workshops.map((workshop) => {
            const workshopProgress =
              progress[workshop.id] ?? {
                status: "not_started",
                updatedAt: null,
              };

            return (
              <div
                key={workshop.id}
                className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm flex flex-col"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-sky-500">
                    {workshop.week}
                  </p>

                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusStyle(
                      workshopProgress.status
                    )}`}
                  >
                    {getStatusLabel(workshopProgress.status)}
                  </span>
                </div>

                <h2 className="text-xl font-semibold text-sky-950 mt-3">
                  {workshop.title}
                </h2>

                <p className="text-sky-700 mt-3 leading-relaxed flex-1">
                  {workshop.description}
                </p>

                {workshopProgress.status === "not_started" && (
                  <button
                    type="button"
                    onClick={() =>
                      updateStatus(workshop.id, "in_progress")
                    }
                    className="mt-5 w-full bg-sky-500 text-white font-semibold px-4 py-3 rounded-xl hover:bg-sky-600 transition-colors"
                  >
                    Start Activity
                  </button>
                )}

                {workshopProgress.status === "in_progress" && (
                  <button
                    type="button"
                    onClick={() =>
                      updateStatus(workshop.id, "completed")
                    }
                    className="mt-5 w-full bg-sky-500 text-white font-semibold px-4 py-3 rounded-xl hover:bg-sky-600 transition-colors"
                  >
                    Mark as Completed
                  </button>
                )}

                {workshopProgress.status === "completed" && (
                  <div className="mt-5">
                    <div className="w-full bg-green-50 text-green-700 font-semibold px-4 py-3 rounded-xl text-center">
                      Activity Completed
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        updateStatus(
                          workshop.id,
                          "in_progress"
                        )
                      }
                      className="mt-2 w-full text-sm text-sky-600 hover:text-sky-700 font-medium"
                    >
                      Reopen Activity
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Workshop;