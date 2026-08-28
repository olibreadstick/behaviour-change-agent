export type UsageEventType =
  | "app_opened"
  | "page_viewed"
  | "coach_interaction"
  | "resource_opened"
  | "workshop_started"
  | "workshop_completed"
  | "calendar_activity_added"
  | "calendar_activity_completed"
  | "calendar_activity_missed"
  | "goal_set"
  | "goal_edited"
  | "goal_completed";

export interface UsageEvent {
  id: string;
  userId: string;
  type: UsageEventType;
  timestamp: string;
  metadata?: Record<
    string,
    string | number | boolean | null
  >;
}

const STORAGE_KEY = "behaviour_change_usage_events";

export const getUsageEvents = (): UsageEvent[] => {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
};

export const logUsageEvent = (
  userId: string,
  type: UsageEventType,
  metadata: UsageEvent["metadata"] = {}
) => {
  const event: UsageEvent = {
    id: crypto.randomUUID(),
    userId,
    type,
    timestamp: new Date().toISOString(),
    metadata,
  };

  const existingEvents = getUsageEvents();

  // Keep the most recent 5000 events for the prototype
  const updatedEvents = [
    ...existingEvents,
    event,
  ].slice(-5000);

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updatedEvents)
  );

  window.dispatchEvent(
    new CustomEvent("behaviour-change-usage-updated")
  );

  return event;
};