package com.behaviourchange.backend.service;

import com.behaviourchange.backend.dto.ParticipantProfileRequest;
import com.behaviourchange.backend.dto.ParticipantProfileResponse;
import com.behaviourchange.backend.model.Participant;
import com.behaviourchange.backend.model.ParticipantProfile;
import com.behaviourchange.backend.repository.ParticipantProfileRepository;
import com.behaviourchange.backend.repository.ParticipantRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.Set;

@Service
public class ParticipantProfileService {

    private static final Set<String> BODY_COLOURS =
            Set.of("blue", "pink", "purple", "green", "red");

    private static final Set<String> GLASSES_COLOURS =
            Set.of("none", "sky", "pink", "purple", "green", "red");

    private final ParticipantProfileRepository participantProfileRepository;
    private final ParticipantRepository participantRepository;

    public ParticipantProfileService(
            ParticipantProfileRepository participantProfileRepository,
            ParticipantRepository participantRepository) {

        this.participantProfileRepository = participantProfileRepository;
        this.participantRepository = participantRepository;
    }

    public Optional<ParticipantProfileResponse> getProfile(
            String participantId) {

        return participantProfileRepository
                .findById(participantId)
                .map(this::toResponse);
    }

    public ParticipantProfileResponse saveProfile(
            String participantId,
            ParticipantProfileRequest request) {

        Participant participant = participantRepository
                .findById(participantId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Participant account not found."
                        )
                );

        String displayName = request.getDisplayName() == null
                ? ""
                : request.getDisplayName().trim();

        if (displayName.isBlank()) {
            throw new IllegalArgumentException(
                    "Display name is required."
            );
        }

        if (displayName.length() > 100) {
            throw new IllegalArgumentException(
                    "Display name must contain 100 characters or fewer."
            );
        }

        String bodyColour = normalizeBodyColour(
                request.getBodyColour()
        );

        String glassesColour = normalizeGlassesColour(
                request.getGlassesColour()
        );

        ParticipantProfile profile = participantProfileRepository
                .findById(participantId)
                .orElseGet(() ->
                        new ParticipantProfile(
                                participant,
                                displayName,
                                bodyColour,
                                glassesColour,
                                System.currentTimeMillis()
                        )
                );

        profile.setParticipant(participant);
        profile.setDisplayName(displayName);
        profile.setBodyColour(bodyColour);
        profile.setGlassesColour(glassesColour);
        profile.setUpdatedAt(System.currentTimeMillis());

        ParticipantProfile saved =
                participantProfileRepository.save(profile);

        return toResponse(saved);
    }

    public void deleteProfile(String participantId) {
        if (participantProfileRepository.existsById(participantId)) {
            participantProfileRepository.deleteById(participantId);
        }
    }

    private String normalizeBodyColour(String bodyColour) {
        String normalized = bodyColour == null
                ? "blue"
                : bodyColour.trim().toLowerCase();

        if (!BODY_COLOURS.contains(normalized)) {
            throw new IllegalArgumentException(
                    "Invalid penguin body colour."
            );
        }

        return normalized;
    }

    private String normalizeGlassesColour(String glassesColour) {
        String normalized = glassesColour == null
                ? "none"
                : glassesColour.trim().toLowerCase();

        if (!GLASSES_COLOURS.contains(normalized)) {
            throw new IllegalArgumentException(
                    "Invalid glasses colour."
            );
        }

        return normalized;
    }

    private ParticipantProfileResponse toResponse(
            ParticipantProfile profile) {

        return new ParticipantProfileResponse(
                profile.getParticipant().getParticipantId(),
                profile.getDisplayName(),
                profile.getBodyColour(),
                profile.getGlassesColour(),
                profile.getUpdatedAt()
        );
    }
}
