package com.cams.modules.category.service;

import com.cams.exception.ConflictException;
import com.cams.exception.DuplicateResourceException;
import com.cams.exception.ResourceNotFoundException;
import com.cams.modules.audit.service.AuditLogService;
import com.cams.modules.category.dto.CategoryResponse;
import com.cams.modules.category.dto.CreateCategoryRequest;
import com.cams.modules.category.dto.UpdateCategoryRequest;
import com.cams.modules.category.model.Category;
import com.cams.modules.category.repository.CategoryRepository;
import com.cams.modules.transaction.repository.TransactionRepository;
import com.cams.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<CategoryResponse> getActiveCategories() {
        return categoryRepository.findByIsActiveTrueOrderByNameAsc()
                .stream()
                .map(CategoryResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAllByOrderByNameAsc()
                .stream()
                .map(CategoryResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Category getCategoryEntity(UUID id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));
    }

    @Transactional
    public CategoryResponse createCategory(CreateCategoryRequest request, UserPrincipal currentUser, String clientIp) {
        String trimmedName = request.getName().trim();
        if (categoryRepository.existsByNameIgnoreCase(trimmedName)) {
            throw new DuplicateResourceException("Category already exists with name: " + trimmedName);
        }

        Category category = Category.builder()
                .name(trimmedName)
                .type(request.getType())
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .isActive(true)
                .build();

        Category saved = categoryRepository.save(category);
        log.info("Category '{}' created by user '{}'", saved.getName(), currentUser != null ? currentUser.getUsername() : "SYSTEM");

        auditLogService.recordAudit(
                "CATEGORY",
                saved.getId(),
                "CREATE",
                currentUser != null ? currentUser.getId() : null,
                clientIp,
                null,
                CategoryResponse.fromEntity(saved),
                "Category created: " + saved.getName()
        );

        return CategoryResponse.fromEntity(saved);
    }

    @Transactional
    public CategoryResponse updateCategory(UUID id, UpdateCategoryRequest request, UserPrincipal currentUser, String clientIp) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));

        String trimmedName = request.getName().trim();
        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(trimmedName, id)) {
            throw new DuplicateResourceException("Another category already exists with name: " + trimmedName);
        }

        CategoryResponse oldState = CategoryResponse.fromEntity(category);

        category.setName(trimmedName);
        category.setType(request.getType());
        category.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
        if (request.getIsActive() != null) {
            category.setActive(request.getIsActive());
        }

        Category updated = categoryRepository.save(category);
        log.info("Category '{}' updated by user '{}'", updated.getName(), currentUser != null ? currentUser.getUsername() : "SYSTEM");

        auditLogService.recordAudit(
                "CATEGORY",
                updated.getId(),
                "UPDATE",
                currentUser != null ? currentUser.getId() : null,
                clientIp,
                oldState,
                CategoryResponse.fromEntity(updated),
                "Category updated: " + updated.getName()
        );

        return CategoryResponse.fromEntity(updated);
    }

    @Transactional
    public CategoryResponse deactivateCategory(UUID id, UserPrincipal currentUser, String clientIp) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));

        CategoryResponse oldState = CategoryResponse.fromEntity(category);
        category.setActive(false);

        Category updated = categoryRepository.save(category);
        log.info("Category '{}' deactivated by user '{}'", updated.getName(), currentUser != null ? currentUser.getUsername() : "SYSTEM");

        auditLogService.recordAudit(
                "CATEGORY",
                updated.getId(),
                "STATUS_CHANGE",
                currentUser != null ? currentUser.getId() : null,
                clientIp,
                oldState,
                CategoryResponse.fromEntity(updated),
                "Category deactivated: " + updated.getName()
        );

        return CategoryResponse.fromEntity(updated);
    }

    @Transactional
    public void deleteCategory(UUID id, UserPrincipal currentUser, String clientIp) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));

        if (transactionRepository.existsByCategoryId(id)) {
            throw new ConflictException("Cannot delete category: existing transactions reference this category. Deactivate it instead.");
        }

        CategoryResponse oldState = CategoryResponse.fromEntity(category);
        categoryRepository.delete(category);
        log.info("Category '{}' [{}] deleted by user '{}'", category.getName(), id, currentUser != null ? currentUser.getUsername() : "SYSTEM");

        auditLogService.recordAudit(
                "CATEGORY",
                id,
                "STATUS_CHANGE",
                currentUser != null ? currentUser.getId() : null,
                clientIp,
                oldState,
                null,
                "Category deleted: " + category.getName()
        );
    }

    @Transactional
    public com.cams.modules.category.dto.BulkDeleteCategoryResponse bulkDeleteCategories(
            List<UUID> ids,
            UserPrincipal currentUser,
            String clientIp
    ) {
        if (ids == null || ids.isEmpty()) {
            return com.cams.modules.category.dto.BulkDeleteCategoryResponse.builder()
                    .deletedCount(0)
                    .deletedIds(java.util.Collections.emptyList())
                    .deletedNames(java.util.Collections.emptyList())
                    .failedCount(0)
                    .failedReasons(java.util.Collections.emptyList())
                    .build();
        }

        java.util.List<UUID> deletedIds = new java.util.ArrayList<>();
        java.util.List<String> deletedNames = new java.util.ArrayList<>();
        java.util.List<String> failedReasons = new java.util.ArrayList<>();

        for (UUID id : ids) {
            java.util.Optional<Category> opt = categoryRepository.findById(id);
            if (opt.isEmpty()) {
                failedReasons.add("Category not found with ID: " + id);
                continue;
            }

            Category category = opt.get();
            if (transactionRepository.existsByCategoryId(id)) {
                failedReasons.add("Cannot delete category '" + category.getName() + "': existing transactions reference this category. Deactivate it instead.");
                continue;
            }

            CategoryResponse oldState = CategoryResponse.fromEntity(category);
            categoryRepository.delete(category);
            deletedIds.add(id);
            deletedNames.add(category.getName());

            log.info("Category '{}' [{}] deleted via bulk action by user '{}'",
                    category.getName(), id, currentUser != null ? currentUser.getUsername() : "SYSTEM");

            auditLogService.recordAudit(
                    "CATEGORY",
                    id,
                    "STATUS_CHANGE",
                    currentUser != null ? currentUser.getId() : null,
                    clientIp,
                    oldState,
                    null,
                    "Category bulk deleted: " + category.getName()
            );
        }

        return com.cams.modules.category.dto.BulkDeleteCategoryResponse.builder()
                .deletedCount(deletedIds.size())
                .deletedIds(deletedIds)
                .deletedNames(deletedNames)
                .failedCount(failedReasons.size())
                .failedReasons(failedReasons)
                .build();
    }
}
