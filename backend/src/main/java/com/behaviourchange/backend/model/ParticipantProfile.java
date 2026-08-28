package com.behaviourchange.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "participant_profiles")
public class ParticipantProfile {

    @Id
    private String participantId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "participant_id")
    private Participant participant;

    @Column(nullable = false, length = 100)
    private String displayName;

    @Column(nullable = false, length = 20)
    private String bodyColour;

    @Column(nullable = false, length = 20)
    private String glassesColour;

    @Column(nullable = false)
    private long updatedAt;

    public ParticipantProfile() {
    }

    public ParticipantProfile(
            Participant participant,
            String displayName,
            String bodyColour,
            String glassesColour,
            long updatedAt) {

        this.participant = participant;
        this.displayName = displayName;
        this.bodyColour = bodyColour;
        this.glassesColour = glassesColour;
        this.updatedAt = updatedAt;
    }

    public String getParticipantId() {
        return participantId;
    }

    public Participant getParticipant() {
        return participant;
    }

    public void setParticipant(Participant participant) {
        this.participant = participant;
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

    public long getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(long updatedAt) {
        this.updatedAt = updatedAt;
    }
}
