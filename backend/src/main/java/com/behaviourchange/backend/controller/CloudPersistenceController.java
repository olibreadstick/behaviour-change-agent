package com.behaviourchange.backend.controller;

import com.behaviourchange.backend.model.ParticipantCloudData;
import com.behaviourchange.backend.model.SharedCloudData;
import com.behaviourchange.backend.model.UsageEventRecord;
import com.behaviourchange.backend.repository.ParticipantCloudDataRepository;
import com.behaviourchange.backend.repository.ParticipantRepository;
import com.behaviourchange.backend.repository.SharedCloudDataRepository;
import com.behaviourchange.backend.repository.UsageEventRecordRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/cloud")
public class CloudPersistenceController {

    private final ParticipantCloudDataRepository participantCloudDataRepository;
    private final SharedCloudDataRepository sharedCloudDataRepository;
    private final UsageEventRecordRepository usageEventRecordRepository;
    private final ParticipantRepository participantRepository;
    private final JsonMapper jsonMapper;

    public CloudPersistenceController(
        ParticipantCloudDataRepository participantCloudDataRepository,
        SharedCloudDataRepository sharedCloudDataRepository,
        UsageEventRecordRepository usageEventRecordRepository,
        ParticipantRepository participantRepository,
        JsonMapper jsonMapper
    ) {
        this.participantCloudDataRepository = participantCloudDataRepository;
        this.sharedCloudDataRepository = sharedCloudDataRepository;
        this.usageEventRecordRepository = usageEventRecordRepository;
        this.participantRepository = participantRepository;
        this.jsonMapper = jsonMapper;
    }

    @GetMapping("/participants/{participantId}")
    public List<ParticipantDataResponse> getParticipantData(
        @PathVariable String participantId
    ) {
        return participantCloudDataRepository
            .findByParticipantIdOrderByDataKeyAsc(participantId)
            .stream()
            .map(this::toParticipantDataResponse)
            .toList();
    }

    @PutMapping("/participants/{participantId}")
    public ResponseEntity<ParticipantDataResponse> upsertParticipantData(
        @PathVariable String participantId,
        @RequestBody ParticipantDataRequest request
    ) {
        if (
            request.key() == null ||
            request.key().isBlank() ||
            request.payload() == null
        ) {
            return ResponseEntity.badRequest().build();
        }

        ParticipantCloudData record = participantCloudDataRepository
            .findByParticipantIdAndDataKey(participantId, request.key())
            .orElseGet(
                () -> new ParticipantCloudData(
                    participantId,
                    request.key(),
                    request.payload()
                )
            );

        record.setPayload(request.payload());

        return ResponseEntity.ok(
            toParticipantDataResponse(
                participantCloudDataRepository.save(record)
            )
        );
    }

    @DeleteMapping("/participants/{participantId}")
    public ResponseEntity<Void> deleteParticipantData(
        @PathVariable String participantId,
        @RequestParam String key
    ) {
        participantCloudDataRepository
            .findByParticipantIdAndDataKey(participantId, key)
            .ifPresent(participantCloudDataRepository::delete);

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/community")
    public List<SharedDataResponse> getCommunityRecords() {
        return sharedCloudDataRepository
            .findAllByOrderByUpdatedAtDesc()
            .stream()
            .map(this::toSharedDataResponse)
            .toList();
    }

    @PutMapping("/community/{recordId}")
    public ResponseEntity<SharedDataResponse> upsertCommunityRecord(
        @PathVariable String recordId,
        @RequestBody SharedDataRequest request
    ) {
        if (request.payload() == null) {
            return ResponseEntity.badRequest().build();
        }

        SharedCloudData record = sharedCloudDataRepository
            .findById(recordId)
            .orElseGet(
                () -> new SharedCloudData(
                    recordId,
                    request.payload()
                )
            );

        record.setPayload(request.payload());

        return ResponseEntity.ok(
            toSharedDataResponse(
                sharedCloudDataRepository.save(record)
            )
        );
    }

    @DeleteMapping("/community/{recordId}")
    public ResponseEntity<Void> deleteCommunityRecord(
        @PathVariable String recordId
    ) {
        if (sharedCloudDataRepository.existsById(recordId)) {
            sharedCloudDataRepository.deleteById(recordId);
        }

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/usage")
    public ResponseEntity<UsageEventResponse> saveUsageEvent(
        @RequestBody UsageEventRequest request
    ) {
        if (
            request.userId() == null ||
            request.userId().isBlank() ||
            request.type() == null ||
            request.type().isBlank()
        ) {
            return ResponseEntity.badRequest().build();
        }

        String eventId =
            request.id() == null || request.id().isBlank()
                ? UUID.randomUUID().toString()
                : request.id();

        Optional<UsageEventRecord> existing =
            usageEventRecordRepository.findById(eventId);

        if (existing.isPresent()) {
            return ResponseEntity.ok(
                toUsageEventResponse(existing.get())
            );
        }

        String timestamp =
            request.timestamp() == null ||
            request.timestamp().isBlank()
                ? Instant.now().toString()
                : request.timestamp();

        String metadataJson = toJson(
            request.metadata() == null
                ? Collections.emptyMap()
                : request.metadata()
        );

        UsageEventRecord saved =
            usageEventRecordRepository.save(
                new UsageEventRecord(
                    eventId,
                    request.userId(),
                    request.type(),
                    timestamp,
                    metadataJson
                )
            );

        return ResponseEntity.ok(
            toUsageEventResponse(saved)
        );
    }

    @GetMapping("/admin/usage")
    public List<UsageEventResponse> getAllUsageEvents() {
        return usageEventRecordRepository
            .findAllByOrderByCreatedAtAsc()
            .stream()
            .map(this::toUsageEventResponse)
            .toList();
    }

    @GetMapping("/admin/participants")
    public List<AdminParticipantResponse> getAnonymousParticipants() {
        return participantRepository
            .findAll()
            .stream()
            .map(
                participant ->
                    new AdminParticipantResponse(
                        participant.getParticipantId(),
                        Long.toString(
                            participant.getCreatedAt()
                        )
                    )
            )
            .sorted(
                Comparator.comparing(
                    AdminParticipantResponse::id
                )
            )
            .toList();
    }

    @GetMapping("/admin/participant-data")
    public List<AdminParticipantDataResponse> getAllParticipantData() {
        return participantCloudDataRepository
            .findAll()
            .stream()
            .map(
                record ->
                    new AdminParticipantDataResponse(
                        record.getParticipantId(),
                        record.getDataKey(),
                        record.getPayload(),
                        record.getUpdatedAt()
                    )
            )
            .toList();
    }

    private ParticipantDataResponse toParticipantDataResponse(
        ParticipantCloudData record
    ) {
        return new ParticipantDataResponse(
            record.getDataKey(),
            record.getPayload(),
            record.getUpdatedAt()
        );
    }

    private SharedDataResponse toSharedDataResponse(
        SharedCloudData record
    ) {
        return new SharedDataResponse(
            record.getRecordId(),
            record.getPayload(),
            record.getUpdatedAt()
        );
    }

    private UsageEventResponse toUsageEventResponse(
        UsageEventRecord record
    ) {
        return new UsageEventResponse(
            record.getId(),
            record.getParticipantId(),
            record.getType(),
            record.getTimestamp(),
            fromJsonObject(record.getMetadataJson())
        );
    }

    private String toJson(Object value) {
        try {
            return jsonMapper.writeValueAsString(value);
        } catch (Exception exception) {
            return "{}";
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fromJsonObject(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyMap();
        }

        try {
            Object parsed =
                jsonMapper.readValue(json, Map.class);

            if (!(parsed instanceof Map<?, ?> rawMap)) {
                return Collections.emptyMap();
            }

            Map<String, Object> result =
                new LinkedHashMap<>();

            rawMap.forEach(
                (key, value) ->
                    result.put(
                        String.valueOf(key),
                        value
                    )
            );

            return result;
        } catch (Exception exception) {
            return Collections.emptyMap();
        }
    }

    public record ParticipantDataRequest(
        String key,
        String payload
    ) {}

    public record ParticipantDataResponse(
        String key,
        String payload,
        Instant updatedAt
    ) {}

    public record SharedDataRequest(
        String payload
    ) {}

    public record SharedDataResponse(
        String id,
        String payload,
        Instant updatedAt
    ) {}

    public record UsageEventRequest(
        String id,
        String userId,
        String type,
        String timestamp,
        Map<String, Object> metadata
    ) {}

    public record UsageEventResponse(
        String id,
        String userId,
        String type,
        String timestamp,
        Map<String, Object> metadata
    ) {}

    public record AdminParticipantResponse(
        String id,
        String createdAt
    ) {}

    public record AdminParticipantDataResponse(
        String participantId,
        String key,
        String payload,
        Instant updatedAt
    ) {}
}
