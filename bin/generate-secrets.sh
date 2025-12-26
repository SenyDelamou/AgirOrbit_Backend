#!/usr/bin/env bash
# Generates strong secrets for JWT_ACCESS_SECRET and OTP_SECRET.
#
# Usage:
#   ./generate-secrets.sh            # prints secrets
#   ./generate-secrets.sh --write    # appends secrets to .env in current folder
#   ./generate-secrets.sh --write --file /path/to/.env

set -euo pipefail

WRITE=false
FILE=".env"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --write) WRITE=true; shift ;;
    --file) FILE="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if command -v openssl >/dev/null 2>&1; then
  JWT=$(openssl rand -base64 48)
  OTP=$(openssl rand -base64 32)
else
  # fallback using /dev/urandom
  JWT=$(head -c 48 /dev/urandom | base64)
  OTP=$(head -c 32 /dev/urandom | base64)
fi

echo "JWT_ACCESS_SECRET=\"$JWT\""
echo "OTP_SECRET=\"$OTP\""

if [ "$WRITE" = true ]; then
  printf '%s
' "JWT_ACCESS_SECRET=\"$JWT\"" "OTP_SECRET=\"$OTP\"" >> "$FILE"
  echo "Wrote secrets to $FILE"
fi
