#!/usr/bin/env bash
# 드래프트 배포 + restore 승격 (Netlify 무료 크레딧 403 우회)
#   tools/deploy_draft.sh [--promote]
set -euo pipefail
TOKEN="$(cat /workspace/work/starfitpick-site/netlify-token)"
SITE_ID="1999c7f0-f1a3-4eab-9d81-b1c0dcf04f15"
cd "$(dirname "$0")/.."
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
python3 - "$TMP/site.zip" <<'PY'
import os, sys, zipfile
with zipfile.ZipFile(sys.argv[1], 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in ('.git','.github','__pycache__')]
        for f in files:
            p = os.path.join(root, f)
            z.write(p, os.path.relpath(p, '.'))
PY
DEPLOY_JSON="$(curl -sS -X POST "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys?draft=true" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/zip" --data-binary @"$TMP/site.zip")"
DID="$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); print(d['id']); print(d.get('state'), d.get('error_message') or '', file=sys.stderr)" "$DEPLOY_JSON")"
echo "draft deploy: $DID"
for i in $(seq 1 40); do
  ST="$(curl -sS -H "Authorization: Bearer $TOKEN" "https://api.netlify.com/api/v1/deploys/$DID" | python3 -c "import json,sys; print(json.load(sys.stdin).get('state'))")"
  echo "state: $ST"
  [ "$ST" = "ready" ] || [ "$ST" = "error" ] && break
  sleep 4
done
[ "$ST" = "ready" ] || { echo "deploy failed"; exit 1; }
if [ "${1:-}" = "--promote" ]; then
  curl -sS -X POST -H "Authorization: Bearer $TOKEN" "https://api.netlify.com/api/v1/deploys/$DID/restore" | python3 -c "import json,sys; d=json.load(sys.stdin); print('restore:', d.get('id'), d.get('state'))"
fi
echo "draft url: https://$DID--starfitpick.netlify.app/"
