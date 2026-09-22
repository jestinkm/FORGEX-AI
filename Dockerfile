# Stage 1: Build the application with Maven & OpenJDK 21
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Copy pom.xml and download dependencies first for caching
COPY pom.xml .
RUN apk add --no-cache maven && mvn dependency:go-offline -B

# Copy source code and package application
COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Ultra-lightweight Production Runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Add unprivileged user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser:appgroup

# Copy compiled JAR from builder stage
COPY --from=builder /app/target/flash-sale-backend-1.0.0-SNAPSHOT.jar app.jar

# Expose Spring Boot HTTP and WebSocket port
EXPOSE 8080

# Production-tuned JVM flags for high-throughput, low-pause concurrency
ENV JAVA_OPTS="-XX:+UseG1GC \
               -XX:MaxGCPauseMillis=100 \
               -XX:+InitiatingHeapOccupancyPercent=45 \
               -XX:+UseStringDeduplication \
               -Xms1024m \
               -Xmx2048m \
               -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
