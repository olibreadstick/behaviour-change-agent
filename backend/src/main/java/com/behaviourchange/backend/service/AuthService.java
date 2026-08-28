package com.behaviourchange.backend.service;

import com.behaviourchange.backend.dto.AuthResponse;
import com.behaviourchange.backend.dto.LoginRequest;
import com.behaviourchange.backend.dto.SignupRequest;
import com.behaviourchange.backend.model.Participant;
import com.behaviourchange.backend.repository.ParticipantRepository;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final ParticipantRepository participantRepository;
    private final BCryptPasswordEncoder passwordEncoder =
            new BCryptPasswordEncoder();

    public AuthService(
            ParticipantRepository participantRepository) {
        this.participantRepository = participantRepository;
    }

    public AuthResponse signup(SignupRequest request) {

        String username =
                request.getUsername() == null
                        ? ""
                        : request.getUsername().trim();

        String password =
                request.getPassword() == null
                        ? ""
                        : request.getPassword();

        if (username.isBlank()) {
            throw new IllegalArgumentException(
                    "Username is required."
            );
        }

        if (password.length() < 6) {
            throw new IllegalArgumentException(
                    "Password must contain at least 6 characters."
            );
        }

        if (participantRepository
                .findByUsernameIgnoreCase(username)
                .isPresent()) {

            throw new IllegalArgumentException(
                    "That username is already in use."
            );
        }

        String participantId =
                generateParticipantId();

        String passwordHash =
                passwordEncoder.encode(password);

        Participant participant =
                new Participant(
                        participantId,
                        username,
                        passwordHash,
                        System.currentTimeMillis()
                );

        participantRepository.save(participant);

        return new AuthResponse(participantId);
    }

    public AuthResponse login(LoginRequest request) {

        String username =
                request.getUsername() == null
                        ? ""
                        : request.getUsername().trim();

        String password =
                request.getPassword() == null
                        ? ""
                        : request.getPassword();

        Participant participant =
                participantRepository
                        .findByUsernameIgnoreCase(username)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Incorrect username or password."
                                )
                        );

        boolean passwordMatches =
                passwordEncoder.matches(
                        password,
                        participant.getPasswordHash()
                );

        if (!passwordMatches) {
            throw new IllegalArgumentException(
                    "Incorrect username or password."
            );
        }

        return new AuthResponse(
                participant.getParticipantId()
        );
    }

    private String generateParticipantId() {

        int highestNumber = 0;

        for (Participant participant :
                participantRepository.findAll()) {

            String id =
                    participant.getParticipantId();

            if (
                    id != null &&
                    id.matches("P-\\d+")
            ) {
                int number =
                        Integer.parseInt(
                                id.substring(2)
                        );

                highestNumber =
                        Math.max(
                                highestNumber,
                                number
                        );
            }
        }

        return String.format(
                "P-%04d",
                highestNumber + 1
        );
    }
}
