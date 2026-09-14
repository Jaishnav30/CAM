package com.cams.modules.role.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateRbacMatrixRequest {

    @NotNull(message = "rolePermissions map must not be null")
    private Map<String, Set<String>> rolePermissions;
}
