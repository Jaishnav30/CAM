package com.cams.modules.category.controller;

import com.cams.common.ApiResponse;
import com.cams.common.IpUtils;
import com.cams.modules.category.dto.BulkDeleteCategoryRequest;
import com.cams.modules.category.dto.BulkDeleteCategoryResponse;
import com.cams.modules.category.dto.CategoryResponse;
import com.cams.modules.category.dto.CreateCategoryRequest;
import com.cams.modules.category.dto.UpdateCategoryRequest;
import com.cams.modules.category.service.CategoryService;
import com.cams.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/categories")
@PreAuthorize("hasAuthority('categories:manage')")
@RequiredArgsConstructor
public class AdminCategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getAllCategories() {
        List<CategoryResponse> categories = categoryService.getAllCategories();
        return ResponseEntity.ok(ApiResponse.success(categories));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(
            @Valid @RequestBody CreateCategoryRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest servletRequest
    ) {
        String clientIp = IpUtils.getClientIp(servletRequest);
        CategoryResponse response = categoryService.createCategory(request, currentUser, clientIp);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Category created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> updateCategory(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCategoryRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest servletRequest
    ) {
        String clientIp = IpUtils.getClientIp(servletRequest);
        CategoryResponse response = categoryService.updateCategory(id, request, currentUser, clientIp);
        return ResponseEntity.ok(ApiResponse.success("Category updated successfully", response));
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<ApiResponse<CategoryResponse>> deactivateCategory(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest servletRequest
    ) {
        String clientIp = IpUtils.getClientIp(servletRequest);
        CategoryResponse response = categoryService.deactivateCategory(id, currentUser, clientIp);
        return ResponseEntity.ok(ApiResponse.success("Category deactivated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest servletRequest
    ) {
        String clientIp = IpUtils.getClientIp(servletRequest);
        categoryService.deleteCategory(id, currentUser, clientIp);
        return ResponseEntity.ok(ApiResponse.success("Category deleted successfully", null));
    }

    @PostMapping("/bulk-delete")
    public ResponseEntity<ApiResponse<BulkDeleteCategoryResponse>> bulkDeleteCategories(
            @Valid @RequestBody BulkDeleteCategoryRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest servletRequest
    ) {
        String clientIp = IpUtils.getClientIp(servletRequest);
        BulkDeleteCategoryResponse response = categoryService.bulkDeleteCategories(request.getIds(), currentUser, clientIp);
        String message = String.format("Bulk deletion complete: %d deleted, %d failed", response.getDeletedCount(), response.getFailedCount());
        return ResponseEntity.ok(ApiResponse.success(message, response));
    }
}
