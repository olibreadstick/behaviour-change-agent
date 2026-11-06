let assessment = $json.output ?? {};
if (typeof assessment === "string") assessment = JSON.parse(assessment);

// Preserve normalized workflow context and evaluation-dataset columns,
// then overlay Agent 1's structured assessment.
const state = {
  ...$json,
  ...assessment
};
delete state.output;

// Approved TDF -> BCT candidate mappings from the AI Architect document.
const mapping = {
  knowledge: [
    "instruction_on_how_to_perform_behaviour",
    "information_about_antecedents",
    "information_about_consequences",
    "demonstration_of_behaviour",
    "feedback_on_behaviour"
  ],
  skills: [
    "instruction_on_how_to_perform_behaviour",
    "demonstration_of_behaviour",
    "behavioural_rehearsal_practice",
    "feedback_on_behaviour",
    "graded_tasks"
  ],
  beliefs_about_capabilities: [
    "verbal_persuasion_about_capability",
    "focus_on_past_success",
    "graded_tasks",
    "behavioural_rehearsal_practice",
    "feedback_on_behaviour"
  ],
  beliefs_about_consequences: [
    "information_about_consequences",
    "pros_and_cons",
    "salience_of_consequences",
    "credible_source"
  ],
  intentions: [
    "goal_setting",
    "commitment",
    "action_planning",
    "review_behaviour_goals"
  ],
  goals: [
    "goal_setting",
    "review_goals",
    "problem_solving",
    "action_planning",
    "discrepancy_between_current_behaviour_and_goal"
  ],
  memory_attention_decision_processes: [
    "prompts_cues",
    "action_planning",
    "adding_objects_to_environment",
    "restructuring_physical_environment"
  ],
  behavioural_regulation: [
    "self_monitoring_of_behaviour",
    "feedback_on_behaviour",
    "problem_solving",
    "action_planning",
    "review_behaviour_goals"
  ],
  reinforcement: [
    "self_reward",
    "social_reward",
    "incentive",
    "behaviour_substitution",
    "feedback_on_behaviour"
  ],
  emotion: [
    "reduce_negative_emotions",
    "problem_solving_coping_strategies",
    "feedback_on_behaviour"
  ],
  environmental_context_resources: [
    "restructuring_physical_environment",
    "adding_objects_to_environment",
    "problem_solving",
    "prompts_cues"
  ],
  social_influences: [
    "social_support_practical",
    "social_support_emotional",
    "social_support_unspecified",
    "restructuring_social_environment",
    "modelling_demonstration"
  ]
};

const tdf = state.primary_tdf;
let candidate_bcts = [];
let mapping_status = "";

if (tdf === "none") {
  mapping_status = "no_bct_needed";
} else if (tdf === "unknown") {
  mapping_status = "needs_clarification";
} else if (mapping[tdf]) {
  candidate_bcts = mapping[tdf];
  mapping_status = "mapped_from_ai_architect";
} else {
  // No explicit approved candidate list was supplied for every TDF domain.
  // Do not invent mappings for domains such as optimism or social/professional role identity.
  mapping_status = "approved_mapping_not_provided";
}

const resourceBySeBct = {
  goal_setting: "goal_setting",
  action_planning: "action_planning_problem_solving",
  problem_solving: "action_planning_problem_solving",
  self_monitoring: "self_monitoring"
};

const workshop_resource_eligible = ["knowledge", "skills"].includes(tdf) && !!resourceBySeBct[state.se_bct];
const suggested_workshop_resource = workshop_resource_eligible ? resourceBySeBct[state.se_bct] : "none";

return [{
  json: {
    ...state,
    candidate_bcts,
    mapping_status,
    workshop_resource_eligible,
    suggested_workshop_resource
  }
}];