# Daily Coach phone app

An Expo / React Native app for iPhone, Android, and the browser. The existing Vercel website now serves this participant app at `/` and the researcher console at `/admin/`. See the root `WEBSITE-UPDATE.md` for the combined website deployment. The app has Today, Learn, Calendar, Community, and Compassion Hub screens. A named penguin companion stays at the top, with settings for the user's optional preferred name and pronouns.

The three guides restore teaching examples from the earlier n8n export. Both “Learn the guide first” and “Use the guide now” are available. Progress is saved on the device; connected participant accounts also save it through the existing Spring API. The coach receives confirmed goals, action plans, activities, monitoring, recent reflections, lesson progress, and recent conversation history with each message.

## Updating an existing mobile installation

Copy the updated `mobile/src` folder from this package into your existing `mobile/src` folder, including the new `Penguin.tsx`. Keep your existing `mobile/.env`. The penguin update requires no new dependencies. Restart the Expo server; existing participant accounts and progress are preserved. The first opening asks you to personalize the penguin, with a skip option.

Import this package's `workflows/behaviour-change-mobile.json` as a new inactive workflow. Re-select both OpenAI credentials and the four session-table bindings described below. Its new mobile webhook path is `behaviour-change-penguin-coach`, so it can be tested alongside the previously imported mobile workflow. Publish the new workflow, copy its Production URL into `EXPO_PUBLIC_N8N_COACH_URL`, and restart Expo. The two-agent coaching design and original guide content are preserved; the added context carries preferences and the selected item needing help.

## Penguin energy and connected feedback

Both guide exercises and real-world activities count as homework. A lesson's first completion earns 20 energy. Confirming a completed guide-practice draft earns 20 energy for that submission. Marking a scheduled activity completed earns 15 energy; reopening and completing the same activity does not give a second award. A submitted reflection earns 5 energy, including reflections about difficulties. Energy is cumulative and does not decrease during breaks. Existing progress is retained; earlier completions are not retroactively credited.

The Calendar connects goals, action plans, barriers, and scheduled activities. Each item can open the Compassion Hub with its details and an editable starting message. Community tips and guide steps have the same contextual connection. Goal completion triggers an immediate penguin celebration. For individualized AI feedback, review a goal draft before confirmation or choose feedback on a saved goal. Goal-review messages are included in participant conversation history. AI suggestions never change a saved goal automatically.

Preview supports the penguin, homework rewards, guide exercises, calendar, and reflections locally. Goal review and chat require the connected n8n workflow. Community sharing remains explicit and requires a connected account.

## Preview on your phone

Run these commands from the repository root. Installing dependencies changes only this app's dependencies. Starting Expo opens a development server and prints a QR code; it does not deploy anything.

```bash
cd mobile
npm ci
npx expo login
npx expo start
```

Install Expo Go on your phone. On iPhone, sign in to Expo Go using the same Expo account used by `npx expo login` on your computer; SDK 57 requires both sign-ins. Keep the phone and computer on the same Wi-Fi network, then scan the QR code using the iPhone Camera app. On Android, use the scanner in Expo Go. Select **Preview the app** to explore guides, save a goal, make a plan, schedule an activity, and write a reflection without connecting external services. Preview uses a separate device-only account and makes no AI, participant-login, community, or cloud requests. Original resource PDFs open on the existing website when selected.

## Connect participant accounts and live coaching

1. Import `../workflows/behaviour-change-mobile.json` as a **new, inactive** n8n workflow.
2. Select your existing OpenAI credential for both chat model nodes.
3. Select the existing `BehaviourChangeSessions` data table in Get Session State, Create Session State, Save Coaching State, and Save Guide State. The schema stays unchanged.
4. Publish the new workflow when ready and copy the **production** POST URL from **Mobile Coach Webhook**.
5. Copy `.env.example` to `.env` and fill in `EXPO_PUBLIC_N8N_COACH_URL`. `EXPO_PUBLIC_API_URL` points to the existing Render API. Both are public endpoints, not private service keys.
6. Restart Expo so the environment values are included. Sign in using an existing participant account or create a test account.

No participant passwords, database connection strings, OpenAI API keys, n8n credentials, or workflow execution examples belong in these app files.

## How guide and coach requests work

All requests include a conversation-specific `sessionId` and `app_context`. A chat request supplies `chatInput`. A guide request supplies `guide_event` with `guide_id`, `mode`, `kind`, `step`, and, where relevant, `answer` and `draft`.

Explicit guide requests run deterministic teaching/practice without calling an LLM. General chat keeps the current two-agent assessment, approved TDF-to-BCT mappings, and constrained coaching. Workshop suggestions remain conditional on participants' needs. Teaching content and code are shared with the app's preview to keep both experiences consistent.

Guide application creates a **draft**. The participant must select **Confirm and save** before a goal or plan becomes saved context. Action planning requires a confirmed active goal. Learning can be skipped or revisited at any time. Free text remains available alongside coach quick replies.

## Data and administration

Browser testing uses an exact origin, including its port. Run `npx expo start --web --port 3000` to use an origin already permitted by the existing backend; the website package does not deploy backend CORS changes. In the imported n8n workflow's Mobile Coach Webhook options, add `http://localhost:3000` to Allowed Origins (CORS), then publish the change. Opening the browser at `http://localhost:3000` permits login and coaching; a LAN IP address is a different origin.

Mobile progress has its own `behaviour_change_mobile_<participantId>` cloud record. Existing website goals, activities, and conversations are imported without deleting or overwriting website records. Mobile updates do not continuously rewrite the legacy website records.

The researcher console at `/admin/` can read the shared website/phone conversations once this update is deployed. Mobile guide usage includes `workshopId`; goal, activity, resource, and conversation events use the existing usage endpoint. Community tips use the same community record format as the website.

Cached edits survive offline use. Sync failures remain visible and can be retried. A failed first cloud load is retried before writing a snapshot. Reconnection merges distinct records so an empty device snapshot does not erase previously saved remote records. Simultaneous edits to the same record on multiple phones still use the existing snapshot API; transactional conflict resolution is not supplied by that API.

## Validation

```bash
npm run typecheck
npm test
npm run export:web
```

Tests cover teaching progression, wrong answers, guide prerequisites, explicit confirmation, shared coach context, legacy import, reconnection, invalid calendar input, request normalization, and generated n8n routing. A web export permits a browser review of the same React Native screens. Neither this nor a JavaScript bundle substitutes for checking live AI responses and running on physical iPhone and Android devices.

## Distribution

`eas.json` includes internal preview and production build profiles. App Store / Play Store signing, accounts, final identifiers, store assets, and release submission are configured when the design and connected testing are complete. No store build or submission is performed by the setup commands above.
