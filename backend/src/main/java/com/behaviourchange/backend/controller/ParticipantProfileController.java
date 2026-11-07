package com.behaviourchange.backend.controller;

import com.behaviourchange.backend.dto.ParticipantProfileRequest;
import com.behaviourchange.backend.dto.ParticipantProfileResponse;
import com.behaviourchange.backend.service.ParticipantProfileService;
import com.behaviourchange.backend.security.CoachSessionService;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/participant-profiles")
public class ParticipantProfileController {

    private final ParticipantProfileService participantProfileService;
    private final CoachSessionService sessions;
    private void requireOwner(String header, String id) {
        if (!sessions.requireParticipant(header).equals(id))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot access another participant's profile");
    }

    public ParticipantProfileController(
            ParticipantProfileService participantProfileService, CoachSessionService sessions) {

        this.participantProfileService = participantProfileService;
        this.sessions = sessions;
    }

    @GetMapping("/{participantId}")
    public ResponseEntity<?> getProfile(
            @PathVariable String participantId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        requireOwner(authorization, participantId);

        var profile =
                participantProfileService.getProfile(
                        participantId
                );

        if (profile.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(profile.get());
    }

    @PutMapping("/{participantId}")
    public ResponseEntity<?> saveProfile(
            @PathVariable String participantId,
            @RequestBody ParticipantProfileRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        requireOwner(authorization, participantId);

        try {
            ParticipantProfileResponse response =
                    participantProfileService.saveProfile(
                            participantId,
                            request
                    );

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "error",
                            exception.getMessage()
                    ));
        }
    }

    @DeleteMapping("/{participantId}")
    public ResponseEntity<Void> deleteProfile(
            @PathVariable String participantId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        requireOwner(authorization, participantId);

        participantProfileService.deleteProfile(participantId);
        return ResponseEntity.noContent().build();
    }
}
