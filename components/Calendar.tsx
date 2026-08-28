import React, { useState, useMemo, useEffect } from "react";
import { DiscoveryItem, DiscoveryType } from "../types";

import {
  getUsageEvents,
  logUsageEvent,
} from "../utils/usageTracking";

interface CalendarProps {
  savedItems: DiscoveryItem[];
  onSaveItem?: (item: DiscoveryItem) => void;
  allItems?: DiscoveryItem[];
  userId: string;
}

interface PersonalActivity {
  id: string;
  title: string;
  date: string;
  time: string;
  durationMinutes: number;
  status: "planned" | "completed";
}

const activitiesKey = (userId: string) =>
  `behaviour_change_activities_${userId}`;

const Calendar: React.FC<CalendarProps> = ({
  savedItems,
  onSaveItem,
  allItems = [],
  userId,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activities, setActivities] = useState<PersonalActivity[]>(() => {
    const savedActivities = localStorage.getItem(activitiesKey(userId));

    if (!savedActivities) {
      return [];
    }

    try {
      return JSON.parse(savedActivities);
    } catch {
      return [];
    }
  });


const [activityToDelete, setActivityToDelete] =
    useState<PersonalActivity | null>(null);

  useEffect(() => {
    localStorage.setItem(
      activitiesKey(userId),
      JSON.stringify(activities)
    );
  }, [activities, userId]);

  const getActivityDeadline = (
  activity: PersonalActivity
) => {
  const [year, month, day] = activity.date
    .split("-")
    .map(Number);

  if (activity.time) {
    const [hour, minute] = activity.time
      .split(":")
      .map(Number);

    return new Date(
      year,
      month - 1,
      day,
      hour,
      minute,
      0,
      0
    );
  }

  // If no time was entered, consider the
  // activity missed once that entire day passes.
  return new Date(
    year,
    month - 1,
    day,
    23,
    59,
    59,
    999
  );
};


  useEffect(() => {
  const now = new Date();
  const usageEvents = getUsageEvents();

  activities.forEach((activity) => {
    if (activity.status !== "planned") {
      return;
    }

    const deadline = getActivityDeadline(activity);

    if (deadline >= now) {
      return;
    }

    const alreadyMarkedMissed =
      usageEvents.some(
        (event) =>
          event.userId === userId &&
          event.type === "calendar_activity_missed" &&
          event.metadata?.activityId === activity.id
      );

    if (alreadyMarkedMissed) {
      return;
    }

    logUsageEvent(
      userId,
      "calendar_activity_missed",
      {
        activityId: activity.id,
        activity: activity.title,
        scheduledDate: activity.date,
        scheduledTime: activity.time || null,
        durationMinutes: activity.durationMinutes,
      }
    );
  });
}, [activities, userId]);

  const [activityTitle, setActivityTitle] = useState("");
  const [activityTime, setActivityTime] = useState("");
  const [activityDuration, setActivityDuration] = useState("");
  const [editingActivityId, setEditingActivityId] =
    useState<string | null>(null);

const handleEditActivity = (
  activity: PersonalActivity
) => {
  setEditingActivityId(activity.id);
  setActivityTitle(activity.title);
  setActivityTime(activity.time);
  setActivityDuration(
    activity.durationMinutes
      ? String(activity.durationMinutes)
      : ""
  );
};

const handleUpdateActivity = () => {
  if (!editingActivityId || !activityTitle.trim()) {
    return;
  }

  setActivities((previous) =>
    previous.map((activity) =>
      activity.id === editingActivityId
        ? {
            ...activity,
            title: activityTitle.trim(),
            time: activityTime,
            durationMinutes:
              Number(activityDuration) || 0,
          }
        : activity
    )
  );

  logUsageEvent(
    userId,
    "calendar_activity_edited",
    {
      activityId: editingActivityId,
      activity: activityTitle.trim(),
      scheduledDate: selectedDate
        ? toDateKey(selectedDate)
        : null,
      scheduledTime: activityTime || null,
      durationMinutes:
        Number(activityDuration) || 0,
    }
  );

  setEditingActivityId(null);
  setActivityTitle("");
  setActivityTime("");
  setActivityDuration("");
};

  const today = new Date();

  const isToday = (date: Date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  // Get events for a specific date
  const pad = (n: number) => String(n).padStart(2, "0");
  const toDateKey = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const toDateKeyFromString = (s?: string) => (s ? s.split("T")[0] : null);
  

  const getEventsForDate = (date: Date) => {
    const key = toDateKey(date);
    return savedItems.filter((item) => {
      const itemDate =
        toDateKeyFromString(item.date) ||
        toDateKeyFromString(item.metadata?.date) ||
        toDateKeyFromString(item.metadata?.startDate);
      return itemDate === key;
    });
  };

  // Get all unique event dates
  const eventDates = useMemo(() => {
    const dates = new Set<string>();
    savedItems.forEach((item) => {
      const itemDate =
        toDateKeyFromString(item.date) ||
        toDateKeyFromString(item.metadata?.date) ||
        toDateKeyFromString(item.metadata?.startDate);
      if (itemDate) dates.add(itemDate);
    });
    return dates;
  }, [savedItems]);

  // Get events available on selected date (for discovery)
  const getAvailableEventsForDate = (date: Date) => {
    const key = toDateKey(date);
    return allItems.filter((item) => {
      const itemDate =
        toDateKeyFromString(item.date) ||
        toDateKeyFromString(item.metadata?.date) ||
        toDateKeyFromString(item.metadata?.startDate);
      return itemDate === key;
    });
  };

  // Get available types of events for a date
  const getEventTypesForDate = (date: Date) => {
    const events = getAvailableEventsForDate(date);
    const types = new Set(events.map((e) => e.type));
    return Array.from(types);
  };

const handleAddActivity = () => {
  if (!selectedDate || !activityTitle.trim()) return;

  const newActivity: PersonalActivity = {
    id: `activity_${Date.now()}`,
    title: activityTitle.trim(),
    date: toDateKey(selectedDate),
    time: activityTime,
    durationMinutes: Number(activityDuration) || 0,
    status: "planned",
  };

  setActivities((previous) => [
    ...previous,
    newActivity,
  ]);

  logUsageEvent(
    userId,
    "calendar_activity_added",
    {
      activityId: newActivity.id,
      activity: newActivity.title,
      scheduledDate: newActivity.date,
      scheduledTime: newActivity.time || null,
      durationMinutes: newActivity.durationMinutes,
    }
  );

  setActivityTitle("");
  setActivityTime("");
  setActivityDuration("");
};


  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowModal(true);
  };

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderCalendarDays = () => {
    const days = [];
    const totalDays = daysInMonth(currentDate);
    const firstDay = firstDayOfMonth(currentDate);

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-3"></div>);
    }

    // Days of the month
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        day,
      );
      const dateStr = toDateKey(date);
      const hasEvents = eventDates.has(dateStr);
      const activitiesOnDay = activities.filter(
        (activity) => activity.date === dateStr
      );

      const hasCompletedActivity = activities.some(
        (activity) =>
          activity.date === dateStr &&
          activity.status === "completed"
      );
      const savedEventsOnDay = getEventsForDate(date);
      const availableTypesOnDay = getEventTypesForDate(date);

      days.push(
        <button
          key={`day-${day}`}
          onClick={() => handleDateClick(date)}
          className={`relative aspect-square md:aspect-auto md:h-16 p-0 rounded-lg transition-all text-center font-bold flex items-center justify-center ${
              isToday(date)
                ? "bg-sky-200 text-sky-950 hover:bg-sky-300"
                : hasEvents
                  ? "bg-sky-500 text-white shadow-md hover:bg-sky-600"
                  : "bg-slate-50 text-slate-600 hover:bg-sky-100"
            }`}
        >
          {/* Centered date number */}
            <div className="absolute inset-0 flex items-center justify-center text-sm sm:text-base">
              {day}
            </div>

            {/* Activity/event indicators */}
            <div className="absolute bottom-1 md:bottom-2 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1">
              {hasEvents && (
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              )}

              {activitiesOnDay.map((activity) => (
                <div
                  key={activity.id}
                  className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                    activity.status === "completed"
                      ? "bg-green-500"
                      : "bg-sky-600"
                  }`}
                  title={`${activity.title} — ${activity.status}`}
                />
              ))}

              {availableTypesOnDay.length > 0 && !hasEvents && (
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
              )}
            </div>
        </button>,
      );
    }

    return days;
  };

  const eventTypesOnSelectedDate = selectedDate
    ? getEventTypesForDate(selectedDate)
    : [];
  const allEventsOnSelectedDate = selectedDate
    ? getAvailableEventsForDate(selectedDate)
    : [];
  const savedEventsOnSelectedDate = selectedDate
    ? getEventsForDate(selectedDate)
    : [];
    const activitiesOnSelectedDate = selectedDate
    ? activities.filter(
        (activity) => activity.date === toDateKey(selectedDate)
      )
    : [];

  const getTypeLabel = (type: DiscoveryType) => {
    return type.replace(/_/g, " ");
  };

  const handleDeleteActivity = (activityId: string) => {
  setActivities((previous) =>
    previous.filter((activity) => activity.id !== activityId)
  );
};

const handleToggleActivityStatus = (
  activityId: string
) => {
  const activity = activities.find(
    (item) => item.id === activityId
  );

  if (!activity) {
    return;
  }

  const nextStatus =
    activity.status === "planned"
      ? "completed"
      : "planned";

  setActivities((previous) =>
    previous.map((item) =>
      item.id === activityId
        ? {
            ...item,
            status: nextStatus,
          }
        : item
    )
  );

  if (nextStatus === "completed") {
    const existingCompletion = getUsageEvents().some(
      (event) =>
        event.userId === userId &&
        event.type === "calendar_activity_completed" &&
        event.metadata?.activityId === activity.id
    );

    if (!existingCompletion) {
      logUsageEvent(
        userId,
        "calendar_activity_completed",
        {
          activityId: activity.id,
          activity: activity.title,
          scheduledDate: activity.date,
          scheduledTime: activity.time || null,
          durationMinutes: activity.durationMinutes,
        }
      );
    }
  }
};


  return (
    <div className="w-full max-w-6xl mx-auto px-2 py-4 sm:px-4 md:p-8">
      <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-4 md:p-8">
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center mb-5 gap-2">
          <button
            type="button"
            onClick={() =>
              setCurrentDate(
                new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth() - 1
                )
              )
            }
            className="
              justify-self-start
              px-2 py-1.5
              md:px-4 md:py-2
              rounded-lg
              bg-slate-100
              hover:bg-slate-200
              font-bold
              text-slate-700
              text-xs md:text-sm
            "
          >
            ← Prev
          </button>

          <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 text-center whitespace-nowrap">
            {currentDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </h2>

          <button
            type="button"
            onClick={() =>
              setCurrentDate(
                new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth() + 1
                )
              )
            }
            className="
              justify-self-end
              px-2 py-1.5
              md:px-4 md:py-2
              rounded-lg
              bg-slate-100
              hover:bg-slate-200
              font-bold
              text-slate-700
              text-xs md:text-sm
            "
          >
            Next →
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="py-2 px-0 text-center font-black text-[11px] sm:text-sm text-slate-500 uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">{renderCalendarDays()}</div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-sky-600"></div>
            <span className="text-slate-700">Planned Activity</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-slate-700">Completed Activity</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-sky-200"></div>
            <span className="text-slate-700">Today</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center px-3 md:px-4 py-4 overflow-y-auto">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowModal(false)}
          />
          <div className="relative z-60 max-w-2xl w-full bg-white rounded-2xl shadow-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">
                {selectedDate.toLocaleDateString("default", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
                <div className="mb-6 bg-sky-50 border border-sky-100 rounded-2xl p-5">
                  <h4 className="text-sm font-black text-sky-950 uppercase mb-4">
                    {editingActivityId
                      ? "Edit Activity"
                      : "Add Activity"}
                  </h4>

                  {activitiesOnSelectedDate.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-black text-sky-950 uppercase mb-3">
                      Your Activities
                    </h4>

                    <div className="space-y-3">
                      {activitiesOnSelectedDate.map((activity) => (
                      <div
                        key={activity.id}
                        className="bg-sky-100 border border-sky-200 rounded-xl p-4"
                      >
                        {/* Activity title + Edit/Delete buttons */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sky-950">
                              {activity.title}
                            </div>

                            <div className="text-sm text-sky-700 mt-1">
                              {activity.time && `${activity.time}`}

                              {activity.time &&
                                activity.durationMinutes > 0 &&
                                " • "}

                              {activity.durationMinutes > 0 &&
                                `${activity.durationMinutes} minutes`}
                            </div>
                          </div>

                          {/* Top-right buttons */}
                          <div className="shrink-0 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleEditActivity(activity)
                              }
                              className="px-3 py-1.5 rounded-lg bg-white border border-sky-300 text-sky-700 text-sm font-semibold hover:bg-sky-50 transition-colors"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setActivityToDelete(activity)
                              }
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors text-xl"
                              aria-label={`Delete ${activity.title}`}
                            >
                              ×
                            </button>
                          </div>
                        </div>

                        {/* Planned / Completed checkbox */}
                        <div className="mt-4 flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`activity-completed-${activity.id}`}
                            checked={
                              activity.status === "completed"
                            }
                            onChange={() =>
                              handleToggleActivityStatus(activity.id)
                            }
                            className="w-5 h-5 rounded border-sky-300 accent-green-500 cursor-pointer"
                          />

                          <label
                            htmlFor={`activity-completed-${activity.id}`}
                            className="text-sm font-semibold text-sky-800 cursor-pointer"
                          >
                            {activity.status === "completed"
                              ? "Completed"
                              : "Planned — check when completed"}
                          </label>
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                )}

                  <div className="space-y-3">
                    <input
                      type="text"
                      value={activityTitle}
                      onChange={(event) => setActivityTitle(event.target.value)}
                      placeholder="e.g. Walking"
                      className="w-full border border-sky-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-300"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Time */}
                      <div className="w-full">
                        <label className="block text-sm font-semibold text-sky-950 mb-1.5">
                          Time
                        </label>

                        <div className="relative w-full h-12">
                          {/* Visible time box */}
                          <div
                            className="
                              w-full
                              h-12
                              bg-white
                              border
                              border-sky-200
                              rounded-xl
                              px-4
                              flex
                              items-center
                              text-base
                            "
                          >
                            <span
                              className={
                                activityTime
                                  ? "text-slate-700"
                                  : "text-slate-400"
                              }
                            >
                              {activityTime || "Select time"}
                            </span>
                          </div>

                          {/* Invisible native time picker */}
                          <input
                            type="time"
                            value={activityTime}
                            onChange={(event) =>
                              setActivityTime(event.target.value)
                            }
                            aria-label="Select time"
                            className="
                              absolute
                              inset-0
                              w-full
                              h-full
                              opacity-0
                              cursor-pointer
                            "
                          />
                        </div>
                      </div>

                      {/* Duration */}
                      <div className="min-w-0">
                        <label className="block text-sm font-semibold text-sky-950 mb-1.5">
                          Duration
                        </label>

                        <input
                          type="number"
                          min="1"
                          value={activityDuration}
                          onChange={(event) =>
                            setActivityDuration(event.target.value)
                          }
                          placeholder="Minutes"
                          className="
                            w-full
                            min-w-0
                            border
                            border-sky-200
                            rounded-xl
                            px-3
                            py-3
                            bg-white
                            text-slate-700
                            outline-none
                            focus:ring-2
                            focus:ring-sky-300
                          "
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={
                        editingActivityId
                          ? handleUpdateActivity
                          : handleAddActivity
                      }
                      disabled={!activityTitle.trim()}
                      className="w-full h-12 bg-sky-500 text-white font-semibold rounded-xl hover:bg-sky-600 disabled:opacity-50"
                    >
                      {editingActivityId
                        ? "Save Changes"
                        : "Add Activity"}
                    </button>
                    {editingActivityId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingActivityId(null);
                          setActivityTitle("");
                          setActivityTime("");
                          setActivityDuration("");
                        }}
                        className="w-full mt-2 bg-slate-100 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              {/* Saved Events Section */}
              {savedEventsOnSelectedDate.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-black text-mcgill-red uppercase mb-3">
                    ✓ Your Saved Events
                  </h4>
                  <div className="flex flex-col gap-2">
                    {savedEventsOnSelectedDate.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-red-50 rounded-lg border border-red-100"
                      >
                        <div className="font-bold text-slate-900">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.type.replace(/_/g, " ")} •{" "}
                          {item.company || item.creator?.name || ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Types Section */}
              {eventTypesOnSelectedDate.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-black text-slate-700 uppercase mb-3">
                    Types of events available
                  </h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {eventTypesOnSelectedDate.map((type) => (
                      <span
                        key={type}
                        className="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-full"
                      >
                        {getTypeLabel(type)}
                      </span>
                    ))}
                  </div>

                  {/* All Events on This Date */}
                  <div className="mt-4">
                    <h5 className="text-sm font-bold text-slate-700 mb-2">
                      Available events
                    </h5>
                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                      {allEventsOnSelectedDate.map((item) => {
                        const isSaved = savedItems.some(
                          (s) => s.id === item.id,
                        );
                        return (
                          <div
                            key={item.id}
                            className={`p-3 rounded-lg border ${
                              isSaved
                                ? "bg-red-50 border-red-200"
                                : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="font-bold text-slate-900">
                                  {item.title}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {item.type.replace(/_/g, " ")} •{" "}
                                  {item.company || item.creator?.name || ""}
                                </div>
                                <div className="text-xs text-slate-600 mt-1">
                                  {item.description}
                                </div>
                              </div>
                              {!isSaved && onSaveItem && (
                                <button
                                  onClick={() => onSaveItem(item)}
                                  className="px-3 py-1 bg-mcgill-red text-white font-bold text-xs rounded hover:bg-red-600 transition-colors whitespace-nowrap"
                                >
                                  Save
                                </button>
                              )}
                              {isSaved && (
                                <span className="px-3 py-1 bg-green-100 text-green-700 font-bold text-xs rounded whitespace-nowrap">
                                  Saved
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {savedEventsOnSelectedDate.length === 0 &&
                allEventsOnSelectedDate.length === 0 && (
                  <div className="text-center py-6">
                    <span className="text-3xl mb-2 block">📭</span>
                    <p className="text-slate-500">
                      No events on this date. Check other dates!
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
      {activityToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* Dark background */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setActivityToDelete(null)}
          />

          {/* Confirmation box */}
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-sky-950">
              Delete this activity?
            </h2>

            <p className="text-slate-600 mt-3">
              Are you sure you want to delete this activity?
              This action cannot be undone.
            </p>

            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 mt-4">
              <p className="font-semibold text-sky-950">
                {activityToDelete.title}
              </p>

              {(activityToDelete.time ||
                activityToDelete.durationMinutes > 0) && (
                <p className="text-sm text-sky-700 mt-1">
                  {activityToDelete.time}

                  {activityToDelete.time &&
                    activityToDelete.durationMinutes > 0 &&
                    " • "}

                  {activityToDelete.durationMinutes > 0 &&
                    `${activityToDelete.durationMinutes} minutes`}
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setActivityToDelete(null)}
                className="bg-slate-100 text-slate-700 font-semibold px-5 py-3 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  handleDeleteActivity(activityToDelete.id);

                  if (
                    editingActivityId ===
                    activityToDelete.id
                  ) {
                    setEditingActivityId(null);
                    setActivityTitle("");
                    setActivityTime("");
                    setActivityDuration("");
                  }

                  setActivityToDelete(null);
                }}
                className="bg-red-500 text-white font-semibold px-5 py-3 rounded-xl hover:bg-red-600"
              >
                Yes, Delete Activity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
