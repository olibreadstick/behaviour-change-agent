import React, { useState, useMemo, useEffect } from "react";
import { DiscoveryItem, DiscoveryType } from "../types";

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
  useEffect(() => {
    localStorage.setItem(
      activitiesKey(userId),
      JSON.stringify(activities)
    );
  }, [activities, userId]);

  const [activityTitle, setActivityTitle] = useState("");
  const [activityTime, setActivityTime] = useState("");
  const [activityDuration, setActivityDuration] = useState("");

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

    setActivities((previous) => [...previous, newActivity]);

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
          className={`p-4 rounded-lg relative transition-all text-center font-bold ${
              isToday(date)
                ? "bg-sky-200 text-sky-950 hover:bg-sky-300"
                : hasEvents
                  ? "bg-sky-500 text-white shadow-md hover:bg-sky-600"
                  : "bg-slate-50 text-slate-600 hover:bg-sky-100"
            }`}
        >
          <div className="text-base">{day}</div>
          {hasEvents && (
            <div className="w-1 h-1 bg-white rounded-full mx-auto mt-1"></div>
          )}
          {activitiesOnDay.length > 0 && (
            <div className="flex justify-center flex-wrap gap-1 mt-1">
              {activitiesOnDay.map((activity) => (
                <div
                  key={activity.id}
                  className={`w-2 h-2 rounded-full ${
                    activity.status === "completed"
                      ? "bg-green-500"
                      : "bg-sky-600"
                  }`}
                  title={`${activity.title} — ${activity.status}`}
                />
              ))}
            </div>
          )}
          {availableTypesOnDay.length > 0 && !hasEvents && (
            <div className="w-1 h-1 bg-slate-300 rounded-full mx-auto mt-1"></div>
          )}
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

  const handleToggleActivityStatus = (activityId: string) => {
    setActivities((previous) =>
      previous.map((activity) =>
        activity.id === activityId
          ? {
              ...activity,
              status:
                activity.status === "planned"
                  ? "completed"
                  : "planned",
            }
          : activity
      )
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-8">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() =>
              setCurrentDate(
                new Date(currentDate.getFullYear(), currentDate.getMonth() - 1),
              )
            }
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
          >
            ← Prev
          </button>
          <h2 className="text-2xl font-black text-slate-900">
            {currentDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <button
            onClick={() =>
              setCurrentDate(
                new Date(currentDate.getFullYear(), currentDate.getMonth() + 1),
              )
            }
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
          >
            Next →
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="p-3 text-center font-black text-sm text-slate-500 uppercase"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowModal(false)}
          />
          <div className="relative z-60 max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
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
                    Add Activity
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
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-semibold text-sky-950">
                              {activity.title}
                            </div>

                            <div className="text-sm text-sky-700 mt-1">
                              {activity.time && `${activity.time}`}
                              {activity.time && activity.durationMinutes > 0 && " • "}
                              {activity.durationMinutes > 0 &&
                                `${activity.durationMinutes} minutes`}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleActivityStatus(activity.id)}
                              className={`mt-3 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                                activity.status === "completed"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-sky-200 text-sky-700 hover:bg-sky-300"
                              }`}
                            >
                              {activity.status === "completed"
                                ? "✓ Completed"
                                : "Mark as completed"}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(activity.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors text-xl"
                            aria-label={`Delete ${activity.title}`}
                          >
                            ×
                          </button>
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

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="time"
                        value={activityTime}
                        onChange={(event) => setActivityTime(event.target.value)}
                        className="w-full border border-sky-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-300"
                      />

                      <input
                        type="number"
                        min="1"
                        value={activityDuration}
                        onChange={(event) => setActivityDuration(event.target.value)}
                        placeholder="Minutes"
                        className="w-full border border-sky-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-300"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddActivity}
                      disabled={!activityTitle.trim()}
                      className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl hover:bg-sky-600 disabled:opacity-50"
                    >
                      Add Activity
                    </button>
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
    </div>
  );
};

export default Calendar;
