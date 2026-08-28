package com.behaviourchange.backend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "shared_cloud_data")
public class SharedCloudData {

    @Id
    @Column(name = "record_id", nullable = false, length = 128)
    private String recordId;

    @Column(name = "payload", nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public SharedCloudData() {}

    public SharedCloudData(String recordId, String payload) {
        this.recordId = recordId;
        this.payload = payload;
        this.updatedAt = Instant.now();
    }

    @PrePersist
    @PreUpdate
    public void touchUpdatedAt() {
        this.updatedAt = Instant.now();
    }

    public String getRecordId() { return recordId; }
    public void setRecordId(String recordId) { this.recordId = recordId; }
    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }
    public Instant getUpdatedAt() { return updatedAt; }
}
