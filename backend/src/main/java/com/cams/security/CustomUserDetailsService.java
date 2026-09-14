package com.cams.security;

import com.cams.modules.user.model.User;
import com.cams.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        String cleanIdentifier = identifier != null ? identifier.trim() : "";
        User user = userRepository.findByEmailIgnoreCase(cleanIdentifier)
                .or(() -> userRepository.findByUsernameIgnoreCase(cleanIdentifier))
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username or email: " + identifier));

        if (!user.isActive()) {
            throw new UsernameNotFoundException("User account is disabled");
        }

        return UserPrincipal.create(user);
    }

    @Transactional(readOnly = true)
    public UserDetails loadUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with ID: " + id));

        if (!user.isActive()) {
            throw new UsernameNotFoundException("User account is disabled");
        }

        return UserPrincipal.create(user);
    }
}
