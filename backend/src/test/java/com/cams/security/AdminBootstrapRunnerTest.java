package com.cams.security;

import com.cams.config.AdminBootstrapRunner;
import com.cams.modules.role.model.Role;
import com.cams.modules.role.repository.RoleRepository;
import com.cams.modules.user.model.User;
import com.cams.modules.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminBootstrapRunnerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    private PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);

    private AdminBootstrapRunner bootstrapRunner;

    @BeforeEach
    void setUp() {
        bootstrapRunner = new AdminBootstrapRunner(userRepository, roleRepository, passwordEncoder);
    }

    @Test
    @DisplayName("Should skip bootstrap if active ADMIN user already exists")
    void shouldSkipBootstrapIfAdminExists() {
        when(userRepository.existsActiveAdminUser("ADMIN")).thenReturn(true);

        bootstrapRunner.run(new DefaultApplicationArguments());

        verify(userRepository, times(1)).existsActiveAdminUser("ADMIN");
        verify(userRepository, never()).save(any());
        verify(roleRepository, never()).findByName(anyString());
    }

    @Test
    @DisplayName("Should fail startup with IllegalStateException if no ADMIN exists and password is empty")
    void shouldThrowExceptionWhenAdminPasswordMissing() {
        when(userRepository.existsActiveAdminUser("ADMIN")).thenReturn(false);
        ReflectionTestUtils.setField(bootstrapRunner, "adminPassword", "");

        assertThatThrownBy(() -> bootstrapRunner.run(new DefaultApplicationArguments()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("FATAL SECURITY ERROR")
                .hasMessageContaining("CAMS_ADMIN_PASSWORD environment variable is not configured");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should fail startup if password is null and no ADMIN exists")
    void shouldThrowExceptionWhenAdminPasswordNull() {
        when(userRepository.existsActiveAdminUser("ADMIN")).thenReturn(false);
        ReflectionTestUtils.setField(bootstrapRunner, "adminPassword", null);

        assertThatThrownBy(() -> bootstrapRunner.run(new DefaultApplicationArguments()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("FATAL SECURITY ERROR");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should successfully bootstrap ADMIN user with BCrypt hashed password and ADMIN role")
    void shouldBootstrapAdminSuccessfully() {
        when(userRepository.existsActiveAdminUser("ADMIN")).thenReturn(false);
        ReflectionTestUtils.setField(bootstrapRunner, "adminEmail", "admin@cams.local");
        ReflectionTestUtils.setField(bootstrapRunner, "adminPassword", "SuperSecurePassword123!");

        Role adminRole = Role.builder()
                .id(UUID.randomUUID())
                .name("ADMIN")
                .description("System Administrator")
                .build();
        when(roleRepository.findByName("ADMIN")).thenReturn(Optional.of(adminRole));

        bootstrapRunner.run(new DefaultApplicationArguments());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());

        User savedUser = userCaptor.getValue();
        assertThat(savedUser.getEmail()).isEqualTo("admin@cams.local");
        assertThat(savedUser.getFullName()).isEqualTo("System Administrator");
        assertThat(savedUser.isActive()).isTrue();
        assertThat(savedUser.getRoles()).contains(adminRole);

        // Verify password is BCrypt hashed with cost factor 12
        assertThat(savedUser.getPasswordHash()).isNotEqualTo("SuperSecurePassword123!");
        assertThat(savedUser.getPasswordHash()).startsWith("$2a$12$");
        assertThat(passwordEncoder.matches("SuperSecurePassword123!", savedUser.getPasswordHash())).isTrue();
    }
}
