For the latest **website** package, follow the root `WEBSITE-UPDATE.md`. The notes below describe the earlier incremental phone-only Penguin update.

# Penguin companion update

This is an incremental update for the Daily Coach app installed from the earlier source package.

## Apply the app update

1. Stop the Expo server with Control + C.
2. Copy the files from this package's `mobile/src` into your repository's `mobile/src`. Replace the matching source files and include the new `Penguin.tsx`. Do not replace the entire repository.
3. Keep your existing `mobile/.env`, assets, package files, and participant accounts. This update requires no new dependencies.
4. Import this package's `workflows/behaviour-change-mobile.json` as a new inactive n8n workflow. It is named **Behaviour Change Agent - Penguin Coach and Guides**.
5. Select your existing OpenAI credentials in both chat model nodes. Select your existing BehaviourChangeSessions table in Get Session State, Create Session State, Save Coaching State, and Save Guide State.
6. Publish the new workflow. Its **Mobile Coach Webhook** uses the new path `behaviour-change-penguin-coach`, so your earlier mobile workflow can keep running while you test this version.
7. Copy the new webhook's Production URL into `EXPO_PUBLIC_N8N_COACH_URL` in your existing `mobile/.env`.
8. From your repository's `mobile` folder, run `npx expo start --go --port 3000`. This starts the local preview and shows a QR code; it does not publish a store build. Scan it with the iPhone Camera while Expo Go and the Mac CLI are signed into the same Expo account.

## What changed

- Persistent penguin header and settings for its name, your preferred name, and optional pronouns.
- Today, Learn, Calendar, Community, and Compassion Hub navigation.
- Calendar week view and contextual support for each goal, plan, and scheduled activity.
- Community tips and barriers connect to problem-solving conversations.
- Goal drafts can receive live AI feedback before confirmation. Saved goals also have a feedback entry point. Only the participant revises or confirms a goal.
- Goal completion triggers a penguin celebration.
- Both guide exercises and real-world activities count as homework: 20 energy for a lesson's first completion, 20 per confirmed practice submission, 15 for completing an activity, and 5 per submitted reflection. The same reopened activity earns energy only once.
- Existing progress remains available. Previous completions are not retroactively credited. Energy is cumulative and does not decrease during breaks.

## Check on your phone

Sign into a test participant account, personalize your penguin, and complete one goal-setting exercise. Use **Review my goal with my penguin** before confirming the goal, and check the response in the new n8n workflow's Executions. Confirm the goal, schedule and complete an activity, and submit a reflection in the Compassion Hub. Verify that the penguin's energy increases and survives closing and reopening the app. Reopening the completed activity should not give it a second reward.

For code validation, `npm run typecheck` and `npm test` run from `mobile`. TypeScript, all 16 journey tests, and iPhone/Android/web bundle exports passed for this update. Automated browser screen testing could not run in the execution environment; live workflow responses and the new phone screens still require checking. No production workflow, Render deployment, or app-store release was changed automatically.
