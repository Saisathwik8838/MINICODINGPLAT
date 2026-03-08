# Base image for Java execution
FROM eclipse-temurin:17-jdk-alpine

# Create a non-root user
RUN addgroup -S runner && adduser -S runner -G runner

WORKDIR /usr/src/app

COPY runners/runner.sh /usr/local/bin/runner
RUN chmod +x /usr/local/bin/runner

USER runner

ENTRYPOINT ["/usr/local/bin/runner"]
