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
public class UserSummaryDto {
    private UUID id;
    private String email;
    private String fullName;
    private String username;
    private String avatarUrl;
    private String batch;
    private String committee;
    private Set<String> roles;
}
