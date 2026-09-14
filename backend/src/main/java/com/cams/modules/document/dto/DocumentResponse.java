package com.cams.modules.document.dto;

import com.cams.modules.document.model.Document;
import com.cams.modules.document.model.DocumentType;
import com.cams.modules.user.dto.UserSummaryResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentResponse {

    private UUID id;
    private UUID transactionId;
    private DocumentType documentType;
    private String originalFilename;
    private String contentType;
    private Long fileSizeBytes;
    private String fileHashSha256;
    private UserSummaryResponse uploadedBy;
    private Instant createdAt;

    public static DocumentResponse fromEntity(Document doc) {
        if (doc == null) {
            return null;
        }
        return DocumentResponse.builder()
                .id(doc.getId())
                .transactionId(doc.getTransaction() != null ? doc.getTransaction().getId() : null)
                .documentType(doc.getDocumentType())
                .originalFilename(doc.getOriginalFilename())
                .contentType(doc.getContentType())
                .fileSizeBytes(doc.getFileSizeBytes())
                .fileHashSha256(doc.getFileHashSha256())
                .uploadedBy(doc.getUploadedBy() != null ? UserSummaryResponse.fromEntity(doc.getUploadedBy()) : null)
                .createdAt(doc.getCreatedAt())
                .build();
    }
}
