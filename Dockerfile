ARG RUST_VERSION=1.78.0

# Install chef dependencies
FROM lukemathwalker/cargo-chef:latest-rust-${RUST_VERSION} AS chef
WORKDIR /app
RUN apt update && apt install lld clang -y

# Plan build
FROM chef AS planner
COPY . .
# Compute a lock-like file for our project
RUN cargo chef prepare  --recipe-path recipe.json

# Build
FROM chef AS builder

# Build dependencies based on lockfile
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json

# Build app
COPY . .
ENV SQLX_OFFLINE=true
RUN cargo build --release --bin poem-sse-chat


# Runtime
FROM debian:bookworm-slim AS runtime

WORKDIR /app

# Install OpenSSL - it is dynamically linked by some of our dependencies
# Install ca-certificates - it is needed to verify TLS certificates
# when establishing HTTPS connections
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    # Clean up
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Copy the compiled binary from the builder environment to our runtime environment
COPY --from=builder /app/target/release/poem-sse-chat poem-sse-chat
ENV APP_ENVIRONMENT=production
ENTRYPOINT ["./poem-sse-chat"]
