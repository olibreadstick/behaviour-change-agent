package com.behaviourchange.backend.controller;

import com.behaviourchange.backend.model.ParticipantCloudData;
import com.behaviourchange.backend.model.SharedCloudData;
import com.behaviourchange.backend.model.UsageEventRecord;
import com.behaviourchange.backend.repository.ParticipantCloudDataRepository;
import com.behaviourchange.backend.repository.ParticipantRepository;
import com.behaviourchange.backend.repository.SharedCloudDataRepository;
import com.behaviourchange.backend.repository.UsageEventRecordRepository;
import com.behaviourchange.backend.security.CoachSessionService;
import com.behaviourchange.backend.security.AdminSessionService;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
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
    private final CoachSessionService participantSessions;
    private final AdminSessionService adminSessions;

    private void requireOwner(String authorization, String participantId) {
        if (!participantSessions.requireParticipant(authorization).equals(participantId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot access another participant's data");
    }

    private void requireParticipantOrAdmin(String authorization) {
        if (authorization != null && authorization.startsWith("Bearer admin.")) {
            adminSessions.requireAdmin(authorization);
        } else {
            participantSessions.requireParticipant(authorization);
        }
    }

    public CloudPersistenceController(
        ParticipantCloudDataRepository participantCloudDataRepository,
        SharedCloudDataRepository sharedCloudDataRepository,
        UsageEventRecordRepository usageEventRecordRepository,
        ParticipantRepository participantRepository,
        JsonMapper jsonMapper,
        CoachSessionService participantSessions,
        AdminSessionService adminSessions
    ) {
        this.participantCloudDataRepository = participantCloudDataRepository;
        this.sharedCloudDataRepository = sharedCloudDataRepository;
        this.usageEventRecordRepository = usageEventRecordRepository;
        this.participantRepository = participantRepository;
        this.jsonMapper = jsonMapper;
        this.participantSessions = participantSessions;
        this.adminSessions = adminSessions;
    }

    @GetMapping("/participants/{participantId}")
    public List<ParticipantDataResponse> getParticipantData(
        @PathVariable String participantId,
        @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        requireOwner(authorization, participantId);
        return participantCloudDataRepository
            .findByParticipantIdOrderByDataKeyAsc(participantId)
            .stream()
            .map(this::toParticipantDataResponse)
            .toList();
    }

    @PutMapping("/participants/{participantId}")
    public ResponseEntity<ParticipantDataResponse> upsertParticipantData(
        @PathVariable String participantId,
        @RequestBody ParticipantDataRequest request,
        @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        requireOwner(authorization, participantId);
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
        @RequestParam String key,
        @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        requireOwner(authorization, participantId);
        participantCloudDataRepository
            .findByParticipantIdAndDataKey(participantId, key)
            .ifPresent(participantCloudDataRepository::delete);

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/community")
    public List<SharedDataResponse> getCommunityRecords(
        @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        requireParticipantOrAdmin(authorization);
        return sharedCloudDataRepository
            .findAllByOrderByUpdatedAtDesc()
            .stream()
            .map(this::toSharedDataResponse)
            .toList();
    }

    @PutMapping("/community/{recordId}")
    public ResponseEntity<SharedDataResponse> upsertCommunityRecord(
        @PathVariable String recordId,
        @RequestBody SharedDataRequest request,
        @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        String author = participantSessions.requireParticipant(authorization);
        // Posts are owned by their authenticated author, not an untrusted client-supplied ID.
        Map<?, ?> post;
        try { post = jsonMapper.readValue(request.payload(), Map.class); }
        catch (Exception e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid community post"); }
        if (!author.equals(post.get("authorId")) || !recordId.equals(post.get("id")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Community post identity mismatch");
        var existing = sharedCloudDataRepository.findById(recordId);
        if (existing.isPresent()) {
            try {
                Map<?, ?> old = jsonMapper.readValue(existing.get().getPayload(), Map.class);
                if (!author.equals(old.get("authorId"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Post belongs to another participant");
            } catch (ResponseStatusException e) { throw e; }
              catch (Exception e) { throw new ResponseStatusException(HttpStatus.CONFLICT, "Existing post cannot be validated"); }
        }
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
        @PathVariable String recordId,
        @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        adminSessions.requireAdmin(authorization);
        if (sharedCloudDataRepository.existsById(recordId)) {
            sharedCloudDataRepository.deleteById(recordId);
        }

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/usage")
    public ResponseEntity<UsageEventResponse> saveUsageEvent(
        @RequestBody UsageEventRequest request,
        @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        String owner = participantSessions.requireParticipant(authorization);
        if (!owner.equals(request.userId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usage event participant mismatch");
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
            if (!owner.equals(existing.get().getParticipantId()))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Usage event ID already exists");
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
    public List<UsageEventResponse> getAllUsageEvents(
        @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        adminSessions.requireAdmin(authorization);
        return usageEventRecordRepository
            .findAllByOrderByCreatedAtAsc()
            .stream()
            .map(this::toUsageEventResponse)
            .toList();
    }

    @GetMapping("/admin/participants")
    public List<AdminParticipantResponse> getAnonymousParticipants(
        @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        adminSessions.requireAdmin(authorization);
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
    public List<AdminParticipantDataResponse> getAllParticipantData(
        @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        adminSessions.requireAdmin(authorization);
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
