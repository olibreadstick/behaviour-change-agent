# Behaviour Change Agent

A theory-informed, self-compassionate AI system designed to support personalized behaviour change through structured interactive guides.

## Overview

The **Behaviour Change Agent** is an AI-assisted behaviour-change support system designed to help users work toward healthier or more goal-directed behaviours through structured, supportive interactions.

Rather than providing unrestricted general-purpose coaching, the system guides users through specific behaviour-change techniques using bounded modules and persistent session state.

The agent was designed around principles of:

* Self-compassion
* Personalization
* Consistency
* Disability-inclusive support
* Structured behaviour-change techniques
* User autonomy
* Persistent progress tracking

The system combines a **React frontend** with an **n8n agentic workflow**, structured LLM outputs, deterministic routing, persistent user state, and interactive quick-reply options.

---

## Live Application

Add your deployed application link here:

```text
https://YOUR-APP.vercel.app/
```

---

## System Architecture

The application uses a hybrid architecture in which the LLM handles natural-language interaction while deterministic workflow components control guide progression, routing, and persistent session state.

```text
User
  |
  v
React Interface
  |
  v
n8n Webhook
  |
  v
Session State Retrieval
  |
  v
Guide / Module Routing
  |
  +-------------------------------+
  |               |               |
  v               v               v
Goal Setting   Action Planning   Self-Monitoring
               + Problem Solving
  |               |               |
  +---------------+---------------+
                  |
                  v
           Structured LLM Output
                  |
                  v
         Persistent Session State
                  |
                  v
          React User Interface
```

---

## Behaviour Change Guides

### Goal Setting

The Goal Setting Guide helps users develop a goal that is meaningful, realistic, and appropriate for their circumstances.

The guide distinguishes between:

* **Learning Goals** — focused on developing knowledge or skills
* **Performance Goals** — focused on performing a behaviour or activity
* **Outcome Goals** — focused on achieving a broader result

The workflow helps users:

* Identify the type of goal they are setting
* Clarify the intended behaviour
* Explore why the goal matters
* Assess confidence and commitment
* Consider physical, environmental, and scheduling feasibility
* Refine goals that may be unrealistic or overly demanding
* Produce a clear final goal statement

---

### Action Planning + Problem Solving

The Action Planning and Problem Solving Guide translates a goal into a practical plan.

Users identify:

* **What** they will do
* **When** they will do it
* **Where** it will happen
* **How** they will carry it out

The guide then explores potential barriers and develops realistic alternatives.

Features include:

* Barrier identification
* Alternative activity planning
* Environmental considerations
* Reminders and cues
* Implementation intentions
* If/then planning

Example:

```text
If the weather is too poor for my outdoor walk,
then I will walk indoors at the mall instead.
```

---

### Self-Monitoring

The Self-Monitoring Guide supports users in tracking behaviour and reflecting on progress.

The guide includes both:

* **Thinking**
* **Action**

Users determine:

* What they want to monitor
* How they will record it
* When they will track it
* How frequently they will review progress

The goal is to make self-monitoring useful and manageable rather than burdensome.

---

## Guide Interaction Modes

Each module supports two interaction paths:

### Use the Guide Now

The user works through the selected behaviour-change technique interactively.

### Learn the Guide First

The system explains the purpose and structure of the technique before the user begins applying it.

This allows users to choose whether they want immediate practical support or more information about the behaviour-change method first.

---

## Persistent Session State

The system maintains progress across interactions using session-specific state.

Examples of stored state include:

```text
sessionId
active_module
current_step
current_goal
goal_type
goal_quality
ready_for_action_planning
```

This allows the workflow to:

* Resume an unfinished guide
* Preserve the user's current goal
* Route the conversation to the correct step
* Prevent unnecessary repetition
* Maintain consistent behaviour across multiple messages

---

## Structured Interaction

The application uses structured outputs rather than allowing unrestricted LLM responses to determine workflow progression.

Responses may include:

```json
{
  "chat_response": "What type of goal would you like to work on?",
  "quick_reply_options": [
    "Learning Goal",
    "Performance Goal",
    "Outcome Goal"
  ]
}
```

The workflow uses these structured values to control both the conversation and the user interface.

---

## User Interface

The frontend is built in **React** and communicates with the n8n workflow through production webhooks.

The application includes:

* Conversational chat interface
* Quick-reply buttons
* Persistent user sessions
* Loading and error states
* Automatic chat scrolling
* Structured response formatting
* Profile-specific sessions
* Behaviour-change resources
* Calendar-related activity support
* User profile functionality
* Light-blue interface theme

---

## Research Purpose

The Behaviour Change Agent was developed as part of a research project investigating whether a specialized, theory-informed behaviour-change agent can provide more structured and consistent support than a general-purpose conversational AI system.

The evaluation considers factors such as:

* Behaviour-change technique delivery
* Personalization
* Consistency
* Usefulness
* Theory alignment
* Interaction quality

The system is intentionally designed as a **behaviour-change guide**, rather than as a replacement for professional healthcare or formal therapy.

---

## Technologies

### Frontend

* React
* TypeScript / JavaScript
* HTML
* CSS

### AI and Workflow

* n8n
* OpenAI language models
* Agentic AI
* Prompt engineering
* Structured output parsing
* Persistent session state
* Deterministic workflow routing

### Development

* Git
* GitHub
* REST APIs
* JSON
* Vercel

---

## Key Design Principles

### Structured Rather Than Open-Ended

The LLM supports the interaction, but workflow logic determines which behaviour-change module and step should occur next.

### Self-Compassionate Communication

The system uses supportive, nonjudgmental language and avoids framing setbacks as failures.

### Disability-Inclusive Adaptation

Plans can be adjusted based on factors such as:

* Physical capacity
* Energy
* Symptoms
* Schedule
* Access to suitable activities or environments

### User Autonomy

The system helps users develop their own goals and plans rather than prescribing a fixed behaviour.

---

## Repository Structure

```text
behaviour-change-agent/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── App.tsx
│
├── public/
│
├── workflows/
│   └── behaviour-change-workflow-public.json
│
├── package.json
├── README.md
└── .gitignore
```

---

## Running the Frontend

Install dependencies:

```bash
npm install
```

Run the application locally:

```bash
npm run dev
```

The frontend requires a configured n8n backend and associated webhook endpoint for complete functionality.

---

## Privacy and Security

A public repository should not contain:

* API keys
* Authentication tokens
* Private webhook credentials
* Real participant information
* Personal health information
* Unsanitized workflow exports

Any n8n workflow included publicly should be sanitized before upload.

---

## Future Development

Future work may include:

* Expanded self-monitoring functionality
* Additional behaviour-change techniques
* Longer-term progress tracking
* More personalized guide selection
* Improved evaluation across different user scenarios
* Comparison with general-purpose conversational AI
* Expanded accessibility and disability-inclusive adaptations

---

## Author

**Olivia Cardillo**

McGill University
