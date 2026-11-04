export interface GoalEvent { at: string; label: string; detail?: string }
export interface StoredGoal { id: string; goal: string; weekStart?: string; completed: boolean; createdAt: string; completedAt?: string; actionPlan?: string; events?: GoalEvent[] }
export const goalKey = (userId: string) => `behaviour_change_weekly_goal_${userId}`;
export const goalEventName = "behaviour-change-goals-updated";
export function loadGoals(userId: string): StoredGoal[] {
  try {
    const raw = localStorage.getItem(goalKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return items.filter((item): item is StoredGoal => Boolean(item && typeof item.id === "string" && typeof item.goal === "string"))
      .sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  } catch { return []; }
}
export function saveGoals(userId: string, goals: StoredGoal[]) {
  localStorage.setItem(goalKey(userId), JSON.stringify(goals));
  window.dispatchEvent(new Event(goalEventName));
}
