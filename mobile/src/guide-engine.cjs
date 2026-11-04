/* Shared by the phone app and generated n8n Code node. No network or LLM calls. */
const GUIDE_DEFINITIONS = require('./guides.json');

function guideResponse(event, context = {}) {
  const definition = GUIDE_DEFINITIONS.find(g => g.id === event.guide_id);
  if (!definition) throw new Error('Choose one of the available guides.');
  const mode = event.mode === 'use' ? 'use' : 'learn';
  const steps = mode === 'learn' ? definition.lessons : definition.practice;
  let step = Number.isInteger(event.step) ? event.step : 0;
  if (step < 0 || step >= steps.length) throw new Error('This guide step is unavailable.');
  const draft = { ...(event.draft || {}) };
  let feedback = '';
  let completed = false;
  const isActionPlanning = mode === 'use' && definition.id === 'action_planning_problem_solving';
  const confirmedGoal = isActionPlanning ? context.confirmed_goal : null;

  if (isActionPlanning && !confirmedGoal) {
    return {
      chat_response: 'Let’s confirm a goal before making your action plan.',
      quick_reply_options: [],
      guide_redirect: 'goal_setting',
    };
  }

  // Reuse information the participant already confirmed in Goal Setting.
  // Performance and learning goals already describe the behaviour/preparation step,
  // so Action Planning can begin with the next missing detail instead of asking again.
  if (
    isActionPlanning &&
    confirmedGoal?.goal &&
    !draft.what &&
    (confirmedGoal.goalType === 'Performance goal' || confirmedGoal.goalType === 'Learning goal')
  ) {
    draft.what = confirmedGoal.goal;

    if (event.kind === 'open' && step === 0) {
      step = 1;
    }
  }

  const current = steps[step];
  if (event.kind === 'answer') {
    const answer = typeof event.answer === 'string' ? event.answer.trim() : '';
    if (!answer || answer.length > 3000) throw new Error('Please enter a brief answer.');
    if (current.correct && answer !== current.correct) {
      feedback = current.hint;
    } else if (current.options && !current.options.includes(answer)) {
      throw new Error('Please choose one of the available answers.');
    } else {
      if (current.field) draft[current.field] = answer;
      feedback = current.feedback || '';
      if (step === steps.length - 1) completed = true;
      else step += 1;
    }
  } else if (event.kind !== 'open') {
    throw new Error('This guide action is unavailable.');
  }
  const next = steps[step];
  const confirmedGoalNote =
    isActionPlanning && event.kind === 'open' && confirmedGoal?.goal
      ? `Your confirmed goal: ${confirmedGoal.goal}\n\n`
      : '';
  const body = completed
    ? (mode === 'learn'
      ? 'You’ve practised this guide. You can revisit it whenever you need.'
      : 'Your draft is ready. Review it below before saving.')
    : `${confirmedGoalNote}${next.body}`;

  const guide = {
    guide_id: definition.id,
    mode,
    step,
    title: completed ? 'Ready for your next step' : next.title,
    body,
    question: completed ? '' : (next.question || ''),
    options: completed ? [] : (next.options || []),
    completed,
    feedback,
    draft,
    total_steps: steps.length,
    progress: completed ? steps.length : step,
  };
  return { chat_response: [feedback, guide.body, guide.question].filter(Boolean).join('\n\n'),
    quick_reply_options: guide.options, guide };
}

module.exports = { GUIDE_DEFINITIONS, guideResponse };
