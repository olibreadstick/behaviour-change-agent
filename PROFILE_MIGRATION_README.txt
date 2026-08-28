Behaviour Change Agent - Participant Profile Backend Migration

This bundle adds backend persistence for:
- participant display name
- onboarding completion (a saved profile row means onboarding is complete)
- penguin body colour
- penguin glasses colour

It intentionally does NOT expose display names through the existing admin participant summary endpoint.

Files replaced:
- App.tsx
- components/Onboarding.tsx

Files added:
- services/profile.ts
- backend/src/main/java/com/behaviourchange/backend/model/ParticipantProfile.java
- backend/src/main/java/com/behaviourchange/backend/repository/ParticipantProfileRepository.java
- backend/src/main/java/com/behaviourchange/backend/dto/ParticipantProfileRequest.java
- backend/src/main/java/com/behaviourchange/backend/dto/ParticipantProfileResponse.java
- backend/src/main/java/com/behaviourchange/backend/service/ParticipantProfileService.java
- backend/src/main/java/com/behaviourchange/backend/controller/ParticipantProfileController.java

New endpoints:
GET    /api/participant-profiles/{participantId}
PUT    /api/participant-profiles/{participantId}
DELETE /api/participant-profiles/{participantId}

After copying these files into the project:
1. Compile the backend with ./mvnw clean compile
2. Start Spring with your existing admin environment variables.
3. Start the frontend with npm run dev
4. Test a new participant onboarding.
5. Log out/in and verify the name/penguin persist.
6. Edit the name and penguin, log out/in, and verify they persist.
