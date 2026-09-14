package com.cams.modules.user.dto;

import com.cams.modules.user.model.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRegistrationItemDto {

    private UUID id;
    private String username;
    private String fullName;
    private String email;
    private String avatarUrl;
    private String batch;
    private String committee;
    private String upiId;
    private String approvalStatus;
    private String rejectionReason;
    private boolean active;
    private boolean deleted;
    private Instant deletedAt;
    private Set<String> roles;
    private Instant createdAt;

    private static String extractOriginalIdentifier(String value) {
        if (value != null && value.startsWith("deleted_")) {
            int secondUnderscore = value.indexOf('_', "deleted_".length());
            if (secondUnderscore != -1 && secondUnderscore < value.length() - 1) {
                return value.substring(secondUnderscore + 1);
            }
        }
        return value;
    }

    public static UserRegistrationItemDto fromEntity(User user) {
        if (user == null) {
            return null;
        }

        Set<String> roleNames = user.getRoles() != null
                ? user.getRoles().stream().map(r -> r.getName()).collect(Collectors.toSet())
                : Set.of();

        String displayUsername = extractOriginalIdentifier(user.getUsername());
        String displayEmail = extractOriginalIdentifier(user.getEmail());

        return UserRegistrationItemDto.builder()
                .id(user.getId())
                .username(displayUsername)
                .fullName(user.getFullName())
                .email(displayEmail)
                .avatarUrl(user.getAvatarUrl())
                .batch(user.getBatch())
                .committee(user.getCommittee())
                .upiId(user.getUpiId())
                .approvalStatus(user.getApprovalStatus() != null ? user.getApprovalStatus().name() : "APPROVED")
                .rejectionReason(user.getRejectionReason())
                .active(user.isActive())
                .deleted(user.isDeleted())
                .deletedAt(user.getDeletedAt())
                .roles(roleNames)
                .createdAt(user.getCreatedAt())
                .build();
    }
}
