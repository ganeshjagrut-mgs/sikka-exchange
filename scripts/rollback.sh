#!/bin/bash
# rollback.sh - Emergency rollback script for Sikka platform

set -e  # Exit on any error

# Configuration
DEST_HOST="sikka-prod"
DEST_DIR="~/sikka"
LOG_FILE="rollback-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}" | tee -a "$LOG_FILE"
}

# Find latest backup
find_latest_backup() {
    log "Finding latest backup..."

    LATEST_BACKUP=$(ssh "$DEST_HOST" "ls -td ~/sikka_backups/* 2>/dev/null | head -1")

    if [ -z "$LATEST_BACKUP" ]; then
        error "No backup found for rollback"
        exit 1
    fi

    log "✅ Latest backup: $LATEST_BACKUP"
}

# Stop services safely
stop_services() {
    log "Stopping services safely..."

    ssh "$DEST_HOST" "
        cd $DEST_DIR

        # Graceful shutdown with timeout
        if docker-compose ps | grep -q 'Up'; then
            echo 'Stopping services gracefully...'
            timeout 30 docker-compose down || echo 'Force stopping services...'
            docker-compose down -v --remove-orphans 2>/dev/null || true
        else
            echo 'Services already stopped'
        fi

        echo 'Services stopped successfully'
    "

    log "✅ Services stopped"
}

# Perform rollback
perform_rollback() {
    log "Performing rollback to: $LATEST_BACKUP"

    ssh "$DEST_HOST" "
        # Remove current deployment
        rm -rf $DEST_DIR

        # Restore from backup
        cp -r \"$LATEST_BACKUP\" $DEST_DIR

        echo 'Rollback files restored'
    "

    log "✅ Rollback completed"
}

# Restore services
restore_services() {
    log "Restoring services..."

    ssh "$DEST_HOST" "
        cd $DEST_DIR

        # Start services
        docker-compose up -d

        # Wait for services to start
        sleep 15

        # Verify services are running
        if docker-compose ps | grep -q 'sikka_backend.*Up'; then
            echo '✅ Backend service restored'
        else
            echo '❌ Backend service failed to start'
            docker-compose logs sikka_backend
            exit 1
        fi

        if docker-compose ps | grep -q 'sikka_postgres.*Up'; then
            echo '✅ PostgreSQL service restored'
        else
            echo '❌ PostgreSQL service failed to start'
            docker-compose logs sikka_postgres
            exit 1
        fi
    "

    log "✅ Services restored"
}

# Verify rollback
verify_rollback() {
    log "Verifying rollback..."

    # Test health endpoint
    if ssh "$DEST_HOST" "curl -f --max-time 30 http://localhost:3000/health >/dev/null 2>&1"; then
        log "✅ Health endpoint responding after rollback"
    else
        error "Health endpoint not responding after rollback"
        return 1
    fi

    # Check file integrity
    ssh "$DEST_HOST" "
        cd $DEST_DIR

        # Verify critical files exist
        if [ -f backend/server.js ] && [ -f docker-compose.yml ]; then
            echo 'Critical files verified'
        else
            echo 'ERROR: Critical files missing after rollback'
            exit 1
        fi
    "

    log "✅ Rollback verification completed"
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"

    # Send Slack notification if webhook is configured
    if [ -n "${SLACK_WEBHOOK:-}" ]; then
        local color="danger"
        [ "$status" = "success" ] && color="good"

        curl -X POST -H 'Content-type: application/json' \
             --data "{\"attachments\":[{\"color\":\"$color\",\"text\":\"$message\"}]}" \
             "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
}

# Emergency stop (alternative to rollback)
emergency_stop() {
    log "Performing emergency stop..."

    ssh "$DEST_HOST" "
        # Stop all services immediately
        docker-compose down -v --remove-orphans 2>/dev/null || true

        # Kill any remaining processes
        pkill -f 'node.*server.js' || true
        pkill -f 'postgres' || true

        # Block application port
        sudo iptables -A INPUT -p tcp --dport 3000 -j DROP 2>/dev/null || true

        echo 'Emergency stop completed'
    "

    log "✅ Emergency stop completed"
    send_notification "error" "🚨 EMERGENCY STOP: Sikka services stopped on $DEST_HOST"
}

# Show rollback information
show_info() {
    log "=== Rollback Information ==="
    log "Target: $DEST_HOST:$DEST_DIR"
    log "Latest Backup: $LATEST_BACKUP"

    ssh "$DEST_HOST" "
        echo 'Available backups:'
        ls -la ~/sikka_backups/ 2>/dev/null || echo 'No backups directory'

        if [ -d ~/sikka ]; then
            echo 'Current deployment size:' \$(du -sh ~/sikka 2>/dev/null || echo 'Unknown')
        fi
    "
}

# Main execution
main() {
    log "=== Sikka Rollback Started ==="
    log "Timestamp: $(date)"
    log "Log file: $LOG_FILE"

    find_latest_backup
    show_info

    # Confirm rollback unless --force is used
    if [ "${1:-}" != "--force" ]; then
        echo ""
        warning "This will rollback $DEST_HOST:$DEST_DIR to $LATEST_BACKUP"
        read -p "Are you sure? (y/N): " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Rollback cancelled by user"
            exit 0
        fi
    fi

    stop_services
    perform_rollback
    restore_services

    if verify_rollback; then
        log "=== Rollback completed successfully ==="
        send_notification "success" "🔄 Rollback completed successfully on $DEST_HOST"
    else
        error "=== Rollback verification failed ==="
        send_notification "error" "❌ Rollback verification failed on $DEST_HOST"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    --emergency-stop)
        log "=== Emergency Stop Requested ==="
        emergency_stop
        ;;
    --info)
        find_latest_backup
        show_info
        ;;
    --force)
        main --force
        ;;
    --help)
        echo "Usage: $0 [OPTIONS]"
        echo "Options:"
        echo "  --emergency-stop    Stop all services immediately (no rollback)"
        echo "  --info             Show rollback information without executing"
        echo "  --force            Skip confirmation prompt"
        echo "  --help             Show this help message"
        echo ""
        echo "Default behavior: Interactive rollback to latest backup"
        ;;
    *)
        main
        ;;
esac