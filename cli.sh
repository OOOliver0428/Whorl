#!/bin/sh
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/node_modules/.bin/tsx" "$DIR/cli/cli.ts" "$@"
