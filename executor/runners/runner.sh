#!/bin/sh

# This is a generic runner wrapper that could be used inside the container
# Currently, our worker spawns the language binaries directly,
# but this script can be used to set ulimits internal to the container 
# before executing the actual code as a defense-in-depth measure.

# Set max file size to 1MB to prevent disk exhaustion (if ever mounted writable)
ulimit -f 1024

# Set max processes (already handled by docker --pids-limit)
ulimit -u 64

# Execute the command passed to this script
exec "$@"
