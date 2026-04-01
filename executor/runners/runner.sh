#!/bin/sh

# This is a generic runner wrapper that could be used inside the container
# Currently, our worker spawns the language binaries directly,
# but this script can be used to set ulimits internal to the container 
# before executing the actual code as a defense-in-depth measure.

# Try to set ulimits, but don't fail if unsupported (Alpine sh/busybox)
# Alpine Linux may not support all ulimit options
ulimit -f 1024 2>/dev/null || true
ulimit -u 64 2>/dev/null || true

# Execute the command passed to this script
exec "$@"
