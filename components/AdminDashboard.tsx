import React, { useEffect, useState } from "react";

import {
  getUsageEvents,
  UsageEvent,
} from "../utils/usageTracking";

interface Account {
  id: string;
  name: string;
  createdAt: number;
}

interface AdminDashboardProps {
  accounts: Account[];
}

const workshops = [
  {
    id: "workshop_1",
    label: "Workshop 1",
  },
  {
    id: "workshop_2",
    label: "Workshop 2",
  },
  {
    id: "workshop_3",
    label: "Workshop 3",
  },
  {
    id: "workshop_4",
    label: "Workshop 4",
  },
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  accounts,
}) => {
  const [events, setEvents] = useState<UsageEvent[]>(
    getUsageEvents()
  );

  const [
    selectedParticipantId,
    setSelectedParticipantId,
  ] = useState<string | null>(null);

  const refreshEvents = () => {
    setEvents(getUsageEvents());
  };

  useEffect(() => {
    window.addEventListener(
      "behaviour-change-usage-updated",
      refreshEvents
    );

    window.addEventListener(
      "storage",
      refreshEvents
    );

    return () => {
      window.removeEventListener(
        "behaviour-change-usage-updated",
        refreshEvents
      );

      window.removeEventListener(
        "storage",
        refreshEvents
      );
    };
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeToday = new Set(
    events
      .filter(
        (event) =>
          new Date(event.timestamp) >= today
      )
      .map((event) => event.userId)
  ).size;

  const appOpens = events.filter(
    (event) => event.type === "app_opened"
  ).length;

  const coachInteractions = events.filter(
    (event) => event.type === "coach_interaction"
  ).length;

  const resourceViews = events.filter(
    (event) => event.type === "resource_opened"
  ).length;

  const workshopCompletions = events.filter(
    (event) =>
      event.type === "workshop_completed"
  ).length;

  const calendarOpens = events.filter(
    (event) =>
      event.type === "page_viewed" &&
      event.metadata?.page === "calendar"
  ).length;

  const pageViews = events.filter(
    (event) => event.type === "page_viewed"
  ).length;

  const getParticipantMetrics = (
    account: Account
  ) => {
    const userEvents = events.filter(
      (event) => event.userId === account.id
    );

    const sortedEvents = [...userEvents].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() -
        new Date(b.timestamp).getTime()
    );

    const lastEvent =
      sortedEvents.length > 0
        ? sortedEvents[sortedEvents.length - 1]
        : null;

    const completedWorkshops = new Set(
      userEvents
        .filter(
          (event) =>
            event.type === "workshop_completed"
        )
        .map(
          (event) =>
            event.metadata?.workshopId
        )
        .filter(Boolean)
    ).size;

    return {
      appOpens: userEvents.filter(
        (event) => event.type === "app_opened"
      ).length,

      coachInteractions: userEvents.filter(
        (event) =>
          event.type === "coach_interaction"
      ).length,

      resourceViews: userEvents.filter(
        (event) =>
          event.type === "resource_opened"
      ).length,

      calendarOpens: userEvents.filter(
        (event) =>
          event.type === "page_viewed" &&
          event.metadata?.page === "calendar"
      ).length,

      pageViews: userEvents.filter(
        (event) => event.type === "page_viewed"
      ).length,

      completedWorkshops,

      lastActive: lastEvent
        ? new Date(
            lastEvent.timestamp
          ).toLocaleString()
        : "No activity yet",

      userEvents,
    };
  };

  const getWorkshopStatus = (
    userId: string,
    workshopId: string
  ) => {
    const workshopEvents = events
      .filter(
        (event) =>
          event.userId === userId &&
          event.metadata?.workshopId === workshopId &&
          (
            event.type === "workshop_started" ||
            event.type === "workshop_completed"
          )
      )
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime()
      );

    if (workshopEvents.length === 0) {
      return "Not Started";
    }

    if (
      workshopEvents[0].type ===
      "workshop_completed"
    ) {
      return "Completed";
    }

    return "In Progress";
  };

  const getWorkshopStyle = (status: string) => {
    if (status === "Completed") {
      return "bg-green-100 text-green-700";
    }

    if (status === "In Progress") {
      return "bg-amber-100 text-amber-700";
    }

    return "bg-slate-100 text-slate-500";
  };

  const getEventLabel = (event: UsageEvent) => {
    switch (event.type) {
      case "app_opened":
        return "Opened the app";

      case "coach_interaction":
        return "Used the Daily AI Coach";

      case "resource_opened":
        return `Opened ${
          event.metadata?.resource ?? "a BCT resource"
        }`;

      case "workshop_started":
        return `Started ${
          event.metadata?.workshop ?? "a workshop"
        }`;

      case "workshop_completed":
        return `Completed ${
          event.metadata?.workshop ?? "a workshop"
        }`;

      case "page_viewed":
        if (event.metadata?.page === "calendar") {
          return "Opened the Calendar";
        }

        return `Viewed ${
          event.metadata?.page ?? "a page"
        }`;

      default:
        return event.type;
    }
  };

  const exportCsv = () => {
    const headers = [
      "Event ID",
      "Participant ID",
      "Participant Name",
      "Event Type",
      "Timestamp",
      "Metadata",
    ];

    const rows = events.map((event) => {
      const participant =
        accounts.find(
          (account) => account.id === event.userId
        )?.name ?? "Unknown";

      return [
        event.id,
        event.userId,
        participant,
        event.type,
        event.timestamp,
        JSON.stringify(event.metadata ?? {}),
      ];
    });

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value).replace(
                /"/g,
                '""'
              )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = `behaviour-change-usage-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    link.click();

    URL.revokeObjectURL(url);
  };

  // =========================
  // PARTICIPANT DETAIL VIEW
  // =========================

  if (selectedParticipantId) {
    const participant = accounts.find(
      (account) =>
        account.id === selectedParticipantId
    );

    if (!participant) {
      setSelectedParticipantId(null);
      return null;
    }

    const metrics =
      getParticipantMetrics(participant);

    const recentActivity = [
      ...metrics.userEvents,
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime()
      )
      .slice(0, 10);

    return (
      <div className="min-h-screen bg-sky-50 p-6 lg:p-12">
        <div className="max-w-6xl mx-auto">

          <button
            type="button"
            onClick={() =>
              setSelectedParticipantId(null)
            }
            className="mb-5 text-sky-700 font-semibold hover:text-sky-900"
          >
            ← Back to Admin Dashboard
          </button>

          <div className="bg-sky-200 rounded-3xl p-6 mb-6 shadow-sm">
            <p className="text-xs font-bold text-sky-600 uppercase tracking-[0.2em]">
              Participant Details
            </p>

            <h1 className="text-3xl font-bold text-sky-950 mt-2">
              {participant.name}
            </h1>

            <p className="text-sm text-sky-700 mt-2 break-all">
              Participant ID: {participant.id}
            </p>

            <p className="text-sm text-sky-700 mt-1">
              Last active: {metrics.lastActive}
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">

            <MetricCard
              label="App Opens"
              value={metrics.appOpens}
            />

            <MetricCard
              label="AI Coach"
              value={metrics.coachInteractions}
            />

            <MetricCard
              label="Resources"
              value={metrics.resourceViews}
            />

            <MetricCard
              label="Calendar Opens"
              value={metrics.calendarOpens}
            />

            <MetricCard
              label="Page Views"
              value={metrics.pageViews}
            />

          </div>

          <div className="bg-white rounded-3xl border border-sky-100 shadow-sm p-6 mb-8">

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-sky-950">
                  Workshop Progress
                </h2>

                <p className="text-sm text-sky-700 mt-1">
                  {metrics.completedWorkshops} of{" "}
                  {workshops.length} workshops completed
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {workshops.map((workshop) => {
                const status =
                  getWorkshopStatus(
                    participant.id,
                    workshop.id
                  );

                return (
                  <div
                    key={workshop.id}
                    className="flex items-center justify-between border border-sky-100 rounded-2xl px-5 py-4"
                  >
                    <span className="font-semibold text-sky-950">
                      {workshop.label}
                    </span>

                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${getWorkshopStyle(
                        status
                      )}`}
                    >
                      {status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-sky-100 shadow-sm p-6">

            <h2 className="text-xl font-bold text-sky-950">
              Recent Activity
            </h2>

            <p className="text-sm text-sky-700 mt-1 mb-5">
              Most recent participant interactions.
            </p>

            {recentActivity.length === 0 ? (
              <p className="text-slate-400">
                No activity recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((event) => (
                  <div
                    key={event.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-sky-50 pb-3"
                  >
                    <p className="font-medium text-sky-950">
                      {getEventLabel(event)}
                    </p>

                    <p className="text-xs text-slate-400">
                      {new Date(
                        event.timestamp
                      ).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>
      </div>
    );
  }

  // =========================
  // MAIN ADMIN DASHBOARD
  // =========================

  return (
    <div className="min-h-screen bg-sky-50 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto">

        <div className="bg-sky-200 rounded-3xl p-6 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

            <div>
              <p className="text-xs font-bold text-sky-600 uppercase tracking-[0.2em]">
                Research Administration
              </p>

              <h1 className="text-3xl font-bold text-sky-950 mt-2">
                Admin Dashboard
              </h1>

              <p className="text-sky-700 mt-2">
                Monitor participant engagement and Behaviour
                Change Agent usage.
              </p>
            </div>

            <button
              type="button"
              onClick={exportCsv}
              className="bg-white text-sky-700 font-semibold px-5 py-3 rounded-xl hover:bg-sky-50 border border-sky-300"
            >
              Export Usage Data
            </button>

          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">

          <MetricCard
            label="Participants"
            value={accounts.length}
          />

          <MetricCard
            label="Active Today"
            value={activeToday}
          />

          <MetricCard
            label="App Opens"
            value={appOpens}
          />

          <MetricCard
            label="AI Coach Interactions"
            value={coachInteractions}
          />

          <MetricCard
            label="Resource Views"
            value={resourceViews}
          />

          <MetricCard
            label="Workshop Completions"
            value={workshopCompletions}
          />

          <MetricCard
            label="Calendar Opens"
            value={calendarOpens}
          />

        </div>

        <div className="bg-white rounded-3xl border border-sky-100 shadow-sm overflow-hidden">

          <div className="p-6 border-b border-sky-100">
            <h2 className="text-xl font-bold text-sky-950">
              Participant Engagement
            </h2>

            <p className="text-sm text-sky-700 mt-1">
              {pageViews} total page views recorded.
              Select a participant to see more details.
            </p>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left">

              <thead className="bg-sky-50 text-sky-800 text-sm">
                <tr>
                  <th className="px-6 py-4">
                    Participant
                  </th>

                  <th className="px-6 py-4">
                    App Opens
                  </th>

                  <th className="px-6 py-4">
                    AI Coach
                  </th>

                  <th className="px-6 py-4">
                    Resources
                  </th>

                  <th className="px-6 py-4">
                    Calendar
                  </th>

                  <th className="px-6 py-4">
                    Workshops
                  </th>

                  <th className="px-6 py-4">
                    Last Active
                  </th>

                  <th className="px-6 py-4">
                    Details
                  </th>
                </tr>
              </thead>

              <tbody>
                {accounts.map((account) => {
                  const metrics =
                    getParticipantMetrics(account);

                  return (
                    <tr
                      key={account.id}
                      className="border-t border-sky-50 hover:bg-sky-50/50"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-sky-950">
                          {account.name}
                        </p>

                        <p className="text-xs text-slate-400 mt-1">
                          {account.id}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        {metrics.appOpens}
                      </td>

                      <td className="px-6 py-4">
                        {metrics.coachInteractions}
                      </td>

                      <td className="px-6 py-4">
                        {metrics.resourceViews}
                      </td>

                      <td className="px-6 py-4">
                        {metrics.calendarOpens}
                      </td>

                      <td className="px-6 py-4">
                        {metrics.completedWorkshops}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-500">
                        {metrics.lastActive}
                      </td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedParticipantId(
                              account.id
                            )
                          }
                          className="bg-sky-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-sky-600"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

            </table>

          </div>
        </div>

      </div>
    </div>
  );
};

interface MetricCardProps {
  label: string;
  value: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-sky-100 p-5 shadow-sm">

      <p className="text-sm font-semibold text-sky-700">
        {label}
      </p>

      <p className="text-3xl font-bold text-sky-950 mt-2">
        {value}
      </p>

    </div>
  );
};

export default AdminDashboard;