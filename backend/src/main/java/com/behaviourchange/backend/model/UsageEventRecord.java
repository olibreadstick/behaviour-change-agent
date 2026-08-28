package com.behaviourchange.backend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "usage_events")
public class UsageEventRecord {

    @Id
    @Column(name = "event_id", nullable = false, length = 160)
    private String id;

    @Column(name = "participant_id", nullable = false, length = 64)
    private String participantId;

    @Column(name = "event_type", nullable = false, length = 120)
    private String type;

    @Column(name = "event_timestamp", nullable = false, length = 80)
    private String timestamp;

    @Column(name = "metadata_json", nullable = false, columnDefinition = "TEXT")
    private String metadataJson;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public UsageEventRecord() {}

    public UsageEventRecord(
        String id,
        String participantId,
        String type,
        String timestamp,
        String metadataJson
    ) {
        this.id = id;
        this.participantId = participantId;
        this.type = type;
        this.timestamp = timestamp;
        this.metadataJson = metadataJson;
        this.createdAt = Instant.now();
    }

    @PrePersist
    public void ensureCreatedAt() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public String getId() { return id; }
    public String getParticipantId() { return participantId; }
    public String getType() { return type; }
    public String getTimestamp() { return timestamp; }
    public String getMetadataJson() { return metadataJson; }
    public Instant getCreatedAt() { return createdAt; }
}
