package com.behaviourchange.backend.dto;

public class ParticipantResponse {

    private String participantId;
    private long createdAt;

    public ParticipantResponse(
            String participantId,
            long createdAt) {

        this.participantId = participantId;
        this.createdAt = createdAt;
    }

    public String getParticipantId() {
        return participantId;
    }

    public long getCreatedAt() {
        return createdAt;
    }
}