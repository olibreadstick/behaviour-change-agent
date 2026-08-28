import React, { useEffect, useState } from "react";
import { getUsageEvents, logUsageEvent } from "../utils/usageTracking";

interface GoalSettingProps {
  userId: string;
}

interface WeeklyGoal {
  id: string;
  goal: string;
  weekStart: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

const getMondayOfCurrentWeek = () => {
  const today = new Date();

  const day = today.getDay();
  const difference =
    today.getDate() - day + (day === 0 ? -6 : 1);

  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    difference
  );

  const year = monday.getFullYear();
  const month = String(
    monday.getMonth() + 1
  ).padStart(2, "0");
  const date = String(
    monday.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${date}`;
};

const getGoalStorageKey = (userId: string) =>
  `behaviour_change_weekly_goal_${userId}`;

const GoalSetting: React.FC<GoalSettingProps> = ({
  userId,
}) => {
  const currentWeek = getMondayOfCurrentWeek();

  const [goals, setGoals] = useState<WeeklyGoal[]>(() => {
      const saved = localStorage.getItem(
        getGoalStorageKey(userId)
      );

      if (!saved) {
        return [];
      }

      try {
        const parsed = JSON.parse(saved);

        // Support the old single-goal format too
        const savedGoals: WeeklyGoal[] = Array.isArray(parsed)
          ? parsed
          : [parsed];

        return savedGoals.filter(
          (goal) => goal.weekStart === currentWeek
        );
      } catch {
        return [];
      }
    });

  const [goalInput, setGoalInput] = useState("");

  const [editingGoalId, setEditingGoalId] =
    useState<string | null>(null);

  const [showAddGoal, setShowAddGoal] =
    useState(false);

  const [goalToDelete, setGoalToDelete] =
    useState<WeeklyGoal | null>(null);

  useEffect(() => {
    if (goals.length === 0) {
      localStorage.removeItem(
        getGoalStorageKey(userId)
      );

      return;
    }

    localStorage.setItem(
      getGoalStorageKey(userId),
      JSON.stringify(goals)
    );
  }, [goals, userId]);

  const handleSaveGoal = () => {
    const trimmedGoal = goalInput.trim();

    if (!trimmedGoal) {
      return;
    }

    const newGoal: WeeklyGoal = {
      id: crypto.randomUUID(),
      goal: trimmedGoal,
      weekStart: currentWeek,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setGoals((previousGoals) => [
      ...previousGoals,
      newGoal,
    ]);

    logUsageEvent(
      userId,
      "goal_set",
      {
        goalId: newGoal.id,
        weekStart: currentWeek,
      }
    );

    setGoalInput("");
    setShowAddGoal(false);
  };

  const handleEditGoal = (goal: WeeklyGoal) => {
    setGoalInput(goal.goal);
    setEditingGoalId(goal.id);
    setShowAddGoal(false);
  };

  const handleUpdateGoal = () => {
    if (!editingGoalId || !goalInput.trim()) {
      return;
    }

    const goalToUpdate = goals.find(
      (goal) => goal.id === editingGoalId
    );

    if (!goalToUpdate) {
      return;
    }

    setGoals((previousGoals) =>
      previousGoals.map((goal) =>
        goal.id === editingGoalId
          ? {
              ...goal,
              goal: goalInput.trim(),
            }
          : goal
      )
    );

    logUsageEvent(
      userId,
      "goal_edited",
      {
        goalId: editingGoalId,
        weekStart: goalToUpdate.weekStart,
      }
    );

    setGoalInput("");
    setEditingGoalId(null);
  };

  const handleToggleCompleted = (
    selectedGoal: WeeklyGoal
  ) => {
    const completed = !selectedGoal.completed;

    setGoals((previousGoals) =>
      previousGoals.map((goal) =>
        goal.id === selectedGoal.id
          ? {
              ...goal,
              completed,
              completedAt: completed
                ? new Date().toISOString()
                : undefined,
            }
          : goal
      )
    );

    if (completed) {
      const alreadyLogged = getUsageEvents().some(
        (event) =>
          event.userId === userId &&
          event.type === "goal_completed" &&
          event.metadata?.goalId === selectedGoal.id
      );

      if (!alreadyLogged) {
        logUsageEvent(
          userId,
          "goal_completed",
          {
            goalId: selectedGoal.id,
            weekStart: selectedGoal.weekStart,
          }
        );
      }
    }
  };

  const handleDeleteGoal = (
    selectedGoal: WeeklyGoal
  ) => {
    setGoals((previousGoals) =>
      previousGoals.filter(
        (goal) => goal.id !== selectedGoal.id
      )
    );

    logUsageEvent(
      userId,
      "goal_deleted",
      {
        goalId: selectedGoal.id,
        weekStart: selectedGoal.weekStart,
      }
    );

    if (editingGoalId === selectedGoal.id) {
      setEditingGoalId(null);
      setGoalInput("");
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 p-4 md:p-8 lg:p-12">

      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="bg-sky-200 rounded-3xl p-6 md:p-8 mb-6">
          <p className="text-xs font-bold text-sky-600 uppercase tracking-[0.2em]">
            Weekly Goal
          </p>

          <h1 className="text-3xl font-bold text-sky-950 mt-2">
            Goal Setting
          </h1>

          <p className="text-sky-700 mt-2">
            Set a physical activity goal that you
            would like to work toward this week.
          </p>
        </div>

        {/* No goal yet */}
        {goals.length === 0 && !showAddGoal && (
          <div className="bg-white rounded-3xl border border-sky-100 shadow-sm p-6 md:p-8 text-center">
            <h2 className="text-xl font-bold text-sky-950">
              No goals yet
            </h2>

            <p className="text-sm text-slate-500 mt-2">
              Tap the + button below to add a goal for this week.
            </p>
          </div>
        )}

        {/* Existing goal */}
        {goals.length > 0 && (
          <div className="space-y-4">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="bg-white rounded-3xl border border-sky-100 shadow-sm p-6 md:p-8"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-sky-600">
                      My Goal This Week
                    </p>

                    <h2
                      className={`text-xl md:text-2xl font-bold mt-3 ${
                        goal.completed
                          ? "text-green-700 line-through"
                          : "text-sky-950"
                      }`}
                    >
                      {goal.goal}
                    </h2>
                  </div>

                  {goal.completed && (
                    <span className="shrink-0 bg-green-100 text-green-700 text-xs font-bold px-3 py-2 rounded-full">
                      ✓ Completed
                    </span>
                  )}
                </div>

                <div className="mt-7 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleCompleted(goal)
                    }
                    className={`font-semibold px-5 py-3 rounded-xl transition ${
                      goal.completed
                        ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        : "bg-green-500 text-white hover:bg-green-600"
                    }`}
                  >
                    {goal.completed
                      ? "Mark as Not Completed"
                      : "Mark Goal as Completed"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEditGoal(goal)}
                    className="border border-sky-200 text-sky-700 font-semibold px-5 py-3 rounded-xl hover:bg-sky-50"
                  >
                    Edit Goal
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setGoalToDelete(goal)
                    }
                    className="border border-red-200 text-red-600 font-semibold px-5 py-3 rounded-xl hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit */}
        {editingGoalId && (
          <div className="bg-white rounded-3xl border border-sky-100 shadow-sm p-6 md:p-8">

            <h2 className="text-xl font-bold text-sky-950 mb-4">
              Edit This Week's Goal
            </h2>

            <textarea
              value={goalInput}
              onChange={(event) =>
                setGoalInput(event.target.value)
              }
              rows={4}
              maxLength={300}
              className="w-full border border-sky-200 rounded-2xl px-4 py-4 resize-none outline-none focus:ring-2 focus:ring-sky-300"
            />

            <div className="flex gap-3 mt-4">

              <button
                type="button"
                onClick={handleUpdateGoal}
                disabled={!goalInput.trim()}
                className="bg-sky-500 text-white font-semibold px-5 py-3 rounded-xl hover:bg-sky-600 disabled:opacity-50"
              >
                Save Changes
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingGoalId(null);
                  setGoalInput("");
                }}
                className="bg-slate-100 text-slate-600 font-semibold px-5 py-3 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>

            </div>

          </div>
        )}

        {showAddGoal && (
          <div className="bg-white rounded-3xl border border-sky-100 shadow-sm p-6 md:p-8">
            <h2 className="text-xl font-bold text-sky-950">
              Add a Goal
            </h2>

            <p className="text-sm text-slate-500 mt-2 mb-5">
              Choose something meaningful and realistic for you.
            </p>

            <textarea
              value={goalInput}
              onChange={(event) =>
                setGoalInput(event.target.value)
              }
              rows={4}
              maxLength={300}
              placeholder="For example: I want to walk for 30 minutes three times this week."
              className="w-full border border-sky-200 rounded-2xl px-4 py-4 resize-none outline-none focus:ring-2 focus:ring-sky-300"
            />

            <p className="text-xs text-slate-400 mt-2">
              {goalInput.length}/300
            </p>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={handleSaveGoal}
                disabled={!goalInput.trim()}
                className="bg-sky-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-sky-600 disabled:opacity-50"
              >
                Save My Goal
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddGoal(false);
                  setGoalInput("");
                }}
                className="bg-slate-100 text-slate-600 font-semibold px-5 py-3 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

      </div>

      {!showAddGoal && !editingGoalId && (
        <button
          type="button"
          onClick={() => {
            setGoalInput("");
            setShowAddGoal(true);
          }}
          aria-label="Add a goal"
          title="Add a goal"
          className="
            fixed
            bottom-6
            right-6
            md:bottom-8
            md:right-8
            w-14
            h-14
            md:w-16
            md:h-16
            rounded-full
            bg-sky-500
            text-white
            text-3xl
            font-light
            shadow-lg
            hover:bg-sky-600
            active:bg-sky-700
            flex
            items-center
            justify-center
            z-40
          "
        >
          +
        </button>
      )}

      {goalToDelete && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 w-full max-w-md">
            <h2 className="text-xl font-bold text-sky-950">
              Delete this goal?
            </h2>

            <p className="text-slate-600 mt-3">
              Are you sure you want to delete this goal?
              This action cannot be undone.
            </p>

            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 mt-4">
              <p className="text-sky-950 font-medium">
                {goalToDelete.goal}
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setGoalToDelete(null)}
                className="bg-slate-100 text-slate-700 font-semibold px-5 py-3 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  handleDeleteGoal(goalToDelete);
                  setGoalToDelete(null);
                }}
                className="bg-red-500 text-white font-semibold px-5 py-3 rounded-xl hover:bg-red-600"
              >
                Yes, Delete Goal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GoalSetting;