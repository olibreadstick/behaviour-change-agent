package com.behaviourchange.backend.controller;

import com.behaviourchange.backend.dto.AdminPasswordChangeRequest;
import com.behaviourchange.backend.dto.LoginRequest;
import com.behaviourchange.backend.service.AdminAuthService;
import com.behaviourchange.backend.security.AdminSessionService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth/admin")
public class AdminAuthController {

    private final AdminAuthService adminAuthService;
    private final AdminSessionService adminSessions;

    public AdminAuthController(
            AdminAuthService adminAuthService, AdminSessionService adminSessions) {

        this.adminAuthService = adminAuthService;
        this.adminSessions = adminSessions;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequest request) {

        try {
            adminAuthService.login(request);

            return ResponseEntity.ok(
                    Map.of(
                            "role",
                            "admin",
                            "sessionToken", adminSessions.issue(request.getUsername().trim())
                    )
            );

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

    @PostMapping("/change-password")
public ResponseEntity<?> changePassword(
        @RequestBody AdminPasswordChangeRequest request,
        @RequestHeader(value = "Authorization", required = false) String authorization) {
    adminSessions.requireAdmin(authorization);

    try {

        adminAuthService.changePassword(
                request
        );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Password changed successfully."
                )
        );

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
