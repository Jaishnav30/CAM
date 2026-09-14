package com.cams.config;

import com.cams.modules.role.model.Role;
import com.cams.modules.role.repository.RoleRepository;
import com.cams.modules.user.model.User;
import com.cams.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class AdminBootstrapRunner implements ApplicationRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.security.admin.email:admin@cams.local}")
    private String adminEmail;

    @Value("${app.security.admin.password:}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.existsActiveAdminUser("ADMIN")) {
            log.info("[SECURITY] Active administrator user verified in database.");
            return;
        }

        if (adminPassword == null || adminPassword.trim().isEmpty()) {
            throw new IllegalStateException(
                "FATAL SECURITY ERROR: No active administrator account exists in database and " +
                "CAMS_ADMIN_PASSWORD environment variable is not configured. " +
                "Application startup aborted to prevent insecure credentials."
            );
        }

        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseThrow(() -> new IllegalStateException("FATAL: Role 'ADMIN' not found in database. Check Flyway migrations."));

        String cleanEmail = (adminEmail == null || adminEmail.isBlank()) ? "admin@cams.local" : adminEmail.trim().toLowerCase();

        User adminUser = User.builder()
                .email(cleanEmail)
                .passwordHash(passwordEncoder.encode(adminPassword.trim()))
                .fullName("System Administrator")
                .isActive(true)
                .roles(Set.of(adminRole))
                .build();

        userRepository.save(adminUser);
        log.info("[SECURITY] Initial administrator account provisioned for: {}", cleanEmail);
    }
}
