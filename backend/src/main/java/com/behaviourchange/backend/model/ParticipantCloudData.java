package com.behaviourchange.backend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
    name = "participant_cloud_data",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_participant_cloud_data_participant_key",
        columnNames = {"participant_id", "data_key"}
    )
)
public class ParticipantCloudData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "participant_id", nullable = false, length = 64)
    private String participantId;

    @Column(name = "data_key", nullable = false, length = 255)
    private String dataKey;

    @Column(name = "payload", nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public ParticipantCloudData() {}

    public ParticipantCloudData(String participantId, String dataKey, String payload) {
        this.participantId = participantId;
        this.dataKey = dataKey;
        this.payload = payload;
        this.updatedAt = Instant.now();
    }

    @PrePersist
    @PreUpdate
    public void touchUpdatedAt() {
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getParticipantId() { return participantId; }
    public void setParticipantId(String participantId) { this.participantId = participantId; }
    public String getDataKey() { return dataKey; }
    public void setDataKey(String dataKey) { this.dataKey = dataKey; }
    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }
    public Instant getUpdatedAt() { return updatedAt; }
}
