package com.behaviourchange.backend.controller;

import com.behaviourchange.backend.dto.ParticipantResponse;
import com.behaviourchange.backend.model.Participant;
import com.behaviourchange.backend.service.ParticipantService;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/participants")
public class ParticipantController {

    private final ParticipantService participantService;

    public ParticipantController(
            ParticipantService participantService) {

        this.participantService = participantService;
    }

    @GetMapping
    public List<ParticipantResponse> getParticipants() {

        return participantService
                .getAllParticipants()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/{participantId}")
    public ParticipantResponse getParticipant(
            @PathVariable String participantId) {

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