package com.cams.modules.role.service;

import com.cams.modules.audit.service.AuditLogService;
import com.cams.modules.permission.model.Permission;
import com.cams.modules.permission.repository.PermissionRepository;
import com.cams.modules.role.dto.PermissionItemDTO;
import com.cams.modules.role.dto.RbacMatrixResponse;
import com.cams.modules.role.dto.UpdateRbacMatrixRequest;
import com.cams.modules.role.model.Role;
import com.cams.modules.role.repository.RoleRepository;
import com.cams.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RbacService {

    public static final List<String> CONFIGURABLE_ROLES = List.of("ACCOUNTANT", "MEMBER");
    public static final List<String> MODULE_ORDER = List.of(
            "TRANSACTION",
            "REIMBURSEMENT",
            "DOCUMENT",
            "CATEGORY",
            "PAYMENT_MODE",
            "REPORT",
            "ANALYTICS",
            "AUDIT",
            "USER"
    );

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public RbacMatrixResponse getRbacMatrix() {
        List<Permission> allPermissions = permissionRepository.findAllByOrderByModuleAscCodeAsc();

        List<PermissionItemDTO> permissionDTOs = allPermissions.stream()
                .map(p -> PermissionItemDTO.builder()
                        .code(p.getCode())
                        .module(p.getModule())
                        .description(p.getDescription())
                        .build())
                .collect(Collectors.toList());

        // Extract ordered distinct modules
        Set<String> presentModules = allPermissions.stream()
                .map(Permission::getModule)
                .collect(Collectors.toSet());

        List<String> orderedModules = new ArrayList<>();
        for (String m : MODULE_ORDER) {
            if (presentModules.contains(m)) {
                orderedModules.add(m);
            }
        }
        for (String m : presentModules) {
            if (!orderedModules.contains(m)) {
                orderedModules.add(m);
            }
        }

        Map<String, Set<String>> rolePermissionsMap = new LinkedHashMap<>();
        for (String roleName : CONFIGURABLE_ROLES) {
            Optional<Role> roleOpt = roleRepository.findByName(roleName);
            if (roleOpt.isPresent()) {
                Set<String> codes = roleOpt.get().getPermissions().stream()
                        .map(Permission::getCode)
                        .collect(Collectors.toCollection(TreeSet::new));
                rolePermissionsMap.put(roleName, codes);
            } else {
                rolePermissionsMap.put(roleName, Collections.emptySet());
            }
        }

        return RbacMatrixResponse.builder()
                .permissions(permissionDTOs)
                .roles(CONFIGURABLE_ROLES)
                .modules(orderedModules)
                .rolePermissions(rolePermissionsMap)
                .build();
    }

    @Transactional
    public RbacMatrixResponse updateRbacMatrix(
            UpdateRbacMatrixRequest request,
            UserPrincipal currentUser,
            String clientIp
    ) {
        if (request == null || request.getRolePermissions() == null) {
            throw new IllegalArgumentException("Request body and rolePermissions must not be null");
        }

        Map<String, Set<String>> oldState = new LinkedHashMap<>();
        Map<String, Set<String>> newState = new LinkedHashMap<>();

        for (String roleName : CONFIGURABLE_ROLES) {
            Role role = roleRepository.findByName(roleName)
                    .orElseThrow(() -> new IllegalStateException("Role not found in database: " + roleName));

            Set<String> previousCodes = role.getPermissions().stream()
                    .map(Permission::getCode)
                    .collect(Collectors.toCollection(TreeSet::new));
            oldState.put(roleName, previousCodes);

            // If new permissions provided for this role
            if (request.getRolePermissions().containsKey(roleName)) {
                Set<String> targetCodes = request.getRolePermissions().get(roleName);
                if (targetCodes == null || targetCodes.isEmpty()) {
                    role.setPermissions(new HashSet<>());
                } else {
                    List<Permission> matchedPermissions = permissionRepository.findByCodeIn(targetCodes);
                    role.setPermissions(new HashSet<>(matchedPermissions));
                }

                Role updatedRole = roleRepository.save(role);
                Set<String> updatedCodes = updatedRole.getPermissions().stream()
                        .map(Permission::getCode)
                        .collect(Collectors.toCollection(TreeSet::new));
                newState.put(roleName, updatedCodes);

                log.info("Role '{}' permissions updated by admin '{}'. Total granted: {}",
                        roleName,
                        currentUser != null ? currentUser.getUsername() : "SYSTEM",
                        updatedCodes.size());
            } else {
                newState.put(roleName, previousCodes);
            }
        }

        // Record synchronous audit logs for updated roles
        for (String roleName : CONFIGURABLE_ROLES) {
            if (request.getRolePermissions().containsKey(roleName)) {
                Role role = roleRepository.findByName(roleName).orElse(null);
                if (role != null) {
                    auditLogService.recordAudit(
                            "ROLE",
                            role.getId(),
                            "UPDATE",
                            currentUser != null ? currentUser.getId() : null,
                            clientIp,
                            oldState.get(roleName),
                            newState.get(roleName),
                            "System administrator updated permissions for role: " + roleName
                    );
                }
            }
        }

        return getRbacMatrix();
    }
}
