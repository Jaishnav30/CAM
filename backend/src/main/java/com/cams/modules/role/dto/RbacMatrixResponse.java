package com.cams.modules.role.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RbacMatrixResponse {
    private List<PermissionItemDTO> permissions;
    private List<String> roles;
    private List<String> modules;
    private Map<String, Set<String>> rolePermissions;
}
