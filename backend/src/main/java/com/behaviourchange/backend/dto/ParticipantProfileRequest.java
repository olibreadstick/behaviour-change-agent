package com.behaviourchange.backend.dto;

public class ParticipantProfileRequest {

    private String displayName;
    private String bodyColour;
    private String glassesColour;

    public ParticipantProfileRequest() {
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getBodyColour() {
        return bodyColour;
    }

    public void setBodyColour(String bodyColour) {
        this.bodyColour = bodyColour;
    }

    public String getGlassesColour() {
        return glassesColour;
    }

    public void setGlassesColour(String glassesColour) {
        this.glassesColour = glassesColour;
    }
}
