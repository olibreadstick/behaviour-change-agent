import { GuideEvent, GuideDefinition, GuideResponse, CoachContext } from './types';
export const GUIDE_DEFINITIONS: GuideDefinition[];
export function guideResponse(event: GuideEvent, context?: Partial<CoachContext>): GuideResponse;
