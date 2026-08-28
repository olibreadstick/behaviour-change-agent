package com.behaviourchange.backend.dto;

public class AuthResponse {

    private String participantId;

    public AuthResponse(String participantId) {
        this.participantId = participantId;
    }

    public String getParticipantId() {
        return participantId;
    }
}
