#!/bin/bash

# TactileType API Deployment Script
# Usage: ./deploy.sh [build|deploy|restart|logs|stop]

set -e

# Configuration
IMAGE_NAME="tactile-api"
CONTAINER_NAME="tactile-api-container"
REGISTRY=""  # Add your registry if using one (e.g., "your-registry.com/")

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

# Build the Docker image
build_image() {
    log "Building Docker image..."
    cd "$(dirname "$0")/../.."  # Go to project root
    docker build -t "${REGISTRY}${IMAGE_NAME}:latest" -f apps/api/Dockerfile .
    log "Image built successfully: ${REGISTRY}${IMAGE_NAME}:latest"
}

# Deploy the container
deploy_container() {
    log "Deploying container..."

    # Stop and remove existing container if it exists
    if docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log "Stopping existing container..."
        docker stop "${CONTAINER_NAME}" || true
        docker rm "${CONTAINER_NAME}" || true
    fi

    # Check if .env file exists
    if [ ! -f "apps/api/.env" ]; then
        warn ".env file not found. Please create apps/api/.env with required environment variables."
        warn "Required variables: DATABASE_URL, JWT_SECRET, etc."
    fi

    # Run the container
    docker run -d \
        --name "${CONTAINER_NAME}" \
        --restart unless-stopped \
        -p 3001:3001 \
        --env-file apps/api/.env \
        "${REGISTRY}${IMAGE_NAME}:latest"

    log "Container deployed successfully!"
    log "API will be available at http://your-vps-ip:3001"
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
    echo "  deploy   - Deploy the container (builds if needed)"
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

    case "${1:-help}" in
        build)
            build_image
            ;;
        deploy)
            build_image
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