export type GuideId = 'goal_setting' | 'action_planning_problem_solving' | 'self_monitoring';
export type Tab = 'Today' | 'Learn' | 'Calendar' | 'Community' | 'Compassion Hub';
export interface BuddyProfile { displayName: string; pronouns: string; penguinName: string; onboarded: boolean }
export type HomeworkKind = 'guide_learning' | 'guide_practice' | 'activity' | 'reflection';
export interface HomeworkAward { id: string; kind: HomeworkKind; label: string; energy: number; createdAt: string }
export interface BuddyFeedback { message: string; createdAt: string }
export interface CoachRequest { id: string; source: Tab; kind: 'goal_review' | 'goal_support' | 'goal_completed' | 'activity_support' | 'plan_support' | 'community_tip' | 'guide_help' | 'reflection' | 'check_in'; prompt: string; subject?: string; goalId?: string; activityId?: string; planId?: string }
export type AskCoach = (request?: Omit<CoachRequest, 'id' | 'source'>) => void;
export interface GuideStep { title: string; body: string; question?: string; options?: string[]; correct?: string; hint?: string; feedback?: string; field?: string }
export interface GuideDefinition { id: GuideId; title: string; subtitle: string; lessons: GuideStep[]; practice: GuideStep[]; resource: string }
export interface GuideEvent { guide_id: GuideId; mode: 'learn' | 'use'; kind: 'open' | 'answer'; step: number; answer?: string; draft?: Record<string, string> }
export interface GuideView { guide_id: GuideId; mode: 'learn' | 'use'; step: number; title: string; body: string; question: string; options: string[]; completed: boolean; feedback: string; draft: Record<string, string>; total_steps: number; progress: number; attemptId?: string }
export interface GuideResponse { chat_response: string; quick_reply_options: string[]; guide?: GuideView; guide_redirect?: GuideId }
export interface Goal { id: string; goal: string; goalType?: string; meaning?: string; confidence?: string; feasibility?: string; weekStart: string; completed: boolean; confirmed: boolean; createdAt: string; completedAt?: string }
export interface Plan { id: string; goalId: string; what: string; when: string; where: string; how: string; barrier: string; alternative: string; cue: string; createdAt: string }
export interface MonitoringPlan { what: string; how: string; when: string; frequency: string; stage: string }
export interface Activity { id: string; title: string; date: string; time: string; durationMinutes: number; status: 'planned' | 'completed'; goalId?: string }
export interface Reflection { id: string; text: string; createdAt: string }
export interface Message { id: string; role: 'user' | 'assistant'; text: string; createdAt: string; failed?: boolean }
export interface Conversation { id: string; sessionId: string; title: string; messages: Message[]; quickReplies: string[] }
export interface UsageEvent { id: string; userId: string; type: string; timestamp: string; metadata: Record<string, string | number | boolean | null> }
export interface AppState { version: 1; revision: number; profile: BuddyProfile; homeworkAwards: HomeworkAward[]; buddyFeedback?: BuddyFeedback; coachRequest?: CoachRequest; goals: Goal[]; plans: Plan[]; monitoring?: MonitoringPlan; activities: Activity[]; reflections: Reflection[]; completedLessons: GuideId[]; guide?: GuideView; conversations: Conversation[]; activeConversationId: string; pendingEvents: UsageEvent[]; dirty: boolean; updatedAt: string }
export interface CoachContext { participant_id: string; source_screen: Tab; participant_preferences: BuddyProfile; penguin: { name: string; energy_earned: number; homework_completed: number }; requested_help: CoachRequest | null; confirmed_goal: Goal | null; goals: Goal[]; action_plans: Plan[]; activities: Activity[]; monitoring_plan: MonitoringPlan | null; recent_reflections: Reflection[]; completed_lessons: GuideId[]; guide_progress: GuideView | null; conversation_history: Array<{ role: 'user' | 'assistant'; text: string }> }
export interface CoachResponse { chat_response: string; quick_reply_options?: string[]; intervention_mode?: string; workshop_resource?: GuideId | 'none' }
export interface CommunityPost { id: string; concept: string; text: string; createdAt: string; authorId: string }
