#!/bin/bash
# sync-to-production.sh - Main synchronization script for Sikka platform

set -e  # Exit on any error

# Configuration
SOURCE_DIR="/Users/devajmody/Repos/piermind/sikka"
DEST_HOST="sikka-prod"
DEST_DIR="~/sikka"
EXCLUDE_FILE="rsync-excludes.txt"
LOG_FILE="rsync-$(date +%Y%m%d-%H%M%S).log"
BACKUP_DIR="~/sikka_backups/$(date +%Y%m%d_%H%M%S)"

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

# Create remote backup
create_remote_backup() {
    log "Creating remote backup..."

    ssh "$DEST_HOST" "
        mkdir -p ~/sikka_backups
        if [ -d ~/sikka ]; then
            cp -r ~/sikka \"$BACKUP_DIR\"
            echo \"Backup created: $BACKUP_DIR\"
        else
            echo \"No existing deployment to backup\"
        fi
    "

    log "✅ Remote backup completed"
}

# Cleanup old backups (keep last 10)
cleanup_old_backups() {
    log "Cleaning up old backups..."

    ssh "$DEST_HOST" "
        if [ -d ~/sikka_backups ]; then
            ls -td ~/sikka_backups/* 2>/dev/null | tail -n +11 | xargs rm -rf 2>/dev/null || true
            remaining=\$(ls ~/sikka_backups/* 2>/dev/null | wc -l)
            echo \"Backups cleaned up, \$remaining remaining\"
        fi
    "

    log "✅ Backup cleanup completed"
}

# Main sync function
perform_sync() {
    log "Starting rsync synchronization..."
    info "Source: $SOURCE_DIR"
    info "Destination: $DEST_HOST:$DEST_DIR"
    info "Excludes: $EXCLUDE_FILE"

    # Determine bandwidth limit based on time of day
    local current_hour=$(date +%H)
    local bwlimit=10000  # Default 10MB/s

    # Reduce bandwidth during business hours (9 AM - 6 PM)
    if [ "$current_hour" -ge 9 ] && [ "$current_hour" -le 18 ]; then
        bwlimit=5000  # 5MB/s during business hours
        info "Business hours detected, limiting bandwidth to ${bwlimit}KB/s"
    fi

    rsync -avz --delete --compress --partial --progress \
          --bwlimit="$bwlimit" \
          --exclude-from="$EXCLUDE_FILE" \
          --log-file="$LOG_FILE" \
          --rsync-path="mkdir -p $DEST_DIR && rsync" \
          "$SOURCE_DIR/" \
          "$DEST_HOST:$DEST_DIR/"

    local rsync_exit=$?
    if [ $rsync_exit -eq 0 ]; then
        log "✅ rsync completed successfully"
    else
        error "rsync failed with exit code $rsync_exit"
        exit 1
    fi
}

# Set proper permissions on remote server
set_remote_permissions() {
    log "Setting remote file permissions..."

    ssh "$DEST_HOST" "
        cd ~/sikka
        # Set directory permissions
        find . -type d -exec chmod 755 {} \;
        # Set file permissions
        find . -type f -name '*.sh' -exec chmod 755 {} \;
        find . -type f -name '*.js' -exec chmod 644 {} \;
        find . -type f -name '*.json' -exec chmod 644 {} \;
        find . -type f -name '*.md' -exec chmod 644 {} \;
        # Ensure backend directory is accessible
        chown -R m.devaj.m:m.devaj.m . 2>/dev/null || true
        echo \"Permissions set successfully\"
    "

    log "✅ Remote permissions configured"
}

# Restart remote services
restart_remote_services() {
    log "Restarting remote services..."

    ssh "$DEST_HOST" "
        cd ~/sikka

        # Stop existing services
        docker-compose down 2>/dev/null || true

        # Start services
        docker-compose up -d

        # Wait for services to start
        sleep 10

        # Check if services are running
        if docker-compose ps | grep -q 'sikka_backend.*Up'; then
            echo \"✅ Backend service started successfully\"
        else
            echo \"❌ Backend service failed to start\"
            docker-compose logs sikka_backend
            exit 1
        fi

        if docker-compose ps | grep -q 'sikka_postgres.*Up'; then
            echo \"✅ PostgreSQL service started successfully\"
        else
            echo \"❌ PostgreSQL service failed to start\"
            docker-compose logs sikka_postgres
            exit 1
        fi
    "

    log "✅ Remote services restarted"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."

    # Test health endpoint
    if ssh "$DEST_HOST" "curl -f --max-time 30 http://localhost:3000/health >/dev/null 2>&1"; then
        log "✅ Health endpoint responding"
    else
        error "Health endpoint not responding"
        return 1
    fi

    # Check file integrity (compare file counts)
    local local_count=$(find "$SOURCE_DIR" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/data/*" | wc -l)
    local remote_count=$(ssh "$DEST_HOST" "find ~/sikka -type f 2>/dev/null | wc -l")

    info "Local files: $local_count, Remote files: $remote_count"

    if [ "$local_count" -eq "$remote_count" ]; then
        log "✅ File counts match"
    else
        warning "File count mismatch (local: $local_count, remote: $remote_count)"
    fi

    log "✅ Deployment verification completed"
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"

    # Send Slack notification if webhook is configured
    if [ -n "${SLACK_WEBHOOK:-}" ]; then
        local color="good"
        [ "$status" = "error" ] && color="danger"
        [ "$status" = "warning" ] && color="warning"

        curl -X POST -H 'Content-type: application/json' \
             --data "{\"attachments\":[{\"color\":\"$color\",\"text\":\"$message\"}]}" \
             "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
}

# Main execution
main() {
    log "=== Sikka Production Deployment Started ==="
    log "Timestamp: $(date)"
    log "Log file: $LOG_FILE"

    # Trap for cleanup on error
    trap 'error "Deployment failed - check logs: $LOG_FILE"' ERR

    create_remote_backup
    cleanup_old_backups
    perform_sync
    set_remote_permissions
    restart_remote_services

    if verify_deployment; then
        log "=== Deployment completed successfully ==="
        send_notification "success" "🚀 Sikka deployment completed successfully"
    else
        error "=== Deployment verification failed ==="
        send_notification "error" "❌ Sikka deployment verification failed"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    --dry-run)
        log "Performing dry run..."
        rsync -avzn --delete \
              --exclude-from="$EXCLUDE_FILE" \
              "$SOURCE_DIR/" \
              "$DEST_HOST:$DEST_DIR/"
        ;;
    --backup-only)
        log "Creating backup only..."
        create_remote_backup
        cleanup_old_backups
        ;;
    --help)
        echo "Usage: $0 [OPTIONS]"
        echo "Options:"
        echo "  --dry-run      Show what would be transferred without making changes"
        echo "  --backup-only  Create backup without syncing"
        echo "  --help         Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  SLACK_WEBHOOK  Slack webhook URL for notifications"
        ;;
    *)
        main
        ;;
esac