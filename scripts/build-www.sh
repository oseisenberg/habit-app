#!/usr/bin/env bash
# Assemble the static web assets into www/ for Capacitor.
# Keeps the no-build setup: just copies the files Capacitor ships
# into the iOS app bundle (no node_modules / ios / .git).
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf www
mkdir -p www
cp index.html app-core.js app-logic.js app-render.js app-bootstrap.js platform.js default-habits.js styles.css sw.js manifest.json www/
cp -R icons www/icons
echo "www/ assembled:"
ls -1 www
