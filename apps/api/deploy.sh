#!/bin/bash

# TactileType API Deployment Script
# Usage: ./deploy.sh [build|migrate|deploy|restart|logs|stop|status]

set -e

# Configuration
IMAGE_NAME="tactile-api"
CONTAINER_NAME="tactile-api-container"
REGISTRY=""  # Add your registry if using one (e.g., "your-registry.com/")

# Must match PORT in apps/api/.env, EXPOSE in the Dockerfile, and the
# proxy_pass target in nginx.
PORT="${PORT:-3021}"
ENV_FILE="apps/api/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check if Docker is installed and running
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        error "Docker daemon is not running. Please start Docker service."
        exit 1
    fi
}

# Refuse to run without an env file. Every required variable has a development
# fallback in apps/api/src/constants.ts — JWT_SECRET falls back to the literal
# string 'your-secret-key' — so a missing .env starts a server that looks
# healthy and signs forgeable tokens against a database it cannot reach.
require_env() {
    if [ ! -f "${ENV_FILE}" ]; then
        error "${ENV_FILE} not found."
        error "Create it from the template: cp apps/api/.env.example ${ENV_FILE}"
        exit 1
    fi
}

# Build the Docker image
build_image() {
    log "Building Docker image..."
    docker build -t "${REGISTRY}${IMAGE_NAME}:latest" -f apps/api/Dockerfile .
    log "Image built successfully: ${REGISTRY}${IMAGE_NAME}:latest"
}

# Apply pending database migrations in a one-off container.
#
# This is a separate step rather than a Dockerfile RUN or a container entrypoint:
# a build step would migrate whatever database the *builder* can reach, and an
# entrypoint would re-run on every restart, including the automatic ones from
# `--restart unless-stopped` during an outage.
#
# --filter runs the script with its cwd set to packages/database, which is what
# makes the migrator's relative './migrations' path resolve.
run_migrations() {
    require_env
    log "Running database migrations..."
    docker run --rm \
        --add-host=host.docker.internal:host-gateway \
        --env-file "${ENV_FILE}" \
        "${REGISTRY}${IMAGE_NAME}:latest" \
        bun run --filter=@tactile/database db:migrate
    log "Migrations applied."
}

# Deploy the container
deploy_container() {
    require_env
    log "Deploying container..."

    # Stop and remove existing container if it exists
    if docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log "Stopping existing container..."
        docker stop "${CONTAINER_NAME}" || true
        docker rm "${CONTAINER_NAME}" || true
    fi

    # Run the container. Published on loopback only: nginx terminates TLS and
    # proxies to it, so binding 0.0.0.0 would serve the API unencrypted on
    # http://<vps-ip>:${PORT} straight past the firewall's 80/443-only rules.
    #
    # host.docker.internal is mapped so a Postgres running on the VPS host
    # itself is reachable — inside a container, `localhost` is the container.
    docker run -d \
        --name "${CONTAINER_NAME}" \
        --restart unless-stopped \
        -p "127.0.0.1:${PORT}:${PORT}" \
        --add-host=host.docker.internal:host-gateway \
        --env-file "${ENV_FILE}" \
        "${REGISTRY}${IMAGE_NAME}:latest"

    log "Container deployed successfully!"
    log "API listening on 127.0.0.1:${PORT} — reach it through nginx."
}

# Show container logs
show_logs() {
    if docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        docker logs -f "${CONTAINER_NAME}"
    else
        error "Container ${CONTAINER_NAME} not found. Run './deploy.sh deploy' first."
    fi
}

# Restart container
restart_container() {
    if docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log "Restarting container..."
        docker restart "${CONTAINER_NAME}"
        log "Container restarted successfully!"
    else
        error "Container ${CONTAINER_NAME} not found. Run './deploy.sh deploy' first."
    fi
}

# Stop container
stop_container() {
    if docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log "Stopping container..."
        docker stop "${CONTAINER_NAME}"
        log "Container stopped successfully!"
    else
        warn "Container ${CONTAINER_NAME} not found."
    fi
}

# Show usage
usage() {
    echo "TactileType API Deployment Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build    - Build the Docker image"
    echo "  migrate  - Apply pending database migrations"
    echo "  deploy   - Build, migrate, then restart the container"
    echo "  restart  - Restart the running container"
    echo "  logs     - Show container logs"
    echo "  stop     - Stop the running container"
    echo "  status   - Show container status"
    echo ""
    echo "Examples:"
    echo "  $0 build"
    echo "  $0 deploy"
    echo "  $0 logs"
}

# Show container status
show_status() {
    echo "Container Status:"
    docker ps -a --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Main script
main() {
    check_docker

    # Every path below uses paths relative to the repo root (the Docker build
    # context, ENV_FILE), so anchor there regardless of where this was invoked.
    cd "$(dirname "$0")/../.."

    case "${1:-help}" in
        build)
            build_image
            ;;
        migrate)
            run_migrations
            ;;
        deploy)
            build_image
            # Before the swap, not after: the new image is the one whose code
            # expects the new schema, and `set -e` aborts here if a migration
            # fails, leaving the old container serving.
            run_migrations
            deploy_container
            ;;
        restart)
            restart_container
            ;;
        logs)
            show_logs
            ;;
        stop)
            stop_container
            ;;
        status)
            show_status
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            error "Unknown command: $1"
            echo ""
            usage
            exit 1
            ;;
    esac
}

main "$@"