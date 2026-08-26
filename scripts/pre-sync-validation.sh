#!/bin/bash
# pre-sync-validation.sh - Pre-deployment validation script

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SOURCE_DIR="/Users/devajmody/Repos/piermind/sikka"
REQUIRED_FILES=(
    "backend/package.json"
    "backend/server.js"
    "docker-compose.yml"
    "backend/Dockerfile"
)

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

# Check if source directory exists
check_source_directory() {
    log "Checking source directory..."
    if [ ! -d "$SOURCE_DIR" ]; then
        error "Source directory does not exist: $SOURCE_DIR"
        exit 1
    fi
    log "✅ Source directory exists"
}

# Validate required files exist
check_required_files() {
    log "Checking required files..."
    local missing_files=()

    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -f "$SOURCE_DIR/$file" ]; then
            missing_files+=("$file")
        fi
    done

    if [ ${#missing_files[@]} -ne 0 ]; then
        error "Missing required files:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        exit 1
    fi

    log "✅ All required files present"
}

# Validate JavaScript syntax
check_javascript_syntax() {
    log "Checking JavaScript syntax..."

    # Find all .js files in backend/src (exclude node_modules and examples)
    local js_files=$(find "$SOURCE_DIR/backend/src" -name "*.js" -type f)
    local syntax_errors=0

    for file in $js_files; do
        if ! node -c "$file" >/dev/null 2>&1; then
            error "Syntax error in: $file"
            syntax_errors=$((syntax_errors + 1))
        fi
    done

    if [ $syntax_errors -gt 0 ]; then
        error "Found $syntax_errors JavaScript syntax errors"
        exit 1
    fi

    log "✅ JavaScript syntax validation passed"
}

# Validate Docker Compose configuration
check_docker_compose() {
    log "Validating Docker Compose configuration..."

    if ! command -v docker-compose >/dev/null 2>&1; then
        warning "docker-compose not found, skipping validation"
        return 0
    fi

    if ! docker-compose -f "$SOURCE_DIR/docker-compose.yml" config >/dev/null 2>&1; then
        error "Docker Compose configuration is invalid"
        exit 1
    fi

    log "✅ Docker Compose validation passed"
}

# Check for large files that might cause sync issues
check_large_files() {
    log "Checking for large files..."

    # Find files larger than 100MB
    local large_files=$(find "$SOURCE_DIR" -type f -size +100M -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null)

    if [ -n "$large_files" ]; then
        warning "Found large files that may slow down sync:"
        echo "$large_files" | while read -r file; do
            local size=$(du -h "$file" | cut -f1)
            echo "  - $file ($size)"
        done
    fi

    log "✅ Large file check completed"
}

# Check Git status
check_git_status() {
    log "Checking Git status..."

    if [ ! -d "$SOURCE_DIR/.git" ]; then
        warning "Not a Git repository"
        return 0
    fi

    cd "$SOURCE_DIR"

    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        warning "Uncommitted changes detected:"
        git status --short
    fi

    # Check if we're on a branch
    local current_branch=$(git branch --show-current)
    if [ -n "$current_branch" ]; then
        log "Current branch: $current_branch"
    else
        warning "Not on a branch (detached HEAD)"
    fi

    log "✅ Git status check completed"
}

# Check disk space
check_disk_space() {
    log "Checking available disk space..."

    # Check local disk space (macOS compatible)
    local available_gb=$(df -g / | tail -1 | awk '{print $4}')

    if [ "$available_gb" -lt 5 ]; then
        warning "Low disk space locally: ${available_gb}GB available"
    fi

    log "✅ Disk space check completed"
}

# Main validation function
main() {
    log "=== Pre-Sync Validation Started ==="

    check_source_directory
    check_required_files
    check_javascript_syntax
    check_docker_compose
    check_large_files
    check_git_status
    check_disk_space

    log "=== Pre-Sync Validation Completed Successfully ==="
}

# Run main function
main "$@"