#!/data/data/com.termux/files/usr/bin/bash
set -e
BASE="$(cd "$(dirname "$0")" && pwd)"
exec "$BASE/scripts/install.sh" "$@"
