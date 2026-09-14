package com.cams.security;

import com.cams.modules.user.model.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.*;
import java.util.stream.Collectors;

@Getter
@AllArgsConstructor
@Builder
public class UserPrincipal implements UserDetails {

    private final UUID id;
    private final String email;
    private final String password;
    private final String fullName;
    private final String phone;
    private final String profileUsername;
    private final String avatarUrl;
    private final String batch;
    private final String committee;
    private final String approvalStatus;
    private final boolean active;
    private final Collection<? extends GrantedAuthority> authorities;
    private final Set<String> roles;
    private final Set<String> permissions;

    public static UserPrincipal create(User user) {
        Set<String> roleNames = new HashSet<>();
        Set<String> permissionCodes = new HashSet<>();
        Set<GrantedAuthority> grantedAuthorities = new HashSet<>();

        if (user.getRoles() != null) {
            for (var role : user.getRoles()) {
                roleNames.add(role.getName());
                grantedAuthorities.add(new SimpleGrantedAuthority("ROLE_" + role.getName()));

                if (role.getPermissions() != null) {
                    for (var perm : role.getPermissions()) {
                        permissionCodes.add(perm.getCode());
                        grantedAuthorities.add(new SimpleGrantedAuthority(perm.getCode()));
                    }
                }
            }
        }

        return UserPrincipal.builder()
                .id(user.getId())
                .email(user.getEmail())
                .password(user.getPasswordHash())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .profileUsername(user.getUsername() != null ? user.getUsername() : user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .batch(user.getBatch())
                .committee(user.getCommittee())
                .approvalStatus(user.getApprovalStatus() != null ? user.getApprovalStatus().name() : "APPROVED")
                .active(user.isActive())
                .authorities(grantedAuthorities)
                .roles(roleNames)
                .permissions(permissionCodes)
                .build();
    }

    public boolean hasAuthority(String authority) {
        return authorities.stream().anyMatch(a -> a.getAuthority().equalsIgnoreCase(authority));
    }

    public boolean hasRole(String role) {
        if (roles == null) return false;
        return roles.stream().anyMatch(r -> r.equalsIgnoreCase(role));
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
