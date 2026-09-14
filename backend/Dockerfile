# ==============================================================================
# STAGE 1: Build Application with Maven & JDK 21
# ==============================================================================
FROM maven:3.9.8-eclipse-temurin-21-alpine AS builder

WORKDIR /build

# Cache maven dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy application source code and compile production JAR
COPY src ./src
RUN mvn clean package -DskipTests -B

# ==============================================================================
# STAGE 2: Lightweight Production Runtime with JRE 21 Alpine
# ==============================================================================
FROM eclipse-temurin:21-jre-alpine

LABEL maintainer="CAM Engineering"
LABEL description="Club Accounting & Management (CAM) Production Backend Service"

WORKDIR /app

# Create unprivileged application user
RUN addgroup -S camsgroup && adduser -S camsuser -G camsgroup

# Create directory for uploads with correct permissions
RUN mkdir -p /app/uploads && chown -R camsuser:camsgroup /app

# Copy executable jar from builder stage
COPY --from=builder /build/target/cams-backend-*.jar /app/app.jar

# Run as non-root user
USER camsuser

# Expose container port (overridden dynamically by Render/Railway via $PORT)
ENV PORT=8080
EXPOSE 8080

# Production JVM flags for memory optimization in container environments
ENTRYPOINT ["sh", "-c", "java -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom -jar /app/app.jar"]
