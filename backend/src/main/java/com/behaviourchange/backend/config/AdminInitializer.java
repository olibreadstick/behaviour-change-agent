package com.behaviourchange.backend.config;

import com.behaviourchange.backend.model.Admin;
import com.behaviourchange.backend.repository.AdminRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminInitializer {

    private final AdminRepository adminRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Value("${ADMIN_USERNAME:admin}")
    private String adminUsername;

    @Value("${ADMIN_PASSWORD:}")
    private String adminPassword;

    public AdminInitializer(AdminRepository adminRepository) {
        this.adminRepository = adminRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void initializeAdminAfterStartup() {
        // Vercel requires the HTTP server to begin accepting connections quickly.
        // Do not block Spring startup on the first Neon/JPA query.
        Thread initializerThread = new Thread(() -> {
            try {
                if (adminPassword == null || adminPassword.isBlank()) {
                    System.out.println(
                            "ADMIN_PASSWORD is not set; skipping administrator initialization."
                    );
                    return;
                }

                boolean adminExists = adminRepository
                        .findByUsernameIgnoreCase(adminUsername.trim())
                        .isPresent();

                if (!adminExists) {
                    Admin admin = new Admin(
                            adminUsername.trim(),
                            passwordEncoder.encode(adminPassword)
                    );

                    adminRepository.save(admin);
                    System.out.println("Administrator account initialized.");
                }
            } catch (Exception exception) {
                // A temporary database wake-up/connectivity delay must not terminate
                // the web server. Login can be retried after the database is ready.
                System.err.println(
                        "Administrator initialization was deferred: "
                                + exception.getMessage()
                );
            }
        }, "admin-initializer");

        initializerThread.setDaemon(true);
        initializerThread.start();
    }
}
