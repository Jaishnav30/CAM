package com.cams.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.storage")
@Getter
@Setter
public class StorageProperties {

    /**
     * Base directory for uploaded documents storage.
     */
    private String uploadDir = "./uploads";

    /**
     * Maximum allowed size for an individual file in bytes (default 10MB).
     */
    private long maxFileSizeBytes = 10 * 1024 * 1024L;

    /**
     * Maximum allowed size for a multipart request in bytes (default 25MB).
     */
    private long maxRequestSizeBytes = 25 * 1024 * 1024L;
}
