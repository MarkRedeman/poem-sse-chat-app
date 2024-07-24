# Build stage
FROM rust:1.78.0 AS builder

WORKDIR /app
COPY . .
RUN cargo build --release

# Runtime stage
FROM rust:1.78.0-slim AS runtime

WORKDIR /app

COPY --from=builder /app/target/release/poem-sse-chat poem-sse-chat
ENV APP_ENVIRONMENT=production
ENTRYPOINT ["./poem-sse-chat"]
