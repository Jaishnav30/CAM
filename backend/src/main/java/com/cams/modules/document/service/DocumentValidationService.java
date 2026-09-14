package com.cams.modules.document.service;

import com.cams.config.StorageProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentValidationService {

    private final StorageProperties storageProperties;
    private final Tika tika = new Tika();

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "application/pdf",
            "image/jpeg",
            "image/png"
    );

    private static final Map<String, Set<String>> MIME_TO_EXTENSIONS = Map.of(
            "application/pdf", Set.of("pdf"),
            "image/jpeg", Set.of("jpg", "jpeg"),
            "image/png", Set.of("png")
    );

    public record ValidatedFileMetadata(
            String detectedContentType,
            String normalizedExtension,
            String sanitizedOriginalFilename
    ) {}

    public void validateSize(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File must not be empty");
        }
        if (file.getSize() > storageProperties.getMaxFileSizeBytes()) {
            throw new IllegalArgumentException("File size exceeds the maximum permitted limit of 10 MB");
        }
    }

    public ValidatedFileMetadata validateContentAndType(Path filePath, String originalFilename, String declaredContentType) {
        // 1. Sanitize original filename (strip path components, null bytes)
        String sanitizedFilename = sanitizeFilename(originalFilename);
        String rawExtension = extractExtension(sanitizedFilename);

        // 2. Detect MIME type using Apache Tika magic-bytes inspection on the staged file
        String detectedMimeType;
        try {
            detectedMimeType = tika.detect(filePath);
        } catch (Exception e) {
            log.error("Failed to detect content type using Apache Tika for file: {}", filePath, e);
            throw new IllegalArgumentException("Unable to analyze file content");
        }

        if (detectedMimeType == null || !ALLOWED_MIME_TYPES.contains(detectedMimeType.toLowerCase())) {
            throw new IllegalArgumentException("Unsupported file type: '" + detectedMimeType + "'. Allowed types are PDF, JPG, and PNG.");
        }
        detectedMimeType = detectedMimeType.toLowerCase();

        // 3. Verify extension matches detected content
        Set<String> validExtensions = MIME_TO_EXTENSIONS.get(detectedMimeType);
        if (rawExtension.isEmpty() || !validExtensions.contains(rawExtension.toLowerCase())) {
            throw new IllegalArgumentException(
                    "File content mismatch: detected content is '" + detectedMimeType + "', which does not match extension '." + rawExtension + "'"
            );
        }

        // 4. Verify declared content type matches detected content (if provided and not generic octet-stream)
        if (declaredContentType != null && !declaredContentType.isBlank()) {
            String declared = declaredContentType.toLowerCase().split(";")[0].trim();
            if (!"application/octet-stream".equals(declared)) {
                if (!declared.equals(detectedMimeType)) {
                    // Specific check for jpeg aliases (e.g. image/pjpeg or image/jpeg)
                    boolean isJpegMatch = "image/jpeg".equals(detectedMimeType) && ("image/jpg".equals(declared) || "image/pjpeg".equals(declared));
                    if (!isJpegMatch) {
                        throw new IllegalArgumentException(
                                "Declared Content-Type '" + declaredContentType + "' does not match detected content '" + detectedMimeType + "'"
                        );
                    }
                }
            }
        }

        String normalizedExtension = rawExtension.toLowerCase();
        if ("jpeg".equals(normalizedExtension)) {
            normalizedExtension = "jpg";
        }

        return new ValidatedFileMetadata(detectedMimeType, normalizedExtension, sanitizedFilename);
    }

    public String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "attachment";
        }
        // Strip path traversal sequences and directory paths
        String name = filename.replace("\\", "/");
        int lastSlash = name.lastIndexOf('/');
        if (lastSlash >= 0) {
            name = name.substring(lastSlash + 1);
        }
        name = name.replace("\0", "").trim();
        if (name.isEmpty() || name.equals(".") || name.equals("..")) {
            return "attachment";
        }
        return name;
    }

    private String extractExtension(String filename) {
        if (filename == null) return "";
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == filename.length() - 1) {
            return "";
        }
        return filename.substring(dotIndex + 1).trim();
    }
}
