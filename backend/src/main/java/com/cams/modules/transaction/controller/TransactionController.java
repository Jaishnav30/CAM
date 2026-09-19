package com.cams.modules.transaction.controller;

import com.cams.common.ApiResponse;
import com.cams.common.IpUtils;
import com.cams.common.PagedResponse;
import com.cams.modules.transaction.dto.*;
import com.cams.modules.transaction.service.TransactionService;
import com.cams.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('transactions:create', 'transactions:create_own')")
    public ResponseEntity<ApiResponse<TransactionResponse>> createTransaction(
            @Valid @RequestBody CreateTransactionRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest servletRequest
    ) {
        String clientIp = IpUtils.getClientIp(servletRequest);
        TransactionResponse response = transactionService.createTransaction(request, currentUser, clientIp);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Transaction created successfully", response));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('transactions:read', 'transactions:create_own')")
    public ResponseEntity<ApiResponse<PagedResponse<TransactionResponse>>> getTransactions(
            TransactionFilterParams filterParams,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        PagedResponse<TransactionResponse> response = transactionService.getTransactions(filterParams, pageable, currentUser);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/suggestions")
    @PreAuthorize("hasAnyAuthority('transactions:read', 'transactions:create', 'transactions:create_own')")
    public ResponseEntity<ApiResponse<TransactionSuggestionsResponse>> getSuggestions() {
        TransactionSuggestionsResponse response = transactionService.getSuggestions();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('transactions:read', 'transactions:create_own')")
    public ResponseEntity<ApiResponse<TransactionResponse>> getTransactionById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        TransactionResponse response = transactionService.getTransactionById(id, currentUser);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('transactions:update', 'transactions:create_own')")
    public ResponseEntity<ApiResponse<TransactionResponse>> updateTransaction(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTransactionRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest servletRequest
    ) {
        String clientIp = IpUtils.getClientIp(servletRequest);
        TransactionResponse response = transactionService.updateTransaction(id, request, currentUser, clientIp);
        return ResponseEntity.ok(ApiResponse.success("Transaction updated successfully", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('transactions:archive')")
    public ResponseEntity<ApiResponse<TransactionResponse>> archiveTransaction(
            @PathVariable UUID id,
            @Valid @RequestBody ArchiveTransactionRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest servletRequest
    ) {
        String clientIp = IpUtils.getClientIp(servletRequest);
        TransactionResponse response = transactionService.archiveTransaction(id, request, currentUser, clientIp);
        return ResponseEntity.ok(ApiResponse.success("Transaction archived successfully", response));
    }
}
