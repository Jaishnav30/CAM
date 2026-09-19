package com.cams.modules.document.service;

import com.cams.config.StorageProperties;
import com.cams.exception.ResourceNotFoundException;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.*;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentStorageService {

    private final StorageProperties storageProperties;
    private Path rootLocation;
    private Path stagingLocation;

    public record StagedFileInfo(
            Path stagedAbsolutePath,
            String fileHashSha256,
            long fileSizeBytes
    ) {}

    @PostConstruct
    public void init() {
        this.rootLocation = Paths.get(storageProperties.getUploadDir()).toAbsolutePath().normalize();
        this.stagingLocation = this.rootLocation.resolve("staging").normalize();
        try {
            Files.createDirectories(this.stagingLocation);
            log.info("Document storage initialized. Root: {}, Staging: {}", this.rootLocation, this.stagingLocation);
        } catch (IOException e) {
            log.error("Failed to initialize storage directories: {}", e.getMessage(), e);
            throw new RuntimeException("Could not initialize storage directories", e);
        }
    }

    public StagedFileInfo stageFile(MultipartFile file, String extension) throws IOException {
        Files.createDirectories(this.stagingLocation);
        String ext = (extension != null && !extension.isBlank()) ? (extension.startsWith(".") ? extension : "." + extension) : "";
        String tempFilename = UUID.randomUUID().toString() + ext;
        Path tempFilePath = this.stagingLocation.resolve(tempFilename).normalize();

        MessageDigest md;
        try {
            md = MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }

        long bytesWritten = 0;
        try (InputStream is = file.getInputStream();
             DigestInputStream dis = new DigestInputStream(is, md);
             OutputStream os = Files.newOutputStream(tempFilePath, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE)) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = dis.read(buffer)) != -1) {
                os.write(buffer, 0, read);
                bytesWritten += read;
            }
        } catch (IOException e) {
            try {
                Files.deleteIfExists(tempFilePath);
            } catch (IOException ignored) {}
            throw e;
        }

        String hash = HexFormat.of().formatHex(md.digest());
        return new StagedFileInfo(tempFilePath, hash, bytesWritten);
    }

    public void promoteStagedFile(Path stagedPath, String relativeTargetDir, String targetFilename) throws IOException {
        Path targetDir = this.rootLocation.resolve(relativeTargetDir).normalize();
        if (!targetDir.startsWith(this.rootLocation)) {
            throw new SecurityException("Path traversal attempt detected during file promotion");
        }
        Files.createDirectories(targetDir);

        Path targetFilePath = targetDir.resolve(targetFilename).normalize();
        if (!targetFilePath.startsWith(this.rootLocation)) {
            throw new SecurityException("Path traversal attempt detected during file promotion");
        }

        try {
            Files.move(stagedPath, targetFilePath, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            log.info("Staged file successfully promoted to: {}", targetFilePath);
        } catch (AtomicMoveNotSupportedException e) {
            log.warn("Atomic move not supported, falling back to standard move: {}", e.getMessage());
            Files.move(stagedPath, targetFilePath, StandardCopyOption.REPLACE_EXISTING);
            log.info("Staged file promoted via fallback move to: {}", targetFilePath);
        }
    }

    public void deleteStagedFile(Path stagedPath) {
        if (stagedPath == null) return;
        try {
            boolean deleted = Files.deleteIfExists(stagedPath);
            if (deleted) {
                log.debug("Deleted staged file: {}", stagedPath);
            }
        } catch (IOException e) {
            log.warn("Failed to delete staged file {}: {}", stagedPath, e.getMessage());
        }
    }

    public Resource loadAsResource(String relativeFilePath) {
        if (relativeFilePath == null || relativeFilePath.isBlank()) {
            throw new ResourceNotFoundException("Document file path is not specified");
        }

        Path file = this.rootLocation.resolve(relativeFilePath).normalize();
        if (!file.startsWith(this.rootLocation)) {
            throw new SecurityException("Path traversal attempt detected");
        }

        if (Files.exists(file) && Files.isReadable(file)) {
            return new FileSystemResource(file);
        }

        // Resiliency check: Check if file still resides in staging dir (e.g. afterCommit promotion failed)
        Path fileNameOnly = file.getFileName();
        if (fileNameOnly != null) {
            Path fallbackStagingPath = this.stagingLocation.resolve(fileNameOnly.toString()).normalize();
            if (Files.exists(fallbackStagingPath) && Files.isReadable(fallbackStagingPath)) {
                log.warn("Document served from fallback staging path: {}", fallbackStagingPath);
                return new FileSystemResource(fallbackStagingPath);
            }
        }

        throw new ResourceNotFoundException("Document file not found on disk");
    }

    public Path getRootLocation() {
        return rootLocation;
    }

    public Path getStagingLocation() {
        return stagingLocation;
    }
}
