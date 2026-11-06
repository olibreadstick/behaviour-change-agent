package com.behaviourchange.backend.controller;

import com.behaviourchange.backend.dto.AuthResponse;
import com.behaviourchange.backend.dto.LoginRequest;
import com.behaviourchange.backend.dto.SignupRequest;
import com.behaviourchange.backend.service.AuthService;
import com.behaviourchange.backend.security.CoachSessionService;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth/participant")
public class AuthController {

    private final AuthService authService;
    private final CoachSessionService coachSessions;
    private final ObjectMapper mapper;

    public AuthController(AuthService authService, CoachSessionService coachSessions, ObjectMapper mapper) {
        this.authService = authService;
        this.coachSessions = coachSessions;
        this.mapper = mapper;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(
            @RequestBody SignupRequest request) {

        try {
            AuthResponse response =
                    authService.signup(request);

            // Preserve the existing AuthResponse JSON shape without assuming DTO accessor names.
            String id = mapper.valueToTree(response).path("participantId").asText("");
            if (id.isBlank()) throw new IllegalStateException("Missing participant ID in authentication response");
            return ResponseEntity.ok(Map.of("participantId", id, "sessionToken", coachSessions.issue(id)));

        } catch (IllegalArgumentException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            Map.of(
                                    "error",
                                    exception.getMessage()
                            )
                    );
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequest request) {

        try {
            AuthResponse response =
                    authService.login(request);

            // Preserve the existing AuthResponse JSON shape without assuming DTO accessor names.
            String id = mapper.valueToTree(response).path("participantId").asText("");
            if (id.isBlank()) throw new IllegalStateException("Missing participant ID in authentication response");
            return ResponseEntity.ok(Map.of("participantId", id, "sessionToken", coachSessions.issue(id)));

        } catch (IllegalArgumentException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            Map.of(
                                    "error",
                                    exception.getMessage()
                            )
                    );
        }
    }
}
