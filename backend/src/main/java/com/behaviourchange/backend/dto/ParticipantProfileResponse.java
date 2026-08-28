package com.behaviourchange.backend.dto;

public class ParticipantProfileResponse {

    private final String participantId;
    private final String displayName;
    private final String bodyColour;
    private final String glassesColour;
    private final long updatedAt;

    public ParticipantProfileResponse(
            String participantId,
            String displayName,
            String bodyColour,
            String glassesColour,
            long updatedAt) {

        this.participantId = participantId;
        this.displayName = displayName;
        this.bodyColour = bodyColour;
        this.glassesColour = glassesColour;
        this.updatedAt = updatedAt;
    }

    public String getParticipantId() {
        return participantId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getBodyColour() {
        return bodyColour;
    }

    public String getGlassesColour() {
        return glassesColour;
    }

    public long getUpdatedAt() {
        return updatedAt;
    }
}
