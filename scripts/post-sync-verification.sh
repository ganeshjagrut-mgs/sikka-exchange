#!/bin/bash
# post-sync-verification.sh - Post-deployment verification script

set -e  # Exit on any error

# Configuration
DEST_HOST="sikka-prod"
DEST_DIR="~/sikka"
LOG_FILE="post-sync-$(date +%Y%m%d-%H%M%S).log"

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

# Test SSH connection
test_ssh_connection() {
    log "Testing SSH connection to $DEST_HOST..."

    if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$DEST_HOST" "echo 'SSH connection successful'" >/dev/null 2>&1; then
        error "Cannot connect to $DEST_HOST"
        exit 1
    fi

    log "✅ SSH connection successful"
}

# Verify file structure
verify_file_structure() {
    log "Verifying remote file structure..."

    ssh "$DEST_HOST" "
        cd $DEST_DIR

        # Check critical directories exist
        for dir in backend test-ui scripts; do
            if [ ! -d \"\$dir\" ]; then
                echo \"ERROR: Missing directory: \$dir\"
                exit 1
            fi
        done

        # Check critical files exist
        critical_files=(
            'backend/package.json'
            'backend/server.js'
            'backend/Dockerfile'
            'docker-compose.yml'
            'test-ui/user-flows.html'
            'test-ui/admin-flows.html'
        )

        for file in \"\${critical_files[@]}\"; do
            if [ ! -f \"\$file\" ]; then
                echo \"ERROR: Missing critical file: \$file\"
                exit 1
            fi
        done

        echo 'File structure verification passed'
    "

    log "✅ File structure verified"
}

# Check file permissions
check_file_permissions() {
    log "Checking file permissions..."

    ssh "$DEST_HOST" "
        cd $DEST_DIR

        # Check backend directory permissions
        if [ ! -r backend/server.js ] || [ ! -x backend/server.js ]; then
            echo 'ERROR: Incorrect permissions on backend/server.js'
            exit 1
        fi

        # Check script permissions
        if [ -f scripts/sync-to-production.sh ] && [ ! -x scripts/sync-to-production.sh ]; then
            echo 'ERROR: Script not executable: scripts/sync-to-production.sh'
            exit 1
        fi

        # Check for world-writable files (security risk)
        world_writable=\$(find . -type f -perm -002 2>/dev/null | wc -l)
        if [ \"\$world_writable\" -gt 0 ]; then
            echo \"WARNING: Found \$world_writable world-writable files\"
        fi

        echo 'File permissions check passed'
    "

    log "✅ File permissions verified"
}

# Test Docker services
test_docker_services() {
    log "Testing Docker services..."

    ssh "$DEST_HOST" "
        cd $DEST_DIR

        # Check if docker-compose is available
        if ! command -v docker-compose >/dev/null 2>&1; then
            echo 'ERROR: docker-compose not available'
            exit 1
        fi

        # Check service status
        if ! docker-compose ps | grep -q 'sikka_backend.*Up'; then
            echo 'ERROR: Backend service not running'
            docker-compose logs sikka_backend | tail -20
            exit 1
        fi

        if ! docker-compose ps | grep -q 'sikka_postgres.*Up'; then
            echo 'ERROR: PostgreSQL service not running'
            docker-compose logs sikka_postgres | tail -20
            exit 1
        fi

        echo 'Docker services verification passed'
    "

    log "✅ Docker services running"
}

# Test application health
test_application_health() {
    log "Testing application health..."

    # Test health endpoint
    if ! ssh "$DEST_HOST" "curl -f --max-time 30 http://localhost:3000/health >/dev/null 2>&1"; then
        error "Health endpoint not responding"
        # Show recent logs for debugging
        ssh "$DEST_HOST" "cd $DEST_DIR && docker-compose logs --tail=50 sikka_backend" >&2
        exit 1
    fi

    log "✅ Health endpoint responding"

    # Test basic API endpoints
    local endpoints=(
        "GET /health"
        "GET /"
    )

    for endpoint in "${endpoints[@]}"; do
        local method=$(echo "$endpoint" | cut -d' ' -f1)
        local path=$(echo "$endpoint" | cut -d' ' -f2)

        if ssh "$DEST_HOST" "curl -f -X $method --max-time 10 http://localhost:3000$path >/dev/null 2>&1"; then
            log "✅ $method $path responding"
        else
            warning "⚠️  $method $path not responding"
        fi
    done
}

# Check disk space
check_disk_space() {
    log "Checking remote disk space..."

    ssh "$DEST_HOST" "
        # Check available space in home directory
        available_gb=\$(df -BG ~ | tail -1 | awk '{print \$4}' | sed 's/G//')

        if [ \"\$available_gb\" -lt 5 ]; then
            echo \"WARNING: Low disk space: \${available_gb}GB available\"
        else
            echo \"Disk space check passed: \${available_gb}GB available\"
        fi

        # Check sikka directory size
        if [ -d ~/sikka ]; then
            size_mb=\$(du -sm ~/sikka | cut -f1)
            echo \"Sikka directory size: \${size_mb}MB\"
        fi
    "

    log "✅ Disk space check completed"
}

# Verify backup integrity
verify_backup() {
    log "Verifying backup integrity..."

    ssh "$DEST_HOST" "
        # Find latest backup
        latest_backup=\$(ls -td ~/sikka_backups/* 2>/dev/null | head -1)

        if [ -z \"\$latest_backup\" ]; then
            echo 'No backup found'
            exit 0
        fi

        # Check backup size vs current deployment
        backup_size=\$(du -sm \"\$latest_backup\" 2>/dev/null | cut -f1 || echo 0)
        current_size=\$(du -sm ~/sikka 2>/dev/null | cut -f1 || echo 0)

        if [ \"\$backup_size\" -gt 0 ] && [ \"\$current_size\" -gt 0 ]; then
            size_diff=\$((current_size - backup_size))
            echo \"Backup size: \${backup_size}MB, Current: \${current_size}MB, Difference: \${size_diff}MB\"
        fi

        echo 'Backup verification completed'
    "

    log "✅ Backup verification completed"
}

# Performance check
performance_check() {
    log "Running performance checks..."

    # Test response time
    local response_time=$(ssh "$DEST_HOST" "
        start_time=\$(date +%s%3N)
        curl -s http://localhost:3000/health >/dev/null
        end_time=\$(date +%s%3N)
        echo \$((end_time - start_time))
    ")

    if [ "$response_time" -gt 5000 ]; then
        warning "Slow response time: ${response_time}ms"
    else
        log "✅ Response time: ${response_time}ms"
    fi

    # Check memory usage
    ssh "$DEST_HOST" "
        # Get container memory usage
        if command -v docker >/dev/null 2>&1; then
            docker stats --no-stream --format 'table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}' | grep sikka || true
        fi
    " | while read -r line; do
        info "Container stats: $line"
    done
}

# Generate summary report
generate_summary() {
    log "=== Post-Sync Verification Summary ==="
    log "Timestamp: $(date)"
    log "Target: $DEST_HOST:$DEST_DIR"
    log "Log file: $LOG_FILE"

    # Count total checks
    local total_checks=6
    local passed_checks=0

    # Each function sets passed_checks
    if test_ssh_connection 2>/dev/null; then ((passed_checks++)); fi
    if verify_file_structure 2>/dev/null; then ((passed_checks++)); fi
    if check_file_permissions 2>/dev/null; then ((passed_checks++)); fi
    if test_docker_services 2>/dev/null; then ((passed_checks++)); fi
    if test_application_health 2>/dev/null; then ((passed_checks++)); fi
    if check_disk_space 2>/dev/null; then ((passed_checks++)); fi

    log "Checks passed: $passed_checks/$total_checks"

    if [ $passed_checks -eq $total_checks ]; then
        log "✅ All verification checks passed"
        return 0
    else
        warning "⚠️  Some checks failed: $((total_checks - passed_checks)) failed"
        return 1
    fi
}

# Main execution
main() {
    log "=== Post-Sync Verification Started ==="

    # Run all checks
    test_ssh_connection
    verify_file_structure
    check_file_permissions
    test_docker_services
    test_application_health
    check_disk_space
    verify_backup
    performance_check

    # Generate summary
    if generate_summary; then
        log "=== Verification completed successfully ==="
        exit 0
    else
        error "=== Verification completed with issues ==="
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    --quick)
        log "Running quick verification..."
        test_ssh_connection
        test_docker_services
        test_application_health
        generate_summary
        ;;
    --help)
        echo "Usage: $0 [OPTIONS]"
        echo "Options:"
        echo "  --quick    Run only essential checks"
        echo "  --help     Show this help message"
        ;;
    *)
        main
        ;;
esac