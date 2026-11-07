package com.behaviourchange.backend.controller;

import com.behaviourchange.backend.dto.ParticipantResponse;
import com.behaviourchange.backend.model.Participant;
import com.behaviourchange.backend.service.ParticipantService;
import com.behaviourchange.backend.security.CoachSessionService;
import com.behaviourchange.backend.security.AdminSessionService;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/participants")
public class ParticipantController {

    private final ParticipantService participantService;
    private final CoachSessionService participantSessions;
    private final AdminSessionService adminSessions;

    public ParticipantController(
            ParticipantService participantService, CoachSessionService participantSessions, AdminSessionService adminSessions) {

        this.participantService = participantService;
        this.participantSessions = participantSessions;
        this.adminSessions = adminSessions;
    }

    @GetMapping
    public List<ParticipantResponse> getParticipants(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        adminSessions.requireAdmin(authorization);

        return participantService
                .getAllParticipants()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/{participantId}")
    public ParticipantResponse getParticipant(
            @PathVariable String participantId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        if (authorization != null && authorization.startsWith("Bearer admin.")) {
            adminSessions.requireAdmin(authorization);
        } else if (!participantId.equals(participantSessions.requireParticipant(authorization))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot access another participant");
        }

        Participant participant =
                participantService
                        .getParticipantById(participantId);

        if (participant == null) {
            return null;
        }

        return toResponse(participant);
    }

    private ParticipantResponse toResponse(
            Participant participant) {

        return new ParticipantResponse(
                participant.getParticipantId(),
                participant.getCreatedAt()
        );
    }
}