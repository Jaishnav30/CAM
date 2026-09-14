package com.cams.modules.document.controller;

import com.cams.common.ApiResponse;
import com.cams.common.IpUtils;
import com.cams.modules.document.dto.DocumentResponse;
import com.cams.modules.document.model.DocumentType;
import com.cams.modules.document.service.DocumentService;
import com.cams.modules.document.service.DocumentService.DocumentFileDownload;
import com.cams.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('documents:upload')")
    public ResponseEntity<ApiResponse<DocumentResponse>> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("transactionId") UUID transactionId,
            @RequestParam("documentType") DocumentType documentType,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest servletRequest
    ) {
        String clientIp = IpUtils.getClientIp(servletRequest);
        DocumentResponse response = documentService.uploadDocument(transactionId, documentType, file, currentUser, clientIp);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Document uploaded successfully", response));
    }

    @GetMapping("/{id}/preview")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Resource> previewDocument(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        DocumentFileDownload download = documentService.loadDocumentFile(id, currentUser);
        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(download.document().getContentType());
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + download.document().getOriginalFilename() + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600")
                .header("X-Content-Type-Options", "nosniff")
                .contentLength(download.document().getFileSizeBytes())
                .body(download.resource());
    }

    @GetMapping("/{id}/download")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        DocumentFileDownload download = documentService.loadDocumentFile(id, currentUser);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + download.document().getOriginalFilename() + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "private, no-cache")
                .header("X-Content-Type-Options", "nosniff")
                .contentLength(download.document().getFileSizeBytes())
                .body(download.resource());
    }

    @GetMapping("/transaction/{transactionId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<DocumentResponse>>> getDocumentsForTransaction(
            @PathVariable UUID transactionId,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        List<DocumentResponse> response = documentService.getDocumentsForTransaction(transactionId, currentUser);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('documents:delete')")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest servletRequest
    ) {
        String clientIp = IpUtils.getClientIp(servletRequest);
        documentService.softDeleteDocument(id, currentUser, clientIp);
        return ResponseEntity.ok(ApiResponse.success("Document deleted successfully", null));
    }
}
