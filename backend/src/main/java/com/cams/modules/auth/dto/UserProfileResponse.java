package com.cams.modules.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private UUID id;
    private String email;
    private String fullName;
    private String phone;
    private String username;
    private String avatarUrl;
    private String batch;
    private String committee;
    private String approvalStatus;
    private boolean active;
    private Set<String> roles;
    private Set<String> permissions;
}
