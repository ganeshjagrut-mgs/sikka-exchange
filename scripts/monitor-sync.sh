#!/bin/bash
# monitor-sync.sh - Monitoring and alerting for rsync operations

# Configuration
LOG_DIR="."
MAX_SYNC_TIME=1800  # 30 minutes
MAX_DISK_USAGE=90   # 90%
MIN_FREE_SPACE=10   # 10GB
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}" >&2
}

# Send Slack notification
send_slack_notification() {
    local message="$1"
    local color="${2:-good}"

    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
             --data "{\"attachments\":[{\"color\":\"$color\",\"text\":\"$message\"}]}" \
             "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
}

# Monitor rsync process
monitor_rsync_process() {
    local log_file="$1"

    if [ ! -f "$log_file" ]; then
        return 0
    fi

    # Check if rsync is still running
    local rsync_pid=$(pgrep -f "rsync.*$log_file" || echo "")

    if [ -n "$rsync_pid" ]; then
        log "rsync process running (PID: $rsync_pid)"

        # Check duration
        local start_time=$(stat -c %Y "$log_file" 2>/dev/null || echo 0)
        local current_time=$(date +%s)
        local duration=$((current_time - start_time))

        if [ $duration -gt $MAX_SYNC_TIME ]; then
            local message="🚨 rsync taking too long: ${duration}s (max: ${MAX_SYNC_TIME}s)"
            warning "$message"
            send_slack_notification "$message" "warning"

            # Kill stuck process
            kill $rsync_pid 2>/dev/null || true
            error "Killed stuck rsync process"
            return 1
        fi
    else
        # Check if rsync completed successfully
        if grep -q "rsync completed successfully" "$log_file" 2>/dev/null; then
            log "rsync completed successfully"
        elif grep -q "rsync failed" "$log_file" 2>/dev/null; then
            local message="❌ rsync failed - check logs: $log_file"
            error "$message"
            send_slack_notification "$message" "danger"
            return 1
        fi
    fi

    return 0
}

# Monitor disk usage
monitor_disk_usage() {
    local mount_point="$1"
    local usage=$(df "$mount_point" | tail -1 | awk '{print $5}' | sed 's/%//')

    if [ $usage -gt $MAX_DISK_USAGE ]; then
        local message="🚨 High disk usage on $mount_point: ${usage}%"
        warning "$message"
        send_slack_notification "$message" "danger"
    fi
}

# Monitor free space
monitor_free_space() {
    local path="$1"
    local free_gb=$(df -BG "$path" | tail -1 | awk '{print $4}' | sed 's/G//')

    if [ $free_gb -lt $MIN_FREE_SPACE ]; then
        local message="🚨 Low disk space on $path: ${free_gb}GB remaining"
        warning "$message"
        send_slack_notification "$message" "danger"
    fi
}

# Monitor remote server (if SSH available)
monitor_remote_server() {
    local dest_host="sikka-prod"

    if ssh -o ConnectTimeout=5 -o BatchMode=yes "$dest_host" "echo 'SSH OK'" >/dev/null 2>&1; then
        # Monitor remote disk usage
        ssh "$dest_host" "
            # Check disk usage
            usage=\$(df /home | tail -1 | awk '{print \$5}' | sed 's/%//')
            if [ \"\$usage\" -gt $MAX_DISK_USAGE ]; then
                echo \"REMOTE_HIGH_DISK:\$usage\"
            fi

            # Check free space
            free_gb=\$(df -BG /home | tail -1 | awk '{print \$4}' | sed 's/G//')
            if [ \"\$free_gb\" -lt $MIN_FREE_SPACE ]; then
                echo \"REMOTE_LOW_SPACE:\$free_gb\"
            fi

            # Check service health
            if ! curl -f --max-time 10 http://localhost:3000/health >/dev/null 2>&1; then
                echo 'REMOTE_SERVICE_DOWN'
            fi
        " | while read -r line; do
            case "$line" in
                REMOTE_HIGH_DISK:*)
                    local usage=$(echo "$line" | cut -d: -f2)
                    local message="🚨 High disk usage on remote server: ${usage}%"
                    warning "$message"
                    send_slack_notification "$message" "danger"
                    ;;
                REMOTE_LOW_SPACE:*)
                    local free_gb=$(echo "$line" | cut -d: -f2)
                    local message="🚨 Low disk space on remote server: ${free_gb}GB remaining"
                    warning "$message"
                    send_slack_notification "$message" "danger"
                    ;;
                REMOTE_SERVICE_DOWN)
                    local message="🚨 Remote service health check failed"
                    error "$message"
                    send_slack_notification "$message" "danger"
                    ;;
            esac
        done
    fi
}

# Check for failed sync logs
check_failed_syncs() {
    # Look for recent failed sync logs
    local failed_logs=$(find "$LOG_DIR" -name "rsync-*.log" -mtime -1 -exec grep -l "rsync failed\|ERROR" {} \; 2>/dev/null)

    if [ -n "$failed_logs" ]; then
        local count=$(echo "$failed_logs" | wc -l)
        local message="🚨 Found $count failed sync logs in the last 24 hours"
        warning "$message"
        send_slack_notification "$message" "warning"
    fi
}

# Generate monitoring report
generate_report() {
    log "=== Sync Monitoring Report ==="

    # Check recent logs
    local recent_logs=$(find "$LOG_DIR" -name "rsync-*.log" -mtime -1 | wc -l)
    log "Recent sync logs (24h): $recent_logs"

    # Check backup count
    if ssh -o ConnectTimeout=5 -o BatchMode=yes sikka-prod "ls ~/sikka_backups/ 2>/dev/null | wc -l" >/dev/null 2>&1; then
        local backup_count=$(ssh sikka-prod "ls ~/sikka_backups/ 2>/dev/null | wc -l")
        log "Remote backups: $backup_count"
    fi

    # Check disk usage
    local usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    log "Local disk usage: ${usage}%"

    log "Monitoring report generated"
}

# Main monitoring function
run_monitoring_checks() {
    # Monitor local system
    monitor_disk_usage "/"
    monitor_free_space "/"

    # Monitor remote system
    monitor_remote_server

    # Check for failed syncs
    check_failed_syncs

    # Monitor any active rsync processes
    local active_logs=$(find "$LOG_DIR" -name "rsync-*.log" -mmin -30 2>/dev/null)
    for log_file in $active_logs; do
        monitor_rsync_process "$log_file"
    done

    # Generate report
    generate_report
}

# Run checks if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    case "${1:-}" in
        --report)
            generate_report
            ;;
        --check-failed)
            check_failed_syncs
            ;;
        *)
            run_monitoring_checks
            ;;
    esac
fi