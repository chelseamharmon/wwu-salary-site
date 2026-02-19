#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: scripts/download_wa_salary.sh <DOWNLOAD_URL>"
  exit 1
fi

URL="$1"

mkdir -p data/raw

OUT="data/raw/wa_salary_download"
echo "Downloading to: ${OUT}"
curl -L "$URL" -o "${OUT}"

echo
echo "Downloaded bytes:"
wc -c "${OUT}"

echo
echo "File type:"
file "${OUT}"

echo
echo "Done."
