#!/usr/bin/env bash
# One-shot upload of a single large file to the Descript V50 REST API,
# using curl -T for streaming PUT (avoids node fetch's in-memory buffering).
#
# Usage:
#   bash scripts/descript-upload-big-file.sh [filename]
# Default filename: beat4-full-split-tinted.mp4
#
# Loads DESCRIPT_API_TOKEN from .env.local. Targets the
# "Made with Opus 4.7 hackathon" project (id e6f79efe-...).
# If the same media name already exists in the project (orphan from a prior
# failed run), DELETE it first via DELETE /v1/projects/.../media/<name>
# (or rename the file locally before re-running).

set -euo pipefail

NAME="${1:-beat4-full-split-tinted.mp4}"
SRC="transcripts/captures/_descript/$NAME"
PROJECT_ID="e6f79efe-e138-4bb0-a620-07066838bc49"
BASE="https://descriptapi.com/v1"

# Load token
set -a
. ./.env.local
set +a

if [[ ! -f "$SRC" ]]; then
  echo "missing: $SRC" >&2
  exit 1
fi

SIZE=$(stat -c %s "$SRC")
echo "file: $SRC ($SIZE bytes)"

# 1) Request import job + presigned upload URL
RESP=$(curl -sS -X POST \
  -H "Authorization: Bearer $DESCRIPT_API_TOKEN" \
  -H "Content-Type: application/json" \
  "$BASE/jobs/import/project_media" \
  -d "{\"project_id\":\"$PROJECT_ID\",\"add_media\":{\"$NAME\":{\"content_type\":\"video/mp4\",\"file_size\":$SIZE}}}")

echo "import-job response (truncated):"
echo "$RESP" | head -c 400
echo

JOB_ID=$(echo "$RESP" | python -c "import json,sys;print(json.load(sys.stdin)['job_id'])")
UPLOAD_URL=$(echo "$RESP" | python -c "import json,sys,os;d=json.load(sys.stdin);print(d['upload_urls'][os.environ['NAME']]['upload_url'])" NAME="$NAME")

echo "job: $JOB_ID"
echo

# 2) Streaming PUT to GCS via curl -T (no in-memory buffering)
echo "PUT (streaming)..."
curl -sS --fail -T "$SRC" \
  -H "Content-Type: application/octet-stream" \
  -X PUT \
  --max-time 1800 \
  -w "PUT done: HTTP %{http_code} in %{time_total}s\n" \
  "$UPLOAD_URL"

echo

# 3) Poll job until terminal
echo "polling job..."
for i in $(seq 1 90); do
  J=$(curl -sS -H "Authorization: Bearer $DESCRIPT_API_TOKEN" "$BASE/jobs/$JOB_ID")
  STATE=$(echo "$J" | python -c "import json,sys;print(json.load(sys.stdin)['job_state'])")
  echo "  [$i] $STATE"
  if [[ "$STATE" != "running" && "$STATE" != "queued" && "$STATE" != "pending" ]]; then
    echo "$J" | python -m json.tool || echo "$J"
    break
  fi
  sleep 5
done
