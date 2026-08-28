package com.behaviourchange.backend.service;

import com.behaviourchange.backend.dto.LoginRequest;
import com.behaviourchange.backend.model.Admin;
import com.behaviourchange.backend.repository.AdminRepository;
import com.behaviourchange.backend.dto.AdminPasswordChangeRequest;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AdminAuthService {

    private final AdminRepository adminRepository;

    private final BCryptPasswordEncoder passwordEncoder =
            new BCryptPasswordEncoder();

    public AdminAuthService(
            AdminRepository adminRepository) {

        this.adminRepository = adminRepository;
    }

    public void login(LoginRequest request) {

        String username =
                request.getUsername() == null
                        ? ""
                        : request.getUsername().trim();

        String password =
                request.getPassword() == null
                        ? ""
                        : request.getPassword();

        Admin admin =
                adminRepository
                        .findByUsernameIgnoreCase(username)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Incorrect administrator username or password."
                                )
                        );

        boolean passwordMatches =
                passwordEncoder.matches(
                        password,
                        admin.getPasswordHash()
                );

        if (!passwordMatches) {
            throw new IllegalArgumentException(
                    "Incorrect administrator username or password."
            );
        }
    }

    public void changePassword(
        AdminPasswordChangeRequest request) {

    String username =
            request.getUsername() == null
                    ? ""
                    : request.getUsername().trim();

    String currentPassword =
            request.getCurrentPassword() == null
                    ? ""
                    : request.getCurrentPassword();

    String newPassword =
            request.getNewPassword() == null
                    ? ""
                    : request.getNewPassword();

    Admin admin =
            adminRepository
                    .findByUsernameIgnoreCase(username)
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Administrator account not found."
                            )
                    );

    boolean currentPasswordMatches =
            passwordEncoder.matches(
                    currentPassword,
                    admin.getPasswordHash()
            );

    if (!currentPasswordMatches) {
        throw new IllegalArgumentException(
                "Current password is incorrect."
        );
    }

    if (newPassword.length() < 8) {
        throw new IllegalArgumentException(
                "New password must contain at least 8 characters."
        );
    }

    if (currentPassword.equals(newPassword)) {
        throw new IllegalArgumentException(
                "New password must be different from the current password."
        );
    }

    String newPasswordHash =
            passwordEncoder.encode(
                    newPassword
            );

    admin.setPasswordHash(
            newPasswordHash
    );

    adminRepository.save(admin);
}
}
