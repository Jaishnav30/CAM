# ==============================================================================
# CAM Production Backend Dockerfile (Repository Root Context)
# ==============================================================================
FROM maven:3.9.8-eclipse-temurin-21-alpine AS builder

WORKDIR /build

# Copy Maven pom from backend/
COPY backend/pom.xml ./pom.xml
RUN mvn dependency:go-offline -B

# Copy backend source code and package JAR
COPY backend/src ./src
RUN mvn clean package -DskipTests -B

# ==============================================================================
# Runtime Stage: Lightweight Eclipse Temurin JRE 21 Alpine
# ==============================================================================
FROM eclipse-temurin:21-jre-alpine

LABEL maintainer="CAM Engineering"
LABEL description="Club Accounting & Management (CAM) Production Backend Service"

WORKDIR /app

RUN addgroup -S camsgroup && adduser -S camsuser -G camsgroup
RUN mkdir -p /app/uploads && chown -R camsuser:camsgroup /app

COPY --from=builder /build/target/cams-backend-*.jar /app/app.jar

USER camsuser

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom -jar /app/app.jar"]
